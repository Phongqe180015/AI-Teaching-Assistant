import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ClassRow, type SemesterRow, type SubjectRow } from '@/lib/api'
import { formatSemesterCode } from '@/utils/semester'
import { getSeasonTheme } from '@/utils/seasonThemeHelper'
import {
  Loader2, Search, Filter,
  Calendar, ChevronDown, ChevronUp, Book, Code, Users
} from 'lucide-react'

import { SemesterSelector } from '@/components/ui/SemesterSelector'

/**
 * Sentinel for classes whose semester is missing. It is a grouping key and a sort
 * marker, not display text, so it stays language-independent and is translated
 * only where it is rendered.
 */
const OTHER_SEASON = 'Other semesters'

export function LecturerClasses() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Expanded state
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({})
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({})
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({}) // For showing classes

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clsData, semData, subData] = await Promise.all([
        api.getClasses(1, 1000),
        api.getSemesters(),
        api.getSubjects(1, 1000)
      ])
      setClasses(clsData || [])
      setSemesters(semData || [])
      setSubjects(subData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Grouping Logic
  type SubjectGroup = { subjectId: string; subjectCode: string; subjectName: string; classes: ClassRow[]; avgStudents: number }
  type SemesterGroup = { semesterId: string; semesterCode: string; startDate?: string; endDate?: string; isActive: boolean; subjects: Record<string, SubjectGroup> }
  type SeasonGroup = { seasonName: string; isActive: boolean; semesters: Record<string, SemesterGroup> }

  const groupedData: Record<string, SeasonGroup> = {};

  const filteredClasses = classes.filter(c => {
    if (selectedSemester) {
      const semId = (c.semester as any)?.id;
      const semRecord = semesters.find(s => s.id === semId);
      const seasonStr = (semRecord?.season || (c.semester as any)?.season || '').toUpperCase().replace(/\s+/g, '');
      const codeStr = (semRecord?.code || (c.semester as any)?.code || '').toUpperCase().replace(/\s+/g, '');
      if (seasonStr !== selectedSemester && codeStr !== selectedSemester && semId !== selectedSemester) {
        return false;
      }
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.subject as any)?.code?.toLowerCase().includes(q)
    }
    return true
  })

  filteredClasses.forEach(cls => {
    const semId = (cls.semester as any)?.id || 'unknown';
    const semesterRecord = semesters.find(s => s.id === semId);

    const seasonName = semesterRecord?.season || (cls.semester as any)?.season || OTHER_SEASON;
    const semesterCode = semesterRecord?.code || (cls.semester as any)?.code || t('lc.cls.other_semester');

    const subId = (cls.subject as any)?.id || 'unknown';
    const subjectRecord = subjects.find(s => s.id === subId);
    const subjectCode = subjectRecord?.code || (cls.subject as any)?.code || t('lc.cls.other_subject');
    const subjectName = subjectRecord?.name || (cls.subject as any)?.name || t('lc.cls.unnamed_subject');

    if (!groupedData[seasonName]) {
      groupedData[seasonName] = { seasonName, isActive: false, semesters: {} };
    }
    const seasonGroup = groupedData[seasonName];
    if (semesterRecord?.isActive) seasonGroup.isActive = true;

    if (!seasonGroup.semesters[semId]) {
      seasonGroup.semesters[semId] = {
        semesterId: semId,
        semesterCode,
        startDate: semesterRecord?.startDate,
        endDate: semesterRecord?.endDate,
        isActive: semesterRecord?.isActive || false,
        subjects: {}
      };
    }
    const semesterGroup = seasonGroup.semesters[semId];

    if (!semesterGroup.subjects[subId]) {
      semesterGroup.subjects[subId] = { subjectId: subId, subjectCode, subjectName, classes: [], avgStudents: 0 };
    }

    semesterGroup.subjects[subId].classes.push(cls);
  });

  // Calculate averages & sort
  const sortedSeasons = Object.values(groupedData).sort((a, b) => {
    if (a.seasonName === OTHER_SEASON) return 1;
    if (b.seasonName === OTHER_SEASON) return -1;
    return b.seasonName.localeCompare(a.seasonName);
  });

  sortedSeasons.forEach(season => {
    Object.values(season.semesters).forEach(semester => {
      Object.values(semester.subjects).forEach(subject => {
        const totalStudents = subject.classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
        subject.avgStudents = subject.classes.length > 0 ? Math.round(totalStudents / subject.classes.length) : 0;
      });
    });
  });

  // Auto-expand first season and its first semester on load
  useEffect(() => {
    if (sortedSeasons.length > 0 && Object.keys(expandedSeasons).length === 0) {
      const firstSeason = sortedSeasons[0];
      setExpandedSeasons({ [firstSeason.seasonName]: true });

      const semestersList = Object.values(firstSeason.semesters);
      if (semestersList.length > 0) {
        setExpandedSemesters({ [semestersList[0].semesterId]: true });
      }
    }
  }, [sortedSeasons.length])

  const toggleSeason = (name: string) => setExpandedSeasons(prev => ({ ...prev, [name]: !prev[name] }))
  const toggleSemester = (id: string) => setExpandedSemesters(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 px-6 lg:px-8">

      {/* Header matching the design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-slate-400" />
            {t('lc.cls.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('lc.cls.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SemesterSelector
            selectedSemester={selectedSemester}
            onChange={setSelectedSemester}
          />
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('lc.cls.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 font-sans">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 font-sans">K</kbd>
            </div>
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-bold text-slate-800 mb-4">{t('lc.cls.structured_list')}</h3>

        <div className="space-y-4">
          {sortedSeasons.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-slate-700">{t('lc.cls.empty_title')}</h4>
              <p className="text-sm text-slate-500 mt-1">{t('lc.cls.empty_desc')}</p>
            </div>
          ) : (
            sortedSeasons.map(season => {
              const isExpanded = expandedSeasons[season.seasonName];
              const semesterCount = Object.keys(season.semesters).length;
              const sortedSemesters = Object.values(season.semesters).sort((a, b) => a.semesterCode.localeCompare(b.semesterCode));
              const theme = getSeasonTheme(season.seasonName);
              const SeasonIcon = theme.seasonIcon;

              return (
                <div key={season.seasonName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

                  {/* Season Header */}
                  <div
                    onClick={() => toggleSeason(season.seasonName)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${theme.seasonIconBg}`}>
                        <SeasonIcon className={`w-6 h-6 ${theme.seasonIconColor}`} />
                      </div>
                      <div className="flex items-center gap-3">
                        <h2 className={`text-lg ${theme.seasonTitleColor}`}>
                          {season.seasonName === OTHER_SEASON ? t('lc.cls.other_seasons') : season.seasonName}
                        </h2>
                        {season.isActive && (
                          <span className={`px-2.5 py-0.5 text-xs rounded-full ${theme.seasonBadgeBg} ${theme.seasonBadgeText}`}>
                            {t('lc.cls.in_progress')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${theme.seasonCountText}`}>{t('lc.cls.semesters_count', { n: semesterCount })}</span>
                      {isExpanded ? <ChevronUp className={`w-5 h-5 ${theme.seasonChevronColor}`} /> : <ChevronDown className={`w-5 h-5 ${theme.seasonChevronColor}`} />}
                    </div>
                  </div>

                  {/* Season Content */}
                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
                      {sortedSemesters.map(semester => {
                        const isSemExpanded = expandedSemesters[semester.semesterId];
                        const subjectCount = Object.keys(semester.subjects).length;
                        const sortedSubjects = Object.values(semester.subjects).sort((a, b) => a.subjectName.localeCompare(b.subjectName));

                        return (
                          <div key={semester.semesterId} className={`border rounded-xl overflow-hidden mt-4 transition-all duration-200 ${theme.semCardBorder}`}>

                            {/* Semester Header */}
                            <div
                              onClick={() => toggleSemester(semester.semesterId)}
                              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${theme.semHeaderBg}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme.semIconBoxBg}`}>
                                  <Calendar className={`w-5 h-5 ${theme.semIconColor}`} />
                                </div>
                                <div>
                                  <h3 className={`text-base ${theme.semTitleColor}`}>{formatSemesterCode(semester.semesterCode, t('lc.semester_word'))}</h3>
                                  {(semester.startDate || semester.endDate) && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                      {formatDate(semester.startDate)} - {formatDate(semester.endDate)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-xs px-3 py-1 rounded-full ${theme.semBadgeBg} ${theme.semBadgeText}`}>{t('lc.cls.subjects_count', { n: subjectCount })}</span>
                                {isSemExpanded ? <ChevronUp className={`w-5 h-5 ${theme.semChevronColor}`} /> : <ChevronDown className={`w-5 h-5 ${theme.semChevronColor}`} />}
                              </div>
                            </div>

                            {/* Semester Content (Subject Table) */}
                            {isSemExpanded && (
                              <div className="bg-white overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-slate-500 bg-white border-b border-slate-100">
                                    <tr>
                                      <th className="px-6 py-4 font-medium">{t('lc.cls.col.subject')}</th>
                                      <th className="px-6 py-4 font-medium text-center">{t('lc.cls.col.subject_code')}</th>
                                      <th className="px-6 py-4 font-medium text-center">{t('lc.cls.col.classes')}</th>
                                      <th className="px-6 py-4 font-medium text-center">{t('lc.cls.col.avg_size')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {sortedSubjects.map(subject => {
                                      const isSubjExpanded = expandedSubjects[subject.subjectId];

                                      return (
                                        <React.Fragment key={subject.subjectId}>
                                          <tr
                                            onClick={(e) => toggleSubject(subject.subjectId, e)}
                                            className="hover:bg-slate-50/50 group cursor-pointer"
                                          >
                                            <td className="px-6 py-4">
                                              <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                  {subject.subjectCode.includes('PR') ? <Code className="w-4 h-4" /> : <Book className="w-4 h-4" />}
                                                </div>
                                                <span className="font-semibold text-slate-700">{subject.subjectName}</span>
                                              </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-600">{subject.subjectCode}</td>
                                            <td className="px-6 py-4 text-center">
                                              <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                                {t('lc.cls.classes_count', { n: subject.classes.length })}
                                              </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-600">{t('lc.cls.students_count', { n: subject.avgStudents })}</td>
                                          </tr>

                                          {/* Expanded Subject Classes */}
                                          {/* Was `> 1`, so a subject with a single class expanded to nothing. */}
                                          {isSubjExpanded && subject.classes.length > 0 && (
                                            <tr className="bg-slate-50/50">
                                              <td colSpan={4} className="p-0 border-b border-indigo-100">
                                                <div className="px-8 py-4 flex flex-wrap gap-2.5">
                                                  {subject.classes.map(cls => (
                                                    <button
                                                      key={cls.id}
                                                      onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                                                      className="group/btn flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                      <span className="w-2 h-2 rounded-full bg-indigo-400 group-hover/btn:bg-indigo-500 transition-colors"></span>
                                                      <span className="font-semibold text-slate-700 group-hover/btn:text-indigo-700 transition-colors">
                                                        {t('lc.cls.class_prefix', { code: cls.code })}
                                                      </span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }))}
        </div>
      </div>
    </div>
  )
}