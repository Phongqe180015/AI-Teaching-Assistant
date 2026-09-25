import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { Send, BellRing, Loader2, CheckCircle2, Users, GraduationCap, BookOpen } from 'lucide-react'

export function AdminNotifications() {
  const [form, setForm] = useState({ title: '', message: '', targetRole: 'ALL', type: 'SYSTEM' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleBroadcast = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      setErrorMsg('Please enter both title and message.')
      return
    }
    
    setIsSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')
    
    try {
      const res = await api.broadcastNotification(form) as any
      setSuccessMsg(`Notification broadcasted successfully! Sent to ${res.recipientCount} users.`)
      setForm({ ...form, title: '', message: '' })
      
      setTimeout(() => setSuccessMsg(''), 5000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send notification')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Broadcast System Notification"
        breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Notifications' }]}
      />

      <Card className="overflow-hidden border border-slate-100 shadow-md bg-white">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex items-center gap-2">
          <BellRing className="text-brand-500 w-5 h-5 ml-2" />
          <CardHeader title="Compose New Notification" />
        </div>

        <div className="p-6 space-y-6">
          {successMsg && (
            <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="text-emerald-500 mt-0.5" size={18} />
              <p className="font-medium text-sm">{successMsg}</p>
            </div>
          )}
          
          {errorMsg && (
            <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
              <p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input 
                label="Notification Title" 
                placeholder="E.g. System Maintenance Schedule" 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
              />
            </div>
            
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Target Audience (3 Roles)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'ALL',
                    label: 'Everyone (All Roles)',
                    sublabel: 'Send to all active Lecturers and Students',
                    icon: Users,
                    color: 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400',
                    activeBorder: 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/30'
                  },
                  {
                    value: 'LECTURER',
                    label: 'Lecturers Only',
                    sublabel: 'Send to all teaching staff & lecturers',
                    icon: GraduationCap,
                    color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400',
                    activeBorder: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/70 dark:bg-blue-900/30'
                  },
                  {
                    value: 'STUDENT',
                    label: 'Students Only',
                    sublabel: 'Send to all enrolled students',
                    icon: BookOpen,
                    color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400',
                    activeBorder: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/70 dark:bg-emerald-900/30'
                  }
                ].map((role) => {
                  const RoleIcon = role.icon
                  const isSelected = form.targetRole === role.value
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setForm({ ...form, targetRole: role.value })}
                      className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? role.activeBorder
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#151821]'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg shrink-0 border ${role.color}`}>
                        <RoleIcon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{role.label}</p>
                          {isSelected && <CheckCircle2 size={16} className="text-brand-600 dark:text-brand-400 shrink-0 ml-1" />}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{role.sublabel}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            
            <Select 
              label="Notification Type" 
              options={[
                { value: 'SYSTEM', label: 'System Notification' },
                { value: 'MAINTENANCE', label: 'Maintenance' },
                { value: 'REMINDER', label: 'Reminder' },
                { value: 'ALERT', label: 'Emergency Alert' }
              ]}
              value={form.type} 
              onChange={(e) => setForm({ ...form, type: e.target.value })} 
            />
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Detailed Message</label>
              <Textarea 
                placeholder="Enter detailed message..." 
                value={form.message} 
                onChange={(e) => setForm({ ...form, message: e.target.value })} 
                rows={6} 
                className="w-full rounded-md border border-slate-300 p-3 text-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button
              className="px-6 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium flex items-center gap-2"
              onClick={handleBroadcast}
              disabled={isSubmitting}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <><Send size={16} /> Broadcast Notification</>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
