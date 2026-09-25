import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/ui/DataTable'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { api, type SubjectRow } from '@/lib/api'

import {
  Plus, Library, TableProperties, Loader2, X, AlertTriangle,
  CheckSquare, ArrowUpDown, ArrowUp, ArrowDown, BookOpen, Edit2,
  Download, Search, LayoutGrid, Trash2, Layers, CheckCircle, ChevronRight
} from 'lucide-react'

export function AdminSubjects() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null)
  const [form, setForm] = useState<{ code: string; name: string; description: string; semester: number | '' }>({ code: '', name: '', description: '', semester: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  // View Mode: Table vs Grid
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSemester, setFilterSemester] = useState<string>('ALL')

  // Selection Mode
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Subject Detail Modal State
  const [detailSubject, setDetailSubject] = useState<SubjectRow | null>(null)

  // Sorting State
  const [sortKey, setSortKey] = useState<'semester' | 'code' | 'name' | 'status'>('semester')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getSubjects()
      setSubjects(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load subjects list'
      setLoadError(msg)
      setSubjects([])
      console.error('Failed to load subjects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Refetch when tab gets focus — ensures data stays in sync
  useEffect(() => {
    const onFocus = () => { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  // Filtered & Sorted Subjects
  const filteredAndSortedSubjects = useMemo(() => {
    return subjects
      .filter((s) => {
        const matchesSearch =
          !searchTerm ||
          s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesSem =
          filterSemester === 'ALL' ||
          String(s.semester) === String(filterSemester)

        return matchesSearch && matchesSem
      })
      .sort((a, b) => {
        if (sortKey === 'semester') {
          const parseSem = (val: any) => {
            if (val == null || val === '') return 999
            const num = Number(String(val).replace(/\D/g, ''))
            return isNaN(num) ? 999 : num
          }
          const semA = parseSem(a.semester)
          const semB = parseSem(b.semester)
          if (semA !== semB) {
            return sortOrder === 'asc' ? semA - semB : semB - semA
          }
          return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
        }

        if (sortKey === 'code') {
          const comp = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' })
          return sortOrder === 'asc' ? comp : -comp
        }

        if (sortKey === 'name') {
          const comp = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
          return sortOrder === 'asc' ? comp : -comp
        }

        if (sortKey === 'status') {
          const statusA = (a.status || 'active').toString()
          const statusB = (b.status || 'active').toString()
          const comp = statusA.localeCompare(statusB)
          return sortOrder === 'asc' ? comp : -comp
        }

        return 0
      })
  }, [subjects, searchTerm, filterSemester, sortKey, sortOrder])

  // Stats calculation
  const stats = useMemo(() => {
    const total = subjects.length
    const active = subjects.filter(s => s.status === 'active' || s.status === '1' || !s.status).length
    const semestersCount = new Set(subjects.map(s => s.semester).filter(Boolean)).size
    return { total, active, semestersCount }
  }, [subjects])

  const handleSortToggle = (key: 'semester' | 'code' | 'name' | 'status') => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const renderHeader = (label: string, key: 'semester' | 'code' | 'name' | 'status') => {
    const isSorted = sortKey === key
    return (
      <button
        onClick={() => handleSortToggle(key)}
        className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-semibold select-none group"
      >
        <span>{label}</span>
        {isSorted ? (
          sortOrder === 'asc' ? <ArrowUp size={14} className="text-brand-600 dark:text-brand-400" /> : <ArrowDown size={14} className="text-brand-600 dark:text-brand-400" />
        ) : (
          <ArrowUpDown size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    )
  }

  const handleCreate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          code: form.code,
          name: form.name,
          description: form.description,
          semester: form.semester ? Number(form.semester) : undefined,
        })
      } else {
        await api.createSubject({
          code: form.code,
          name: form.name,
          description: form.description,
          semester: form.semester ? Number(form.semester) : undefined,
        })
      }
      setForm({ code: '', name: '', description: '', semester: '' })
      setEditingSubject(null)
      setShowForm(false)
      load()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Failed to create subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (subject: SubjectRow) => {
    setEditingSubject(subject)
    setForm({
      code: subject.code,
      name: subject.name || '',
      description: subject.description || '',
      semester: subject.semester || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return
    try {
      await api.deleteSubject(id)
      setSubjects(prev => prev.filter(s => s.id !== id))
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected subjects?`)) return
    setIsDeleting(true)
    try {
      const results = await Promise.allSettled(Array.from(selectedIds).map(id => api.deleteSubject(id)))
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      if (failed.length > 0) {
        alert(failed.map(f => f.reason.message || 'Error').join('\n'))
      }
      setSubjects(prev => prev.filter(s => !selectedIds.has(s.id)))
      setSelectedIds(new Set())
      load()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Bulk delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Subject Management"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Subjects' }]}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={selectionMode ? 'primary' : 'outline'}
              className={`rounded-xl shadow-xs transition-all ${selectionMode ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'}`}
              onClick={() => {
                setSelectionMode(!selectionMode)
                if (selectionMode) {
                  setSelectedIds(new Set())
                }
              }}
            >
              <CheckSquare size={16} className="mr-2" /> {selectionMode ? 'Deselect' : 'Select Multiple'}
            </Button>
            {selectionMode && (
              <Button
                size="sm"
                variant="outline"
                className="text-brand-700 border-brand-200 hover:bg-brand-50 rounded-xl"
                onClick={() => {
                  if (selectedIds.size === subjects.length && subjects.length > 0) {
                    setSelectedIds(new Set())
                  } else {
                    setSelectedIds(new Set(subjects.map(s => s.id)))
                  }
                }}
              >
                {selectedIds.size === subjects.length && subjects.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (showForm) {
                  setShowForm(false)
                  setEditingSubject(null)
                  setForm({ code: '', name: '', description: '', semester: '' })
                } else {
                  setShowForm(true)
                }
              }}
              variant={showForm ? 'secondary' : 'primary'}
              className="shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 rounded-xl"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? 'Close' : 'Create Subject'}
            </Button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="p-6 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50/50 to-brand-50/40 dark:from-slate-900 dark:to-slate-900/60 shadow-sm rounded-3xl flex items-center gap-5 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen size={26} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">TOTAL SUBJECTS</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</h3>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/40 dark:from-slate-900 dark:to-slate-900/60 shadow-sm rounded-3xl flex items-center gap-5 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle size={26} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">ACTIVE SUBJECTS</p>
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.active}</h3>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/40 dark:from-slate-900 dark:to-slate-900/60 shadow-sm rounded-3xl flex items-center gap-5 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
            <Layers size={26} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">TOTAL SEMESTERS</p>
            <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{stats.semestersCount || 9} Semesters</h3>
          </div>
        </Card>
      </div>

      {showForm && (
        <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 animate-in slide-in-from-top-4 duration-300 rounded-3xl">
          <div className="border-b border-slate-100 dark:border-slate-800 p-5 bg-slate-50/80 dark:bg-slate-900/80 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
              <Library size={20} />
            </div>
            <CardHeader title={editingSubject ? `Edit Subject: ${editingSubject.code}` : "Create Subject"} />
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-6 sm:grid-cols-2">
              <Input label="Code" placeholder="E.g. PRJ301" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input label="Subject Name" placeholder="E.g. Java Web Application Development" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select
                label="Semester (1-9)"
                value={form.semester.toString()}
                onChange={(e) => setForm({ ...form, semester: e.target.value ? Number(e.target.value) : '' })}
                options={[
                  { label: 'Select semester', value: '' },
                  ...Array.from({ length: 9 }, (_, i) => ({ label: `Semester ${i + 1}`, value: String(i + 1) }))
                ]}
              />
              <Input label="Subject Description" placeholder="Enter a brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-5">
              <Button
                className="px-8 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md transition-all duration-200 flex items-center gap-2"
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Subject'
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Control Bar: Search, Semester Filter, View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Code, Subject Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all shadow-xs"
            />
          </div>

          <select
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          >
            <option value="ALL">All Semesters</option>
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>Semester {i + 1}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-brand-700 bg-brand-50 px-3.5 py-1.5 rounded-full border border-brand-200">
                Selected {selectedIds.size}
              </span>
              <Button size="sm" onClick={handleBulkDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white border-none shadow-sm text-xs rounded-xl">
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 size={13} className="mr-1" />}
                Delete selected
              </Button>
            </div>
          )}

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="Table View"
            >
              <TableProperties size={16} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <Card className="flex items-center justify-center p-14 border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-bold text-sm">Loading subjects...</p>
          </div>
        </Card>
      )}

      {/* Error State */}
      {loadError && (
        <Card className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/10 p-5 animate-in slide-in-from-top-3 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-600 dark:text-red-400 w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300">Error loading data</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{loadError}</p>
            </div>
            <button onClick={load} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-xs">
              Retry
            </button>
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      {!loading && !loadError && (
        <>
          {filteredAndSortedSubjects.length === 0 ? (
            <Card className="p-14 text-center text-slate-500 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <BookOpen size={44} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-base">No subjects found</p>
            </Card>
          ) : viewMode === 'grid' ? (
            /* Grid View UI */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedSubjects.map((subj) => {
                const isSelected = selectedIds.has(subj.id)
                return (
                  <Card
                    key={subj.id}
                    className={`group relative overflow-hidden border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer rounded-3xl ${isSelected
                        ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-950/30 shadow-md'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400 dark:hover:border-brand-600'
                      }`}
                    onClick={() => {
                      if (selectionMode) {
                        setSelectedIds(prev => {
                          const next = new Set(prev)
                          if (next.has(subj.id)) next.delete(subj.id)
                          else next.add(subj.id)
                          return next
                        })
                      } else {
                        navigate(`/admin/subjects/${subj.code || subj.id}`)
                      }
                    }}
                  >
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {selectionMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                setSelectedIds(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.add(subj.id)
                                  else next.delete(subj.id)
                                  return next
                                })
                              }}
                              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 mr-1"
                            />
                          )}
                          <span className="px-3.5 py-1 rounded-full text-xs font-black bg-gradient-to-r from-brand-100 to-indigo-100 text-brand-800 dark:from-brand-950 dark:to-indigo-950 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800">
                            {subj.semester ? (
                              /^k[yỳ]/i.test(String(subj.semester)) ? `Semester ${String(subj.semester).replace(/\D/g, '')}` : `Semester ${subj.semester}`
                            ) : 'Unassigned'}
                          </span>
                        </div>

                        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${subj.status === 'active' || !subj.status
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                          {subj.status === 'active' || !subj.status ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-mono text-2xl font-black text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center justify-between">
                          <span>{subj.code}</span>
                          <ChevronRight size={20} className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </h3>
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 line-clamp-1">
                          {subj.name}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed h-8">
                        {subj.description || 'No detailed description available for this subject.'}
                      </p>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end text-xs">
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            items={[
                              { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(subj) },
                              { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onClick: () => handleDelete(subj.id), isDanger: true }
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            /* Table View UI */
            <Card className="overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-3xl">
              <div className="p-2 overflow-x-auto custom-scrollbar">
                <DataTable
                  columns={[
                    ...(selectionMode ? [{
                      key: 'select',
                      header: '',
                      render: (r: SubjectRow) => {
                        const subj = r;
                        return (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(subj.id)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setSelectedIds(prev => {
                                const next = new Set(prev)
                                if (checked) next.add(subj.id)
                                else next.delete(subj.id)
                                return next
                              })
                            }}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        )
                      },
                      className: 'w-10 text-center'
                    }] : []),
                    {
                      key: 'code',
                      header: renderHeader('Code', 'code'),
                      render: (r: SubjectRow) => (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/subjects/${r.code || r.id}`)
                          }}
                          className="font-mono font-black text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                        >
                          {r.code}
                        </span>
                      )
                    },
                    {
                      key: 'name',
                      header: renderHeader('Subject Name', 'name'),
                      render: (r: SubjectRow) => (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/admin/subjects/${r.code || r.id}`)
                          }}
                          className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer transition-colors"
                        >
                          {r.name}
                        </span>
                      )
                    },
                    {
                      key: 'semester',
                      header: renderHeader('Semester', 'semester'),
                      render: (r: SubjectRow) => r.semester ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {/^k[yỳ]/i.test(String(r.semester)) ? `Semester ${String(r.semester).replace(/\D/g, '')}` : `Semester ${r.semester}`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                      )
                    },
                    {
                      key: 'status',
                      header: renderHeader('Status', 'status'),
                      render: (r: SubjectRow) => {
                        const status = r.status
                        const isActive = status === 'active' || status === '1' || status === 'true' || !status
                        return (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        )
                      }
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      className: 'w-24 text-center',
                      render: (r: SubjectRow) => (
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            items={[
                              { id: 'edit', label: 'Edit', icon: <Edit2 size={14} />, onClick: () => handleEdit(r) },
                              { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, onClick: () => handleDelete(r.id), isDanger: true }
                            ]}
                          />
                        </div>
                      )
                    }
                  ] as any}
                  data={filteredAndSortedSubjects}
                  keyExtractor={(r) => r.id}
                  onRowClick={(row) => {
                    if (selectionMode) {
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        if (next.has(row.id)) next.delete(row.id)
                        else next.add(row.id)
                        return next
                      })
                    } else {
                      navigate(`/admin/subjects/${row.code || row.id}`)
                    }
                  }}
                />
              </div>
            </Card>
          )}
        </>
      )}

      {/* Subject Detail Modal */}
      {detailSubject && createPortal(
        <SubjectModal
          subject={detailSubject}
          onClose={() => setDetailSubject(null)}
          onEdit={() => {
            const subj = detailSubject
            setDetailSubject(null)
            handleEdit(subj)
          }}
          onViewFullPage={() => {
            const code = detailSubject.code || detailSubject.id
            setDetailSubject(null)
            navigate(`/admin/subjects/${code}`)
          }}
        />,
        document.body
      )}
    </div>
  )
}

function SubjectModal({
  subject,
  onClose,
  onEdit,
  onViewFullPage
}: {
  subject: SubjectRow
  onClose: () => void
  onEdit: () => void
  onViewFullPage: () => void
}) {
  const [modalTab, setModalTab] = useState<'info' | 'sessions' | 'clos'>('info')
  const [sessionSearch, setSessionSearch] = useState('')

  const syllabus = useMemo(() => {
    if (!subject.syllabusData) return null
    try {
      if (typeof subject.syllabusData === 'object') return subject.syllabusData
      return JSON.parse(subject.syllabusData)
    } catch {
      return null
    }
  }, [subject])

  const filteredSessions = useMemo(() => {
    if (!syllabus?.sessions) return []
    if (!sessionSearch) return syllabus.sessions
    return syllabus.sessions.filter((s: any) =>
      s.topic.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      (s.studentTasks && s.studentTasks.toLowerCase().includes(sessionSearch.toLowerCase()))
    )
  }, [syllabus, sessionSearch])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-brand-600 via-indigo-600 to-slate-900 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-white">
                  {subject.semester ? (
                    /^k[yỳ]/i.test(String(subject.semester)) ? `Semester ${String(subject.semester).replace(/\D/g, '')}` : `Semester ${subject.semester}`
                  ) : 'Unassigned'}
                </span>
                {syllabus?.noCredit && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                    {syllabus.noCredit} Credits
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold leading-tight">{subject.code}: {subject.name}</h2>
            </div>
          </div>
        </div>

        {/* Modal Sub-Nav */}
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 flex gap-2 pt-2 shrink-0">
          <button
            onClick={() => setModalTab('info')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${modalTab === 'info'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Information & Description
          </button>
          <button
            onClick={() => setModalTab('sessions')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${modalTab === 'sessions'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Roadmap ({syllabus?.sessions?.length || 0} Session)
          </button>
          <button
            onClick={() => setModalTab('clos')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${modalTab === 'clos'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            CLO List ({syllabus?.clos?.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {modalTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Code</label>
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-base">{subject.code}</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Status</label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">Subject Description</label>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {syllabus?.description || subject.description || <span className="italic text-slate-400">No detailed description.</span>}
                </div>
              </div>

              {syllabus?.tools && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">Tools & Software</label>
                  <div className="flex flex-wrap gap-2">
                    {syllabus.tools.map((t: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 rounded-lg border border-brand-200 dark:border-brand-800 text-xs font-bold">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {modalTab === 'sessions' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search topics, lessons..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[350px] overflow-y-auto custom-scrollbar border rounded-xl">
                {filteredSessions.map((s: any, idx: number) => (
                  <div key={idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                          Session {s.session}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">{s.topic}</span>
                      </div>
                      {s.studentTasks && (
                        <p className="text-slate-500 text-[11px] leading-relaxed">{s.studentTasks}</p>
                      )}
                    </div>
                    {s.cloudinaryUrl && (
                      <a
                        href={s.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-brand-600 hover:bg-brand-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Download size={12} /> Slide
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {modalTab === 'clos' && (
            <div className="space-y-3">
              {syllabus?.clos?.map((c: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-600 dark:text-brand-400">{c.cloName}</span>
                    <span className="font-mono text-slate-400">{c.loDetails}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.cloDetails}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewFullPage}
            className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 text-xs font-bold"
          >
            Open detailed syllabus page →
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-slate-700 dark:text-slate-300"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={onEdit}
              className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Edit2 size={14} /> Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
