import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, getStoredItem, AUTH_STORAGE_KEYS, type ClassRow, type AssignmentRow } from '@/lib/api'
import { BookOpen, Loader2, Users, Bell, CheckCircle2, BarChart2, TrendingUp } from 'lucide-react'
import { APIError } from '@/components/common/ErrorState'
import { BarChart, DonutChart } from '@/components/ui/Charts'

export function LecturerOverview() {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [classes, setClasses] = useState<ClassRow[]>([])
    const [assignments, setAssignments] = useState<AssignmentRow[]>([])
    const [stats, setStats] = useState<any>(null)
    const [submissions, setSubmissions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const userStr = getStoredItem(AUTH_STORAGE_KEYS.user)
    const user = userStr ? JSON.parse(userStr) : null
    const userName = user?.fullName || user?.email || t('lc.role_fallback')
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(-2).toUpperCase()

    const loadData = useCallback(() => {
        let alive = true
        setLoading(true)
        setError(null)
        Promise.all([
            api.getClasses(1, 1000),
            api.getAssignments({ limit: '10' }),
            api.getStatsOverview(),
            api.getSubmissions().catch(() => []) // Fallback in case of error
        ])
            .then(([classesData, assignmentsData, statsData, submissionsData]) => {
                if (alive) {
                    setClasses(classesData || [])
                    setAssignments(assignmentsData || [])
                    setStats(statsData || null)
                    setSubmissions(submissionsData || [])
                }
            })
            .catch(err => { if (alive) setError(err) })
            .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
    }, [])

    useEffect(() => {
        const cleanup = loadData()
        return cleanup
    }, [loadData])

    if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>
    if (error) return <APIError error={error} onRetry={loadData} />

    // Group all classes by semester
    const groupedClasses: Record<string, { semesterName: string, classes: ClassRow[] }> = {}
    classes.forEach(cls => {
        const semId = (cls.semester as any)?.id || 'unknown'
        const semCode = (cls.semester as any)?.code || t('lc.ov.other_semester')

        if (!groupedClasses[semId]) {
            groupedClasses[semId] = { semesterName: semCode, classes: [] }
        }
        groupedClasses[semId].classes.push(cls)
    })

    const groupedClassesArray = Object.values(groupedClasses).sort((a, b) => a.semesterName.localeCompare(b.semesterName))

    // Top 3 classes for the quick view is no longer used, we show grouped list

    // Group submissions by assignment for real "Needs Grading" counts
    const pendingByAssignment: Record<string, number> = {}
    submissions.forEach(sub => {
        if (sub.status === 'Pending' || sub.gradingStatus === 'Pending') {
            const examId = sub.exam?.id || sub.ExamId || sub.examId
            if (examId) {
                pendingByAssignment[examId] = (pendingByAssignment[examId] || 0) + 1
            }
        }
    })

    // Real 'To-Do' list based on assignments (Needs grading)
    const todoItems = assignments
        .map(a => ({
            id: a.id,
            title: a.title,
            classCode: 'N/A',
            dueDate: a.due,
            needsGrading: pendingByAssignment[a.id] || 0,
        }))
        .filter(a => a.needsGrading > 0)
        .sort((a, b) => b.needsGrading - a.needsGrading)
        .slice(0, 4)

    // Calculate overall graded percentage
    const totalSubmissions = submissions.length
    const gradedSubmissions = submissions.filter(s => s.status === 'Graded' || s.gradingStatus === 'Graded').length


    // 1. Calculate class performance statistics
    const classStats = groupedClassesArray.flatMap(g => g.classes).map(c => {
        const classSubmissions = submissions.filter(s => s.ClassId === c.id || s.classId === c.id || s.Class?.Id === c.id || s.class?.id === c.id);
        const submittedCount = classSubmissions.length;
        const studentCount = c.studentCount || 0;
        const submitPercent = studentCount > 0 ? Math.round((submittedCount / studentCount) * 100) : 0;

        const gradedSubs = classSubmissions.filter(s => (s.status === 'Graded' || s.gradingStatus === 'Graded' || s.GradingStatus === 'Graded') && (s.totalScore !== undefined || s.finalScore !== undefined || s.TotalScore !== undefined || s.FinalScore !== undefined));
        const scores = gradedSubs.map(s => Number(s.totalScore ?? s.TotalScore ?? s.finalScore ?? s.FinalScore ?? 0));
        const gpa = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
        const numericGpa = parseFloat(gpa as string) || 0;
        // Stable key, not a display string, so the badge styling below keeps working in any language.
        const status = gpa === '—' ? 'none' : (numericGpa >= 8.0 ? 'excellent' : (numericGpa >= 7.0 ? 'good' : 'support'));
        const needsHelpCount = gpa === '—' ? 0 : scores.filter(s => s < 5).length;

        return {
            id: c.id,
            name: c.code,
            studentCount,
            submitPercent,
            gpa,
            status,
            needsHelpCount,
            numericGpa
        };
    }).slice(0, 4);

    // Real submission volume for the last 6 weeks, oldest bucket first.
    const weeklySubmissionData = (() => {
        const WEEKS = 6
        const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000
        const now = Date.now()
        return Array.from({ length: WEEKS }, (_, i) => {
            const weeksAgo = WEEKS - 1 - i
            const end = now - weeksAgo * MS_PER_WEEK
            const start = end - MS_PER_WEEK
            const count = submissions.filter((s: any) => {
                const raw = s?.submittedAt
                if (!raw) return false
                const t = new Date(raw).getTime()
                return !Number.isNaN(t) && t > start && t <= end
            }).length
            return {
                label: weeksAgo === 0 ? t('lc.ov.this_week') : `-${weeksAgo}w`,
                value: count,
                color: '#3b82f6',
            }
        })
    })()

    // 2. Prepare bar chart data for GPA
    const gpaChartData = classStats.slice(0, 3).map((c, i) => {
        const colors = ['#3b82f6', '#ef4444', '#10b981'];
        return {
            label: c.name,
            value: parseFloat(c.gpa),
            color: colors[i % colors.length]
        }
    });

    return (
        <div className="space-y-8 animate-fade-in-up pb-10 font-sans max-w-7xl mx-auto">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                <div>
                    <h1 className="text-[28px] md:text-[32px] font-black text-slate-900 dark:text-white tracking-tight">
                        {t('lc.ov.greeting', { name: userName })}
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">{t('lc.ov.subtitle')}</p>
                </div>
            </div>

            {/* Top 4 KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen size={64} className="text-brand-600" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">{t('lc.ov.kpi.classes')}</h3>
                    <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.classes || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} className="text-emerald-600" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">{t('lc.ov.kpi.students')}</h3>
                    <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.students || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Bell size={64} className="text-amber-500" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">{t('lc.ov.kpi.to_grade')}</h3>
                    <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{stats?.pending || 0}</p>
                </div>
                <div className="bg-white dark:bg-[#151821] p-6 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 dark:border-slate-800 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={64} className="text-blue-600" />
                    </div>
                    <h3 className="text-[15px] font-bold text-slate-500 dark:text-slate-400 mb-2 relative z-10">{t('lc.ov.kpi.graded')}</h3>
                    <p className="text-4xl font-black text-slate-900 dark:text-white relative z-10">{gradedSubmissions}</p>
                </div>
            </div>

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column (grading progress & shortcuts) */}
                <div className="lg:col-span-3 flex flex-col gap-8">
                    <div className="bg-white dark:bg-[#151821] p-6 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden h-full">
                        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white w-full text-center mb-6 z-10 tracking-tight">{t('lc.ov.grading_progress')}</h2>
                        <div className="z-10 bg-white/50 dark:bg-transparent rounded-full p-4 backdrop-blur-sm flex-1 flex items-center justify-center">
                            {totalSubmissions > 0 ? (
                                <DonutChart
                                    value={gradedSubmissions}
                                    max={totalSubmissions}
                                    label=""
                                    color="#4f46e5"
                                    size={180}
                                />
                            ) : (
                                <div className="flex h-[180px] items-center justify-center text-slate-400 text-sm font-medium">{t('lc.ov.no_data_yet')}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Columns */}
                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Student and class performance statistics */}
                    <div className="bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                            <TrendingUp size={18} className="text-emerald-500" /> {t('lc.ov.perf_stats')}
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">{t('lc.ov.col.class')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.students')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.submitted')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">{t('lc.ov.col.gpa')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStats.map((cls) => (
                                        <tr key={cls.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{cls.name}</td>
                                            <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.studentCount}</td>
                                            <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.submitPercent}%</td>
                                            <td className="py-4 text-right font-bold text-brand-600 dark:text-brand-400">{cls.gpa}</td>
                                        </tr>
                                    ))}
                                    {classStats.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-8 text-slate-400 font-medium">{t('lc.ov.no_class_data')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detailed statistics - GPA bar chart */}
                    <div className="bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col">
                        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-2">
                            <BarChart2 size={18} className="text-brand-500" /> {t('lc.ov.detail_stats')}
                        </h2>
                        <p className="text-[13px] text-slate-500 mb-8 font-semibold">{t('lc.ov.avg_class_gpa')}</p>
                        <div className="flex-1 min-h-[220px] flex items-end">
                            {gpaChartData.length > 0 ? (
                                <div className="w-full pb-4">
                                    <BarChart data={gpaChartData} height={200} />
                                </div>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm font-medium">{t('lc.ov.not_enough_chart')}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Advanced table: student performance */}
                    <div className="lg:col-span-7 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800">
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">{t('lc.ov.col.class')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.students')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.submitted')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.gpa')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.category')}</th>
                                        <th className="pb-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right">{t('lc.ov.col.needs_support')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStats.map((cls) => (
                                        <tr key={cls.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{cls.name}</td>
                                            <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.studentCount}</td>
                                            <td className="py-4 text-center font-semibold text-slate-600 dark:text-slate-400">{cls.submitPercent}%</td>
                                            <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">{cls.gpa}</td>
                                            <td className="py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls.status === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                                                    cls.status === 'good' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                    {t(`lc.ov.status.${cls.status}`)}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right font-bold text-rose-600">{cls.needsHelpCount}</td>
                                        </tr>
                                    ))}
                                    {classStats.length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-8 text-slate-400 font-medium">{t('lc.ov.no_class_data')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Was three hard-coded SVG paths with fixed Week 1/2/3 labels; it
                        read no data at all. Now counts real submissions per week. */}
                    <div className="lg:col-span-5 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800 flex flex-col">
                        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight flex items-center gap-2">
                            <TrendingUp size={18} className="text-blue-500" /> {t('lc.ov.weekly_subs')}
                        </h2>
                        <p className="text-[13px] text-slate-500 mb-6 font-semibold">{t('lc.ov.last_6_weeks')}</p>
                        <div className="flex-1 min-h-[200px] flex items-end">
                            {weeklySubmissionData.some(d => d.value > 0) ? (
                                <div className="w-full pb-4">
                                    <BarChart data={weeklySubmissionData} height={200} />
                                </div>
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm font-medium">
                                    {t('lc.ov.no_subs_6w')}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* To-Do List */}
                <div className="lg:col-span-12 bg-white dark:bg-[#151821] p-7 rounded-3xl shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border border-slate-100/50 dark:border-slate-800">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-brand-500" /> {t('lc.ov.action_list')}
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[14px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] rounded-tl-lg">{t('lc.ov.col.lecturer')}</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-center">{t('lc.ov.col.action')}</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">{t('lc.ov.col.task')}</th>
                                    <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] text-right rounded-tr-lg">{t('lc.ov.col.kpi')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todoItems.length > 0 ? todoItems.map(item => (
                                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors" onClick={() => navigate(`/lecturer/assignments/${item.id}/submissions`)}>
                                        <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">{userInitials}</div>
                                            {userName}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="bg-rose-100 text-rose-600 border border-rose-200 text-xs px-3 py-1 rounded-full font-bold shadow-sm">{t('lc.ov.items', { n: item.needsGrading })}</span>
                                        </td>
                                        <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('lc.ov.grading_label')} <span className="text-brand-600 dark:text-brand-400 hover:underline">{item.title}</span></td>
                                        <td className="py-4 px-4 text-right font-medium text-slate-500 dark:text-slate-400">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : t('lc.ov.no_deadline')}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <CheckCircle2 size={40} className="text-emerald-200 mb-3" />
                                                <p className="font-bold text-slate-600">{t('lc.ov.all_done')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
