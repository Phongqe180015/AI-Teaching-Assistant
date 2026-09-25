import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ErrorState } from '@/components/common/ErrorState'
import { api } from '@/lib/api'
import { FileText, Bot, Activity } from 'lucide-react'
import { Tabs } from '@/components/ui/Tabs'

const TABS = [
  { id: 'system', label: 'System', icon: <Activity size={16} className="mr-2 inline-block"/> },
  { id: 'ai', label: 'AI Usage', icon: <Bot size={16} className="mr-2 inline-block"/> },
]

export function AdminAuditLogs() {
  const [tab, setTab] = useState('system')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'system') {
        const data = await api.getAuditLogs()
        setLogs(Array.isArray(data) ? data : [])
      } else {
        const data = await api.getAIAuditLogs()
        setLogs(Array.isArray(data) ? data : [])
      }
    } catch (e: any) {
      setError(e.message || 'Error loading system logs')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const systemColumns = [
    { key: 'timestamp', header: 'Time', render: (row: any) => new Date(row.timestamp || row.createdAt || row.CreatedAt || Date.now()).toLocaleString() },
    { key: 'user', header: 'User', render: (row: any) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.user?.fullName || row.User?.FullName || row.user?.email || row.User?.Email || 'System'}</span> },
    { key: 'action', header: 'Action', render: (row: any) => <Badge variant="neutral">{row.action || row.Action || row.actionType || row.ActionType || 'Action'}</Badge> },
    { key: 'details', header: 'Details', render: (row: any) => <span className="text-slate-500 truncate max-w-xs block">{row.details || row.entityName || row.EntityName || row.NewValue || row.newValue || ''}</span> },
    { key: 'ip', header: 'IP Address', render: (row: any) => <span className="font-mono text-xs">{row.ip || row.ipAddress || row.IpAddress || '127.0.0.1'}</span> },
  ]

  const aiColumns = [
    { key: 'timestamp', header: 'Time', render: (row: any) => new Date(row.timestamp || row.createdAt || row.CreatedAt || Date.now()).toLocaleString() },
    { key: 'user', header: 'User', render: (row: any) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.user?.fullName || row.User?.FullName || row.user?.email || row.User?.Email || 'System'}</span> },
    { key: 'model', header: 'AI Model', render: (row: any) => <Badge variant="default" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">{row.model || row.modelUsed || row.ModelUsed}</Badge> },
    { key: 'action', header: 'Task', render: (row: any) => <span>{row.action || row.Action || row.actionType || row.ActionType || 'AI Task'}</span> },
    { key: 'tokens', header: 'Tokens', render: (row: any) => <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.tokens || row.promptTokens || row.PromptTokens || row.CompletionTokens || row.completionTokens || 0}</span> },
  ]

  return (
    <div className="space-y-8 p-1 sm:p-4 max-w-6xl mx-auto animate-in fade-in">
      <PageHeader 
        title="System Logs" 
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Audit Logs' }]} 
      />

      <Card padding="none" className="overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-800/20">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-slate-200/70 dark:bg-[#0f1117] dark:border-slate-800">
            <Tabs items={TABS} activeId={tab} onChange={setTab} />
          </div>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-12"><LoadingSpinner /></div>
          ) : error ? (
            <div className="p-6"><ErrorState message={error} onRetry={load} /></div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center">
              <FileText size={48} className="mb-4 opacity-20" />
              <p>No log data available.</p>
            </div>
          ) : (
            <DataTable 
              columns={tab === 'system' ? systemColumns : aiColumns} 
              data={logs}
              keyExtractor={(item: any) => item.id || Math.random().toString()}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
