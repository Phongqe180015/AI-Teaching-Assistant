import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, UserCircle, KeyRound, Mail, Camera, Loader2, Shield, GraduationCap } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { api, type ClassRow } from '@/lib/api'

export function Profile() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  // Tài khoản import vào bằng mật khẩu tạm → LoginPage đẩy về đây kèm ?forcePasswordChange=1
  const mustChangePassword = params.get('forcePasswordChange') === '1' || !!user?.requirePasswordChange

  // Giảng viên và Sinh viên: danh sách lớp/môn đang dạy hoặc đang học
  const [userClasses, setUserClasses] = useState<ClassRow[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  useEffect(() => {
    if (user?.role !== 'lecturer' && user?.role !== 'student') return
    let alive = true
    setClassesLoading(true)
    api.getClasses(1, 100)
      .then(res => { if (alive) setUserClasses(res || []) })
      .catch(() => { if (alive) setUserClasses([]) })
      .finally(() => { if (alive) setClassesLoading(false) })
    return () => { alive = false }
  }, [user?.role])

  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const passwordCardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mustChangePassword && passwordCardRef.current) {
      setTimeout(() => {
        passwordCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [mustChangePassword])

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || user.name || '',
        phone: (user as any).phone || '', // Assuming phone might be in AuthUser or we just leave empty
      })
      if (user.avatar) {
        setAvatarPreview(user.avatar) // The avatar URL is already absolute from Cloudinary or backend
      }
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('fullName', profile.fullName)
      formData.append('phone', profile.phone)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      await api.updateProfile(formData)
      alert('Profile updated successfully!')
      window.location.reload() // Reload to update context user
    } catch (e: any) {
      alert(e.message || 'Failed to save profile information')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword) {
      alert('Please enter your current password')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      alert('New password must be at least 6 characters')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New password does not match!')
      return
    }
    setSavingPassword(true)
    try {
      await api.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      alert('Password changed successfully!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      
      try {
        const stored = JSON.parse(localStorage.getItem('aita_user') || '{}')
        stored.requirePasswordChange = false
        localStorage.setItem('aita_user', JSON.stringify(stored))
      } catch (e) {}

      if (mustChangePassword && user) {
        window.location.href = `/${user.role}`
      }
    } catch (e: any) {
      alert(e.message || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'lecturer': return 'Lecturer'
      case 'student': return 'Student'
      default: return role
    }
  }

  return (
    <>
      <div className="space-y-8 p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
        <PageHeader
          title="Personal Profile"
          description="Manage your personal information and keep your account secure."
          breadcrumbs={[{ label: 'Profile' }]}
        />

        <div className="grid md:grid-cols-3 gap-8">

        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center bg-gradient-to-b from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 border-brand-100 dark:border-slate-800">
            <div
              className={`relative mb-4 ${user?.role === 'student' ? '' : 'group cursor-pointer'}`}
              onClick={() => user?.role !== 'student' && fileInputRef.current?.click()}
            >
              <div className="w-32 h-40 rounded-xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                      const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <span style={{ display: avatarPreview ? 'none' : 'block' }} className="text-4xl font-black">
                  {user.fullName?.charAt(0) || user.name?.charAt(0) || user.email?.charAt(0)}
                </span>
              </div>
              {user?.role !== 'student' && (
                <>
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white mb-1" size={24} />
                    <span className="text-xs text-white font-medium">Change photo</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName || user.name}</h3>
            
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Mail size={14} /> {user.email}
              </p>
              {user.phone && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  📞 {user.phone}
                </p>
              )}
              {user.studentCode && user.role === 'student' && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Student ID: <span className="font-bold text-slate-700 dark:text-slate-200">{user.studentCode}</span>
                </p>
              )}
              {user.lecturerCode && user.role === 'lecturer' && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Lecturer ID: <span className="font-bold text-slate-700 dark:text-slate-200">{user.lecturerCode}</span>
                </p>
              )}
            </div>

            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {getRoleLabel(user.role)}
            </div>
          </Card>

          {(user.role === 'lecturer' || user.role === 'student') && (
            <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
                <GraduationCap size={16} className="text-brand-600" /> {user.role === 'lecturer' ? 'Teaching assignments' : 'Enrolled classes'}
              </div>
              <div className="p-4 space-y-2 text-sm">
                {classesLoading && <p className="text-slate-500">Loading...</p>}
                {!classesLoading && userClasses.length === 0 && (
                  <p className="text-slate-500">{user.role === 'lecturer' ? 'No assigned classes yet.' : 'No enrolled classes yet.'}</p>
                )}
                {!classesLoading && userClasses.map((cls) => {
                  const semesterLabel = typeof cls.semester === 'string'
                    ? cls.semester
                    : (cls.semester as any)?.name || (cls.semester as any)?.code || 'Unknown semester'
                  const subjectLabel = typeof cls.subject === 'object' && cls.subject
                    ? (cls.subject.code || cls.subject.name)
                    : cls.subject || 'Unknown subject'
                  return (
                    <div key={cls.id} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{subjectLabel || cls.name || cls.code}</p>
                        <p className="text-xs text-slate-500">Class {cls.code}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {semesterLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
              <Shield size={16} className="text-brand-600" /> Account status
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">System role:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{user.role.toUpperCase()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">

          {/* Profile Form */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="text-brand-500 w-5 h-5 ml-1" />
                <CardHeader title="General Information" />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                {savingProfile ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : <><Save size={16} className="mr-2" /> Save changes</>}
              </Button>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-5">
              <Input
                label="Full name"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
              <Input
                label="System email (cannot be changed)"
                value={user.email}
                disabled
              />
              <Input
                label="Phone number"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </Card>

          {/* Password Form */}
          <Card ref={passwordCardRef} className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="text-amber-500 w-5 h-5 ml-1" />
                <CardHeader title="Change Password" />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword} size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-900/30">
                {savingPassword ? <><Loader2 size={16} className="animate-spin mr-2" /> Updating...</> : 'Update password'}
              </Button>
            </div>
            <div className="p-6 space-y-4 max-w-md">
              {mustChangePassword && (
                <div className="p-3 mb-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400 flex items-start gap-3">
                  <Shield size={18} className="shrink-0 mt-0.5" />
                  <p>Your account is using a temporary password. Please change it to keep your account secure.</p>
                </div>
              )}
              <Input
                type="password"
                label="Current password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              />
              <Input
                type="password"
                label="New password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <Input
                type="password"
                label="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
          </Card>

        </div>
      </div>
    </div>
    </>
  )
}
