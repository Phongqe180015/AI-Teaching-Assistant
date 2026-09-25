import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { api, type ClassRow, type SemesterRow, type SubjectRow, type Option, type StudentRow } from '@/lib/api'
import type { BreadcrumbItem } from '@/types'
import { formatSemesterCode } from '@/utils/semester'
import { Plus, GraduationCap, Loader2, X, StickyNote, Save, Users, CalendarDays, Library, ArrowLeft, Edit3, Trash2, ShieldAlert, BookOpen, Layers } from 'lucide-react'

type Level = 'season' | 'semester' | 'subject' | 'class' | 'students'

export function AdminClasses() {
  const [, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [lecturers, setLecturers] = useState<Option[]>([])

  const [showClassForm, setShowClassForm] = useState(false)
  const [showSemesterForm, setShowSemesterForm] = useState(false)

  const [classForm, setClassForm] = useState({ code: '', name: '', subjectId: '', subjectIds: [] as string[], semesterId: '', campus: '', lecturerId: '' })
  const [multiClassForm, setMultiClassForm] = useState([{ code: '', lecturerId: '' }])
  const [semesterForm, setSemesterForm] = useState({ code: '', season: '', startDate: '', endDate: '' })

  const [editingSemester, setEditingSemester] = useState<SemesterRow | null>(null)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '', description: '' })

  // Drill-down state
  const [level, setLevel] = useState<Level>('season')
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [selectedSemester, setSelectedSemester] = useState<SemesterRow | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<SubjectRow | null>(null)
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [classStudents, setClassStudents] = useState<StudentRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [semesterSubjects, setSemesterSubjects] = useState<SubjectRow[]>([])
  const [loadingSemesterSubjects, setLoadingSemesterSubjects] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [selectedSubjectIdsToAdd, setSelectedSubjectIdsToAdd] = useState<Set<string>>(new Set())

  // Classes for subject view
  const [subjectClasses, setSubjectClasses] = useState<any[]>([])
  const [loadingSubjectClasses, setLoadingSubjectClasses] = useState(false)

  // Modal confirm delete
  const [confirmDeleteSeason, setConfirmDeleteSeason] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Internal class note editor (admin only)
  const [noteClassId, setNoteClassId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [clsData, semData, subData] = await Promise.all([
        api.getClasses(),
        api.getSemesters(),
        api.getSubjects(1, 1000)
      ])
      setClasses(clsData || [])
      setSemesters(semData || [])
      setSubjects(subData || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      setLoadError(msg)
      setClasses([])
      setSemesters([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    api.getLecturerOptions()
      .then(setLecturers)
      .catch(() => setLecturers([]))
  }, [load])

  // ─── Season Creation ───
  const handleCreateSemester = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (editingSemester) {
        await api.updateSemester(editingSemester.id, {
          code: semesterForm.code,
          season: semesterForm.season || undefined,
          startDate: semesterForm.startDate || undefined,
          endDate: semesterForm.endDate || undefined,
        })
      } else {
        if (!semesterForm.season) {
          throw new Error('Season name is required')
        }
        await api.createSeason({
          season: semesterForm.season.trim(),
          startDate: semesterForm.startDate || undefined,
          endDate: semesterForm.endDate || undefined,
        })
      }
      setSemesterForm({ code: '', season: '', startDate: '', endDate: '' })
      setEditingSemester(null)
      setShowSemesterForm(false)
      await load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create semester')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Class Creation ───
  const handleCreateClass = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (editingClass) {
        await api.updateClass(editingClass.id, {
          code: classForm.code,
          name: classForm.name,
          subjectId: classForm.subjectId || selectedSubject?.id,
          semesterId: classForm.semesterId || selectedSemester?.id,
          campus: classForm.campus,
          lecturerId: classForm.lecturerId,
        })
      } else {
        // Create class(es) at the current level
        if (level === 'class' && selectedSemester && selectedSubject) {
          const validClasses = multiClassForm.filter(c => c.code.trim() !== '')
          if (validClasses.length === 0) throw new Error('Please enter at least one class code')

          await Promise.all(validClasses.map(c =>
            api.createClass({
              code: c.code,
              name: '',
              subjectId: selectedSubject.id,
              semesterId: selectedSemester.id,
              campus: '',
              lecturerId: c.lecturerId,
            })
          ))
        } else {
          throw new Error('Please select Semester + Subject before creating a class')
        }
      }
      setClassForm({ code: '', name: '', subjectId: '', subjectIds: [], semesterId: '', campus: '', lecturerId: '' })
      setMultiClassForm([{ code: '', lecturerId: '' }])
      setEditingClass(null)
      setShowClassForm(false)
      await load()
      // Refresh subject classes
      if (selectedSemester && selectedSubject) {
        loadSubjectClasses(selectedSemester.id, selectedSubject.id)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create class')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Delete Season (entire season with all 9 semesters) ───
  const handleDeleteSeason = async (season: string) => {
    setIsDeleting(true)
    try {
      await api.deleteSeason(season)
      setConfirmDeleteSeason(null)
      if (selectedSeason === season) {
        setLevel('season')
        setSelectedSeason(null)
        setSelectedSemester(null)
        setSelectedSubject(null)
      }
      await load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete season')
    } finally {
      setIsDeleting(false)
    }
  }

  // ─── Delete Class ───
  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this class?')) return
    try {
      await api.deleteClass(id)
      await load()
      if (selectedSemester && selectedSubject) {
        loadSubjectClasses(selectedSemester.id, selectedSubject.id)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete')
    }
  }

  const handleEditClass = (cls: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingClass(cls)
    setClassForm({
      code: cls.code,
      name: cls.name || '',
      subjectId: cls.subject?.id || '',
      subjectIds: [],
      semesterId: cls.semester?.id || selectedSemester?.id || '',
      campus: cls.campus || '',
      lecturerId: cls.lecturer?.id || '',
    })
    setShowClassForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNote = (c: any) => {
    setNoteClassId(c.id)
    setNoteDraft(c.note ?? '')
  }

  const saveNote = async () => {
    if (!noteClassId || savingNote) return
    setSavingNote(true)
    try {
      await api.updateClassNote(noteClassId, noteDraft)
      await load()
      if (selectedSemester && selectedSubject) {
        loadSubjectClasses(selectedSemester.id, selectedSubject.id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingNote(false)
    }
  }

  const loadStudents = async (c: any) => {
    setSelectedClass(c)
    setLevel('students')
    setLoadingStudents(true)
    try {
      const students = await api.getClassStudents(c.id)
      setClassStudents(students || [])
    } catch (err) {
      setClassStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const loadSemesterSubjects = async (semesterId: string) => {
    setLoadingSemesterSubjects(true)
    try {
      const data = await api.getSemesterSubjects(semesterId)
      setSemesterSubjects(data || [])
    } catch (err) {
      setSemesterSubjects([])
    } finally {
      setLoadingSemesterSubjects(false)
    }
  }

  const loadSubjectClasses = async (semesterId: string, subjectId: string) => {
    setLoadingSubjectClasses(true)
    try {
      const data = await api.getClassesBySubject(semesterId, subjectId)
      setSubjectClasses(data || [])
    } catch (err) {
      setSubjectClasses([])
    } finally {
      setLoadingSubjectClasses(false)
    }
  }

  const handleAddSemesterSubjects = async () => {
    if (!selectedSemester || selectedSubjectIdsToAdd.size === 0) return
    setIsSubmitting(true)
    try {
      await api.addSemesterSubjects(selectedSemester.id, Array.from(selectedSubjectIdsToAdd))
      await loadSemesterSubjects(selectedSemester.id)
      setShowAddSubjectModal(false)
      setSelectedSubjectIdsToAdd(new Set())
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add subjects')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveSemesterSubject = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!selectedSemester || !confirm('Are you sure you want to remove this subject from the semester?')) return
    setIsSubmitting(true)
    try {
      await api.removeSemesterSubject(selectedSemester.id, subjectId)
      setSemesterSubjects(prev => prev.filter(s => s.id !== subjectId))
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Edit Subject ───
  const handleEditSubject = (sub: SubjectRow) => {
    setEditingSubject(sub)
    setSubjectForm({
      code: sub.code,
      name: sub.name,
      description: sub.description || '',
    })
  }

  const handleSaveSubject = async () => {
    if (!editingSubject || isSubmitting) return
    if (!subjectForm.code.trim() || !subjectForm.name.trim()) {
      alert('Subject code and name cannot be empty')
      return
    }
    setIsSubmitting(true)
    try {
      await api.updateSubject(editingSubject.id, {
        code: subjectForm.code.trim(),
        name: subjectForm.name.trim(),
        description: subjectForm.description.trim() || undefined,
      })
      setSemesterSubjects(prev =>
        prev.map(s =>
          s.id === editingSubject.id
            ? { ...s, code: subjectForm.code, name: subjectForm.name, description: subjectForm.description }
            : s
        )
      )
      setSubjects(prev =>
        prev.map(s =>
          s.id === editingSubject.id
            ? { ...s, code: subjectForm.code, name: subjectForm.name, description: subjectForm.description }
            : s
        )
      )
      setEditingSubject(null)
      setSubjectForm({ code: '', name: '', description: '' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Navigation ───
  const navigateToLevel = (targetLevel: Level) => {
    setShowClassForm(false)
    setShowSemesterForm(false)
    setEditingClass(null)
    setEditingSemester(null)
    if (targetLevel === 'season') {
      setLevel('season')
      setSelectedSeason(null)
      setSelectedSemester(null)
      setSelectedSubject(null)
      setSelectedClass(null)
    } else if (targetLevel === 'semester') {
      setLevel('semester')
      setSelectedSemester(null)
      setSelectedSubject(null)
      setSelectedClass(null)
    } else if (targetLevel === 'subject') {
      setLevel('subject')
      setSelectedSubject(null)
      setSelectedClass(null)
      if (selectedSemester) loadSemesterSubjects(selectedSemester.id)
    } else if (targetLevel === 'class') {
      setLevel('class')
      setSelectedClass(null)
    }
  }

  const handleSeasonClick = (season: string) => {
    setSelectedSeason(season)
    setLevel('semester')
  }

  const handleSemesterClick = (sem: SemesterRow) => {
    setSelectedSemester(sem)
    setLevel('subject')
    loadSemesterSubjects(sem.id)
  }

  const handleSubjectClick = (sub: SubjectRow) => {
    setSelectedSubject(sub)
    setLevel('class')
    if (selectedSemester) {
      loadSubjectClasses(selectedSemester.id, sub.id)
    }
  }

  // ─── Derived Data ───
  const groupedSeasons = semesters.reduce((acc, sem) => {
    const s = sem.season || 'Unclassified'
    if (!acc[s]) acc[s] = []
    acc[s].push(sem)
    return acc
  }, {} as Record<string, SemesterRow[]>)

  const semestersInSeason = selectedSeason ? (groupedSeasons[selectedSeason] || []).sort((a, b) => {
    const numA = parseInt(a.code.match(/\d+/)?.[0] || '99')
    const numB = parseInt(b.code.match(/\d+/)?.[0] || '99')
    return numA - numB
  }) : []

  const lecturerOptions = lecturers.map(l => ({ value: l.value, label: l.label }))

  const getBreadcrumbs = () => {
    const crumbs: BreadcrumbItem[] = [{ label: 'Admin', path: '/admin' }]

    if (level === 'season') {
      crumbs.push({ label: 'Manage Seasons' })
    } else {
      crumbs.push({ label: 'Manage Seasons', onClick: () => navigateToLevel('season') })

      if (selectedSeason) {
        if (level === 'semester') {
          crumbs.push({ label: selectedSeason })
        } else {
          crumbs.push({ label: selectedSeason, onClick: () => navigateToLevel('semester') })

          if (selectedSemester) {
            if (level === 'subject') {
              crumbs.push({ label: formatSemesterCode(selectedSemester.code) })
            } else {
              crumbs.push({ label: formatSemesterCode(selectedSemester.code), onClick: () => navigateToLevel('subject') })

              if (selectedSubject) {
                if (level === 'class') {
                  crumbs.push({ label: selectedSubject.code || selectedSubject.name })
                } else {
                  crumbs.push({ label: selectedSubject.code || selectedSubject.name, onClick: () => navigateToLevel('class') })
                  if (selectedClass) crumbs.push({ label: selectedClass.code })
                }
              }
            }
          }
        }
      }
    }
    return crumbs
  }

  // ─── RENDER ───
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Manage Class Hierarchy"
        breadcrumbs={getBreadcrumbs()}
        actions={
          <div className="flex gap-2">
            {level === 'season' && (
              <Button
                size="sm"
                onClick={() => {
                  if (showSemesterForm) {
                    setShowSemesterForm(false)
                    setEditingSemester(null)
                    setSemesterForm({ code: '', season: '', startDate: '', endDate: '' })
                  } else {
                    setShowSemesterForm(true)
                  }
                }}
                variant={showSemesterForm ? 'secondary' : 'primary'}
                className="shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                {showSemesterForm ? <X size={16} /> : <Plus size={16} />}
                {showSemesterForm ? 'Close' : 'Create New Season'}
              </Button>
            )}
            {level === 'class' && (
              <Button
                size="sm"
                onClick={() => {
                  if (showClassForm) {
                    setShowClassForm(false)
                    setEditingClass(null)
                    setMultiClassForm([{ code: '', lecturerId: '' }])
                  } else {
                    setShowClassForm(true)
                    setMultiClassForm([{ code: '', lecturerId: '' }])
                  }
                }}
                variant={showClassForm ? 'secondary' : 'primary'}
                className="shadow-sm transition-all duration-200 flex items-center gap-2"
              >
                {showClassForm ? <X size={16} /> : <Plus size={16} />}
                {showClassForm ? 'Close' : 'Create New Class'}
              </Button>
            )}
          </div>
        }
      />

      {/* Back button */}
      {level !== 'season' && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-slate-600 dark:text-slate-400"
            onClick={() => {
              if (level === 'semester') navigateToLevel('season')
              else if (level === 'subject') navigateToLevel('semester')
              else if (level === 'class') navigateToLevel('subject')
              else if (level === 'students') navigateToLevel('class')
            }}
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="text-sm text-slate-500 font-medium">
            {level === 'semester' && `Season: ${selectedSeason}`}
            {level === 'subject' && `${selectedSeason} > ${formatSemesterCode(selectedSemester?.code)}`}
            {level === 'class' && `${selectedSeason} > ${formatSemesterCode(selectedSemester?.code)} > ${selectedSubject?.code || selectedSubject?.name}`}
            {level === 'students' && `${selectedSeason} > ${formatSemesterCode(selectedSemester?.code)} > ${selectedSubject?.code} > Class ${selectedClass?.code}`}
          </div>
        </div>
      )}

      {/* Season Create Form */}
      {showSemesterForm && (
        <Card className="p-6 border border-indigo-200 bg-indigo-50/50 dark:bg-indigo-900/10 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <CalendarDays size={20} /> {editingSemester ? `Edit Semester: ${formatSemesterCode(editingSemester.code)}` : 'Create New Season'}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {editingSemester && (
              <Input label="Semester Code" placeholder="e.g. Term 1" value={semesterForm.code} onChange={(e) => setSemesterForm({ ...semesterForm, code: e.target.value })} />
            )}
            <Input label={editingSemester ? "Season (Optional)" : "Season Name (*)"} placeholder="e.g. Fall 2026" value={semesterForm.season} onChange={(e) => setSemesterForm({ ...semesterForm, season: e.target.value })} />
            <Input type="date" label="Start Date" value={semesterForm.startDate} onChange={(e) => setSemesterForm({ ...semesterForm, startDate: e.target.value })} />
            <Input type="date" label="End Date" value={semesterForm.endDate} onChange={(e) => setSemesterForm({ ...semesterForm, endDate: e.target.value })} />
          </div>
          {!editingSemester && (
            <p className="text-xs text-slate-500 mt-2">The system will automatically create 9 terms (Term 1 → Term 9) and assign default subjects according to the curriculum.</p>
          )}
          <div className="mt-4 flex justify-end">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreateSemester} disabled={isSubmitting || (editingSemester ? !semesterForm.code : !semesterForm.season)}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />} {editingSemester ? 'Save Semester' : 'Create Season'}
            </Button>
          </div>
        </Card>
      )}

      {/* Class Create Form */}
      {showClassForm && level === 'class' && selectedSemester && selectedSubject && (
        <Card className="p-6 border border-slate-200 dark:border-slate-700 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <GraduationCap size={20} /> {editingClass ? `Edit Class: ${editingClass.code}` : `Create New Class for ${selectedSubject.code}`}
          </h3>
          {editingClass ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Class Code" value={classForm.code} onChange={e => setClassForm({ ...classForm, code: e.target.value })} />
              <Select label="Lecturer" options={lecturerOptions} value={classForm.lecturerId} onChange={e => setClassForm({ ...classForm, lecturerId: e.target.value })} />
            </div>
          ) : (
            <div className="space-y-3">
              {multiClassForm.map((row, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input label={idx === 0 ? "Class Code" : ""} placeholder={`Class ${idx + 1}`} value={row.code} onChange={e => {
                      const updated = [...multiClassForm]; updated[idx].code = e.target.value; setMultiClassForm(updated)
                    }} />
                  </div>
                  <div className="flex-1">
                    <Select label={idx === 0 ? "Lecturer" : ""} options={lecturerOptions} value={row.lecturerId} onChange={e => {
                      const updated = [...multiClassForm]; updated[idx].lecturerId = e.target.value; setMultiClassForm(updated)
                    }} />
                  </div>
                  {multiClassForm.length > 1 && (
                    <Button variant="outline" size="sm" className="text-red-500 mb-0.5" onClick={() => setMultiClassForm(multiClassForm.filter((_, i) => i !== idx))}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setMultiClassForm([...multiClassForm, { code: '', lecturerId: '' }])}>
                <Plus size={14} className="mr-1" /> Add Class
              </Button>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleCreateClass} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />} {editingClass ? 'Save' : 'Create Class'}
            </Button>
          </div>
        </Card>
      )}

      {/* Loading / Error */}
      {loading && <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500" /><p className="text-sm text-slate-500 mt-3">Loading data...</p></div>}
      {loadError && <div className="text-center py-8 text-red-500">{loadError}</div>}

      {/* ═══════════════════════ LEVEL 1: SEASONS ═══════════════════════ */}
      {!loading && level === 'season' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedSeasons).length === 0 && (
            <div className="col-span-full text-center py-16 text-slate-400">
              <CalendarDays size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No seasons yet</p>
              <p className="text-sm">Click "Create New Season" to start</p>
            </div>
          )}
          {Object.entries(groupedSeasons).map(([season, sems]) => {
            const totalClasses = sems.reduce((sum, s) => sum + (s.classCount || 0), 0)
            const totalSubjects = sems.reduce((sum, s) => sum + (s.subjectCount || 0), 0)
            const startDate = sems[0]?.startDate
            const endDate = sems[0]?.endDate
            return (
              <Card
                key={season}
                className="p-0 overflow-hidden cursor-pointer hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-200 group border border-slate-200 dark:border-slate-700"
                onClick={() => handleSeasonClick(season)}
              >
                <div className="bg-gradient-to-r from-indigo-500 to-brand-500 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Layers size={20} /> {season}
                    </h3>
                    <button
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteSeason(season) }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {(startDate || endDate) && (
                    <p className="text-xs text-white/70 mt-1">
                      {startDate ? new Date(startDate).toLocaleDateString('vi-VN') : '?'} — {endDate ? new Date(endDate).toLocaleDateString('vi-VN') : '?'}
                    </p>
                  )}
                </div>
                <div className="p-4 flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{sems.length}</p>
                    <p className="text-xs text-slate-500">Semesters</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totalSubjects}</p>
                    <p className="text-xs text-slate-500">Subjects</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalClasses}</p>
                    <p className="text-xs text-slate-500">Classes</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ═══════════════════════ LEVEL 2: SEMESTERS IN SEASON ═══════════════════════ */}
      {!loading && level === 'semester' && selectedSeason && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
            Semesters in season <span className="text-brand-600 dark:text-brand-400">{selectedSeason}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {semestersInSeason.map(sem => (
              <Card
                key={sem.id}
                className="p-5 cursor-pointer hover:shadow-md hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-200 group border border-slate-200 dark:border-slate-700"
                onClick={() => handleSemesterClick(sem)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CalendarDays size={18} className="text-indigo-500" /> {formatSemesterCode(sem.code)}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sem.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                    {sem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <BookOpen size={14} className="text-indigo-500" />
                    <span>{sem.subjectCount || 0} subjects</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <GraduationCap size={14} className="text-emerald-500" />
                    <span>{sem.classCount || 0} classes</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════ LEVEL 3: SUBJECTS IN SEMESTER ═══════════════════════ */}
      {!loading && level === 'subject' && selectedSemester && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Subjects in <span className="text-brand-600 dark:text-brand-400">{formatSemesterCode(selectedSemester.code)}</span>
            </h2>
            <Button size="sm" onClick={() => { setShowAddSubjectModal(true); setSelectedSubjectIdsToAdd(new Set()) }}>
              <Plus size={16} className="mr-1" /> Add Subject
            </Button>
          </div>

          {loadingSemesterSubjects ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>
          ) : semesterSubjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Library size={40} className="mx-auto mb-2 opacity-50" />
              <p>No subjects in this term yet</p>
              <p className="text-sm">Click "Add Subject" or check Subject.Semester configuration</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Description</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {semesterSubjects.map(sub => (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => handleSubjectClick(sub)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-brand-600 dark:text-brand-400">{sub.code}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{sub.name}</td>
                      <td className="px-4 py-3 text-slate-500 line-clamp-2">{sub.description || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit',
                              icon: <Edit3 size={14} />,
                              onClick: (e) => { e.stopPropagation(); handleEditSubject(sub) },
                            },
                            {
                              id: 'delete',
                              label: 'Delete',
                              icon: <Trash2 size={14} />,
                              onClick: (e) => handleRemoveSemesterSubject(sub.id, e),
                              isDanger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ LEVEL 4: CLASSES IN SUBJECT ═══════════════════════ */}
      {!loading && level === 'class' && selectedSemester && selectedSubject && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
            Classes: <span className="text-brand-600 dark:text-brand-400">{selectedSubject.code}</span> — {formatSemesterCode(selectedSemester.code)}
          </h2>

          {loadingSubjectClasses ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>
          ) : subjectClasses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <GraduationCap size={40} className="mx-auto mb-2 opacity-50" />
              <p>No classes yet</p>
              <p className="text-sm">Click "Create New Class" to add</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Class Code</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Lecturer</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Students</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subjectClasses.map((cls: any) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => loadStudents(cls)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{cls.code}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{cls.lecturer?.name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-semibold">
                          <Users size={12} /> {cls.studentCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cls.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                          {cls.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu
                          items={[
                            {
                              id: 'edit',
                              label: 'Edit',
                              icon: <Edit3 size={14} />,
                              onClick: (e) => handleEditClass(cls, e),
                            },
                            {
                              id: 'note',
                              label: 'Note',
                              icon: <StickyNote size={14} />,
                              onClick: (e) => { e.stopPropagation(); openNote(cls) },
                            },
                            {
                              id: 'delete',
                              label: 'Delete',
                              icon: <Trash2 size={14} />,
                              onClick: (e) => handleDeleteClass(cls.id, e),
                              isDanger: true,
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ LEVEL 5: STUDENTS ═══════════════════════ */}
      {!loading && level === 'students' && selectedClass && (
        <div>
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
            Students in class <span className="text-brand-600 dark:text-brand-400">{selectedClass.code}</span>
          </h2>
          {loadingStudents ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></div>
          ) : classStudents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users size={40} className="mx-auto mb-2 opacity-50" />
              <p>No students in this class</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Student ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.map((s, index) => (
                    <tr key={s.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-semibold">{index + 1}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{s.studentId || '—'}</td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{s.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* Delete Season Confirm */}
      {confirmDeleteSeason && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setConfirmDeleteSeason(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-3">
                <ShieldAlert className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Delete season "{confirmDeleteSeason}"?</h3>
              <p className="text-sm text-slate-500 mt-2">All 9 terms, subjects and classes in this season will be permanently deleted.</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDeleteSeason(null)}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDeleteSeason(confirmDeleteSeason)} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 size={14} className="mr-2" />} Delete
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && selectedSemester && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAddSubjectModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Library size={20} /> Add subjects to {formatSemesterCode(selectedSemester.code)}
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {subjects
                .filter(s => !semesterSubjects.find(ss => ss.id === s.id))
                .map(sub => (
                  <label key={sub.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIdsToAdd.has(sub.id)}
                      onChange={() => {
                        const next = new Set(selectedSubjectIdsToAdd)
                        next.has(sub.id) ? next.delete(sub.id) : next.add(sub.id)
                        setSelectedSubjectIdsToAdd(next)
                      }}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">{sub.code}</span>
                      <span className="text-sm text-slate-500 ml-2">{sub.name}</span>
                      {sub.semester && <span className="text-xs text-indigo-500 ml-2">(Term {sub.semester})</span>}
                    </div>
                  </label>
                ))
              }
            </div>
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setShowAddSubjectModal(false)}>Cancel</Button>
              <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={handleAddSemesterSubjects} disabled={isSubmitting || selectedSubjectIdsToAdd.size === 0}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus size={14} className="mr-2" />}
                Add {selectedSubjectIdsToAdd.size > 0 ? `(${selectedSubjectIdsToAdd.size})` : ''}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Subject Modal */}
      {editingSubject && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingSubject(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Edit3 size={20} /> Edit subject
            </h3>
            <div className="space-y-3">
              <Input
                label="Subject Code (*)"
                placeholder="e.g. PRN222"
                value={subjectForm.code}
                onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
              />
              <Input
                label="Subject Name (*)"
                placeholder="e.g. Object-Oriented Programming"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
              />
              <Textarea
                label="Subject Description"
                placeholder="Enter details..."
                value={subjectForm.description}
                onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setEditingSubject(null)}>Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveSubject} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={14} className="mr-2" />} Save Changes
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Note Modal */}
      {noteClassId && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setNoteClassId(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <StickyNote size={18} /> Internal Notes
            </h3>
            <Textarea
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder="Enter notes..."
              className="min-h-[120px]"
            />
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" onClick={() => setNoteClassId(null)}>Close</Button>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={saveNote} disabled={savingNote}>
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={14} className="mr-2" />} Save
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}