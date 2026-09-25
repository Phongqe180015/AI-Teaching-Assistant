import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Save, ArrowLeft, Plus, Trash2, FileText } from 'lucide-react'

export function LecturerAssignmentRubric() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [criteria, setCriteria] = useState<{ id: string, description: string, maxPoints: number }[]>([
    { id: crypto.randomUUID(), description: '', maxPoints: 10 }
  ])

  const handleAddCriterion = () => {
    setCriteria([...criteria, { id: crypto.randomUUID(), description: '', maxPoints: 0 }])
  }

  const handleRemoveCriterion = (idx: number) => {
    setCriteria(criteria.filter((_, i) => i !== idx))
  }

  const handleCriterionChange = (idx: number, field: string, value: any) => {
    const newCriteria = [...criteria]
    newCriteria[idx] = { ...newCriteria[idx], [field]: value }
    setCriteria(newCriteria)
  }

  const handleSave = async () => {
    if (!id) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      const data = {
        description: 'Custom Rubric',
        maxPoints: criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0),
        criteria: criteria.map(c => ({
          description: c.description,
          maxPoints: Number(c.maxPoints) || 0
        }))
      }
      
      formData.append('data', JSON.stringify(data))
      if (file) {
        formData.append('file', file)
      }

      await api.saveExamRubric(id, formData)
      alert(t('lc.ar.saved'))
      navigate(-1)
    } catch (error: any) {
      alert(error.message || t('lc.ar.save_failed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 p-1 sm:p-4 min-h-screen max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="shrink-0 p-2">
          <ArrowLeft size={16} />
        </Button>
        <PageHeader 
          title={t('lc.ar.title')}
          breadcrumbs={[{ label: t('lc.ar.crumb_classes'), path: '/lecturer/classes' }, { label: t('lc.ar.crumb_rubric') }]}
        />
      </div>

      <div className="grid gap-6">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center gap-2 mb-4 text-brand-700">
            <FileText size={20} />
            <h3 className="font-bold">{t('lc.ar.step1')}</h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              {t('lc.ar.step1_desc')}
            </p>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-700">{t('lc.ar.step2')}</h3>
            <Button size="sm" variant="outline" onClick={handleAddCriterion} className="gap-2">
              <Plus size={16} /> {t('lc.ar.add_criterion')}
            </Button>
          </div>

          <div className="space-y-4">
            {criteria.map((c, idx) => (
              <div key={c.id} className="flex gap-4 items-start p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1">
                  <Input 
                    label={t('lc.ar.criterion', { n: idx + 1 })}
                    placeholder={t('lc.ar.criterion_placeholder')}
                    value={c.description}
                    onChange={(e) => handleCriterionChange(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input 
                    type="number"
                    label={t('lc.ar.max_score')}
                    value={c.maxPoints.toString()}
                    onChange={(e) => handleCriterionChange(idx, 'maxPoints', e.target.value)}
                  />
                </div>
                <div className="pt-7">
                  <Button variant="ghost" className="text-red-500 p-2" onClick={() => handleRemoveCriterion(idx)} disabled={criteria.length === 1}>
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>{t('lc.ar.cancel')}</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-brand-600 hover:bg-brand-700 text-white gap-2">
            <Save size={16} />
            {isSaving ? t('lc.ar.saving') : t('lc.ar.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
