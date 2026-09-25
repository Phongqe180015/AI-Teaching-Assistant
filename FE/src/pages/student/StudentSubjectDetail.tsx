import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, type SubjectRow } from '@/lib/api'

import { 
  ArrowLeft, Loader2, ChevronRight, AlertCircle,
  Search, Download
} from 'lucide-react'

import { getCleanSubjectDescription } from '@/utils/subjectHelper'

type TabType = 'syllabus' | 'clos' | 'sessions' | 'assessment'

export function StudentSubjectDetail() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  
  const [subject, setSubject] = useState<SubjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('syllabus')
  const [sessionSearch, setSessionSearch] = useState('')
  const [downloadingSession, setDownloadingSession] = useState<number | null>(null)

  // Initial load — fetches latest data on every page load/refresh
  useEffect(() => {
    if (!code) return
    setLoading(true)
    api.getSubjects(1, 1000)
      .then(res => {
        const found = res.find((s: SubjectRow) => s.code.toLowerCase() === code.toLowerCase())
        if (found) {
          setSubject(found)
        } else {
          setSubject({ id: code, code: code.toUpperCase(), name: 'Course Subject', description: '' })
        }
      })
      .catch(() => {
        setSubject({ id: code, code: code.toUpperCase(), name: 'Course Subject', description: '' })
      })
      .finally(() => setLoading(false))
  }, [code])

  // Handles download for both Cloudinary (fl_attachment) and Google Drive URLs.
  const handleDownload = useCallback(async (url: string, filename: string, sessionNo: number) => {
    const isGoogleDrive = url.includes('drive.google.com')
    if (!isGoogleDrive) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      setDownloadingSession(sessionNo)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloadingSession(null)
    }
  }, [])

  const hasSyllabusData = useMemo(() => {
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0 && (parsed.clos?.length > 0 || parsed.sessions?.length > 0 || parsed.description)) return true
      } catch (e) {
        // ignore
      }
    }
    return false
  }, [subject])

  const rawSyllabus = useMemo(() => {
    if (subject?.syllabusData) {
      try {
        const parsed = typeof subject.syllabusData === 'string' ? JSON.parse(subject.syllabusData) : subject.syllabusData
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed
      } catch (e) {
        // ignore
      }
    }
    return null
  }, [subject])

  const syllabus = useMemo(() => {
    if (!rawSyllabus) return null
    const s = rawSyllabus as any
    const credits = s.credits ?? s.noCredit ?? 3
    const degreeLevel = s.degreeLevel || 'Bachelor'
    const timeAllocation = s.timeAllocation || 'Study hour (150h) = 45h contact hours + 1h final exam + 104h self-study'
    const prerequisites = s.prerequisites || s.preRequisite || 'None'
    const description = getCleanSubjectDescription(subject?.code, s.description || subject?.description)

    const studentTasksList: string[] = Array.isArray(s.studentTasks)
      ? s.studentTasks
      : s.studentTasks ? [s.studentTasks] : [
          'Students must attend at least 80% of contact sessions in order to be accepted to the final examination.',
          'Student is responsible to do all assigned exercises given by instructor in class or at home and submit on time.',
          'Use laptop in class only for learning purpose.',
          'Promptly access to the https://flm.fpt.edu.vn/ for up-to-date course information.'
        ]

    const tools: string[] = s.tools || ['Internet', 'C language utility (ex.DevC++ 6.3)']

    const defaultLearningOutcomes = [
      {
        category: '1. Knowledge',
        code: '(ABET e)',
        items: [
          'Explain the way to solve a real problem using computer.',
          'Understand the basic concepts computer system, and software development.',
          'Understand the basic concepts of programming, focus on procedure programming, testing and debugging, unit testing.'
        ]
      },
      {
        category: '2. Skills in programming',
        code: '(ABET k)',
        items: [
          'Read and understand the simple C programs;',
          'Solve real problems using C.'
        ]
      },
      {
        category: '3. Apply learning methods effectively',
        code: '(ABET i)',
        items: [
          'Academic reading.',
          'Individual and team work behaviors.'
        ]
      }
    ]

    const learningOutcomes = s.learningOutcomes || defaultLearningOutcomes

    const clos = (s.clos || []).map((c: any) => ({
      code: c.code || c.cloName || 'CLO',
      details: c.details || c.cloDetails || '',
      loDetails: c.loDetails || ''
    }))

    const abetBreakdown = learningOutcomes.map((item: any) => ({
      domain: `${item.category} ${item.code || ''}`.trim(),
      clos: item.items || []
    }))

    const assessments = (s.assessments || s.assessmentScheme || []).map((a: any) => ({
      category: a.category || a.name || 'Assessment',
      weightPercent: (a.weightPercent ?? parseFloat(String(a.weight || '0').replace('%', ''))) || 0
    }))

    const sessions = (s.sessions || []).map((ses: any, index: number) => ({
      sessionNo: ses.sessionNo ?? ses.session ?? (index + 1),
      topic: ses.topic || '',
      type: ses.type || 'Offline',
      clo: ses.clo || 'CLO1',
      itu: ses.itu || 'I',
      studentTasks: Array.isArray(ses.studentTasks) ? ses.studentTasks.join(', ') : (ses.studentTasks || ''),
      materialsDownloadUrl: ses.materialsDownloadUrl || ses.cloudinaryUrl || (ses.sDownload ? '#' : undefined),
      sDownload: ses.sDownload || 'Slide PDF'
    }))

    const totalAssessmentWeight = assessments.reduce((acc: number, item: any) => acc + (item.weightPercent || 0), 0)

    return {
      code: s.code || subject?.code || 'PRF192',
      name: s.name || subject?.name || 'Programming Fundamentals',
      description,
      credits,
      degreeLevel,
      timeAllocation,
      prerequisites,
      studentTasksList,
      tools,
      learningOutcomes,
      clos,
      abetBreakdown,
      assessments,
      totalAssessmentWeight,
      sessions
    }
  }, [rawSyllabus, subject])

  const filteredSessions = useMemo(() => {
    if (!syllabus || !sessionSearch.trim()) return syllabus?.sessions || []
    const q = sessionSearch.toLowerCase()
    return syllabus.sessions.filter(
      (s: any) => s.topic.toLowerCase().includes(q) ||
           s.studentTasks.toLowerCase().includes(q) ||
           String(s.sessionNo).includes(q)
    )
  }, [syllabus, sessionSearch])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading course syllabus details...</p>
      </div>
    )
  }

  // Handle courses without syllabus data yet (Not provided yet)
  if (!hasSyllabusData || !syllabus) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/courses')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Courses
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/student" className="hover:underline">Student</Link>
            <ChevronRight size={12} />
            <Link to="/student/courses" className="hover:underline">Courses</Link>
            <ChevronRight size={12} />
            <span className="text-slate-700 dark:text-slate-200 font-bold">{subject?.code || code}</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-[#121629] text-white p-6 sm:p-8 shadow-xl border border-slate-800">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Subject Code: {subject?.code || code}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-white/10 text-slate-200 border border-white/15">
                Degree Level: Bachelor
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Semester: {subject?.semester ? `Semester ${subject.semester}` : 'Semester 1'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {subject?.name || 'Course Subject'}
            </h1>
          </div>
        </div>

        {/* Empty State Card in English */}
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-[#151821] border border-slate-200/80 dark:border-slate-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <AlertCircle size={32} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Syllabus Not Provided Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Detailed syllabus content for <strong className="text-slate-700 dark:text-slate-200 font-semibold">{subject?.code || code} - {subject?.name}</strong> has not been provided yet.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/student/courses')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <ArrowLeft size={14} /> Back to Courses Directory
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/courses')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Courses
        </button>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link to="/student" className="hover:underline">Student</Link>
          <ChevronRight size={12} />
          <Link to="/student/courses" className="hover:underline">Courses</Link>
          <ChevronRight size={12} />
          <span className="text-slate-700 dark:text-slate-200 font-bold">{syllabus.code}</span>
        </div>
      </div>

      {/* Hero Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 p-6 sm:p-8 border border-brand-100 dark:border-slate-700/60 shadow-sm">
        <div className="relative z-10 space-y-4">

          {/* Badges row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-500/20">
                {syllabus.code}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-200/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                {syllabus.degreeLevel}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Semester {subject?.semester || 1}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {syllabus.credits} Credits
              </span>
            </div>
          </div>

          {/* Subject name */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            {syllabus.name}
          </h1>

          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-2xl">
            Detailed course syllabus, Learning Outcomes (CLO/ABET), session schedule, and assessment scheme.
          </p>

          {/* Time & Prerequisites */}
          <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-brand-100 dark:border-slate-700/60">
            <span>Time: <strong className="text-slate-700 dark:text-slate-200">{syllabus.timeAllocation}</strong></span>
            <span>Prerequisites: <strong className="text-slate-700 dark:text-slate-200">{syllabus.prerequisites}</strong></span>
            <span className="text-slate-400 dark:text-slate-500">
              Sessions: <strong className="text-slate-600 dark:text-slate-300">{syllabus.sessions.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/50 w-fit">
        {[
          { key: 'syllabus' as TabType, label: 'Syllabus Overview' },
          { key: 'clos' as TabType, label: `CLO List (${syllabus.clos.length})` },
          { key: 'sessions' as TabType, label: `Sessions (${syllabus.sessions.length})` },
          { key: 'assessment' as TabType, label: `Assessment (${syllabus.assessments.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Course Description</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                {syllabus.description}
              </p>
            </div>

            {/* ABET Course Learning Outcomes Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Course Learning Outcomes (ABET)</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400">Upon completing the course</span>
                </div>
              </div>

              <div className="space-y-6">
                {syllabus.learningOutcomes.map((section: any, idx: number) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {section.category}
                      </h4>
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded">
                        {section.code}
                      </span>
                    </div>

                    <ul className="space-y-2 pl-1">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Tasks Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Student Tasks</h3>
              </div>
              <div className="space-y-2">
                {syllabus.studentTasksList.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <span className="text-xs font-mono font-bold text-slate-400 shrink-0 mt-0.5">{idx + 1}.</span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {task}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (1/3 width) */}
          <div className="space-y-6">
            {/* Tools Card */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Tools & Software</h3>
              </div>
              <div className="flex flex-col gap-2">
                {syllabus.tools.map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700/50">
                    <span className="text-xs font-mono text-slate-400 shrink-0">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assessment Summary Box */}
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base">Assessment Weight</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('assessment')} className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">
                    View Details
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                {syllabus.assessments.map((a: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{a.category}</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded-lg">
                      {a.weightPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLOS */}
      {activeTab === 'clos' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                CLO List
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950 px-3 py-1 rounded-full">
                  Total: {syllabus.clos.length} CLOs
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                  <tr>
                    <th className="p-3 w-24 text-center font-semibold">Code</th>
                    <th className="p-3 w-28 font-semibold">LO Mapping</th>
                    <th className="p-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-600 dark:text-slate-300">
                  {syllabus.clos.map((clo: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-center font-semibold text-brand-600 dark:text-brand-400 font-mono text-xs">
                        {clo.code}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">
                        {clo.loDetails || clo.code.replace('CLO', 'LO')}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-200 leading-relaxed">
                        {clo.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 60 SESSIONS SCHEDULE */}
      {activeTab === 'sessions' && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/50">
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Session Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Lecture topics, delivery types, and student tasks.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search session, topic..."
                  value={sessionSearch}
                  onChange={e => setSessionSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/50">
                <tr>
                  <th className="p-3 w-16 text-center font-semibold">No.</th>
                  <th className="p-3 font-semibold">Topic</th>
                  <th className="p-3 w-20 text-center font-semibold">Type</th>
                  <th className="p-3 w-20 text-center font-semibold">CLO</th>
                  <th className="p-3 w-14 text-center font-semibold">ITU</th>
                  <th className="p-3 font-semibold">Student Tasks</th>
                  <th className="p-3 w-32 text-center font-semibold">Materials</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-slate-600 dark:text-slate-300">
                {filteredSessions.map((session: any, idx: number) => (
                  <tr key={`session-${session.sessionNo}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 text-center font-extrabold text-brand-600 dark:text-brand-400 bg-slate-50/50 dark:bg-slate-900/20">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {session.topic}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        session.type === 'Online' 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : session.type === 'Offline'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}>
                        {session.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {session.clo}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                      {session.itu}
                    </td>
                    <td className="p-3 leading-relaxed">
                      {session.studentTasks || 'N/A'}
                    </td>
                    <td className="p-3 text-center">
                      {session.materialsDownloadUrl ? (
                        <button
                          onClick={() => handleDownload(
                            session.materialsDownloadUrl!,
                            session.sDownload || 'download',
                            session.sessionNo
                          )}
                          disabled={downloadingSession === session.sessionNo}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 hover:bg-brand-100 font-bold transition-all text-xs disabled:opacity-60 disabled:cursor-wait"
                        >
                          {downloadingSession === session.sessionNo
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />
                          }
                          {session.sDownload || 'Slide PDF'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Textbook</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ASSESSMENT SCHEME */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Assessment Scheme & Weight Distribution
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                  Total: {syllabus.totalAssessmentWeight.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Individual Progress Bars */}
            <div className="space-y-5">
              {syllabus.assessments.map((a: any, idx: number) => {
                const colors = [
                  { bg: 'bg-brand-500', text: 'text-brand-600 dark:text-brand-400' },
                  { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                  { bg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
                  { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
                  { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                ]
                const color = colors[idx % colors.length]

                return (
                  <div key={idx} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-sm gap-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{a.category}</span>
                      <span className={`font-extrabold text-sm ${color.text}`}>{a.weightPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color.bg} transition-all duration-300 rounded-full`}
                        style={{ width: `${Math.min(100, Math.max(0, a.weightPercent))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dynamic Cumulative Total Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-sm font-extrabold text-slate-800 dark:text-slate-100">
                <span>Total Assessment Weight</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-base">
                  {syllabus.totalAssessmentWeight.toFixed(1)}%
                </span>
              </div>
              <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                {syllabus.assessments.map((a: any, idx: number) => {
                  const colors = ['bg-brand-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500']
                  return (
                    <div
                      key={idx}
                      className={`h-full ${colors[idx % colors.length]}`}
                      style={{ width: `${Math.min(100, Math.max(0, a.weightPercent))}%` }}
                      title={`${a.category}: ${a.weightPercent}%`}
                    />
                  )
                })}
              </div>

              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                Achieved {syllabus.totalAssessmentWeight.toFixed(1)}% total assessment weight according to curriculum standard.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
