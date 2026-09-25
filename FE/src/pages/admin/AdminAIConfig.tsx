import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api } from '@/lib/api'
import { Save, Bot, Settings2 } from 'lucide-react'

export function AdminAIConfig() {
  const [config, setConfig] = useState({
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2048,
    apiKey: '',
    autoGradeEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAIConfig()
      if (data) {
        setConfig((prev) => ({ ...prev, ...data }))
      }
    } catch (e: any) {
      setError(e.message || 'Error loading AI config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateAIConfig(config)
      alert('AI config updated successfully!')
    } catch (e: any) {
      alert(e.message || 'Error saving AI config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <div className="space-y-8 p-1 sm:p-4 max-w-4xl mx-auto animate-in fade-in">
      <PageHeader 
        title="AI Configuration" 
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'AI Configuration' }]} 
        actions={
          <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-2 px-6">
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        }
      />

      <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
          <Settings2 className="text-slate-500 w-5 h-5 ml-1" />
          <CardHeader title="Artificial Intelligence System Parameters" />
        </div>

        <div className="p-6 space-y-8">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Bot size={18} /> Language Model
              </h4>
              <Select 
                label="AI Model used"
                options={[
                  { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash (High)' },
                  { value: 'gemini-1.5-flash', label: 'Google Gemini 1.5 Flash' },
                  { value: 'gemini-2.0-flash', label: 'Google Gemini 2.0 Flash' },
                  { value: 'gemini-1.5-pro', label: 'Google Gemini 1.5 Pro' },
                  { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
                  { value: 'gpt-4-turbo', label: 'OpenAI GPT-4 Turbo' },
                  { value: 'gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' },
                  { value: 'claude-3-opus', label: 'Anthropic Claude 3 Opus' },
                ]}
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              />
              
              <Input 
                label="API Key" 
                type="password"
                placeholder="Enter secret API key..."
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Settings2 size={18} /> Text Generation Parameters
              </h4>
              
              <Input 
                label="Temperature (0.0 - 2.0)" 
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.temperature.toString()}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
              />

              <Input 
                label="Max Tokens" 
                type="number"
                step="100"
                value={config.maxTokens.toString()}
                onChange={(e) => setConfig({ ...config, maxTokens: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={config.autoGradeEnabled}
                  onChange={(e) => setConfig({ ...config, autoGradeEnabled: e.target.checked })}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${config.autoGradeEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${config.autoGradeEnabled ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Enable AI auto-grading</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">The system will automatically call AI for preliminary grading when students submit assignments</div>
              </div>
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}
