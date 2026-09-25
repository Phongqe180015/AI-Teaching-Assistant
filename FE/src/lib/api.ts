

export const AUTH_STORAGE_KEYS = {
  token: 'aita_token',
  refreshToken: 'aita_refresh_token',
  user: 'aita_user',
} as const

export function getStoredItem(key: string): string | null {
  return localStorage.getItem(key) || sessionStorage.getItem(key)
}

export function setStoredItem(key: string, value: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(key, value)
  } else {
    sessionStorage.setItem(key, value)
  }
}

export function removeStoredItem(key: string) {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

const BASE = (import.meta as any).env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message)
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: any) => void, reject: (reason?: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = getStoredItem(AUTH_STORAGE_KEYS.token)

  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh-token') {
    const refreshTokenStr = getStoredItem(AUTH_STORAGE_KEYS.refreshToken);
    if (refreshTokenStr) {
      if (isRefreshing) {
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: (newToken) => {
              // Retry with new token
              const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
              fetch(`${BASE}${path}`, { ...options, headers: retryHeaders })
                .then(r => r.json())
                .then(j => {
                  if (!j.success && j.statusCode >= 400) {
                    const retryErr = typeof j.error === 'string' ? j.error : j.error?.message;
                    reject(new ApiError(j.Message || j.message || retryErr || 'API error', j.statusCode, typeof j.error === 'object' ? j.error?.code : undefined))
                  }
                  else resolve(j.Data !== undefined ? j.Data : j.data)
                })
                .catch(reject)
            },
            reject
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${BASE}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refreshTokenStr })
        });

        const refreshData = await refreshRes.json().catch(() => ({}));
        if (!refreshRes.ok || refreshData.success === false) {
          throw new Error('Session expired');
        }

        const data = refreshData.Data !== undefined ? refreshData.Data : refreshData.data;

        const remember = !!localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);

        setStoredItem(AUTH_STORAGE_KEYS.token, data.token, remember);
        setStoredItem(AUTH_STORAGE_KEYS.refreshToken, data.refreshToken, remember);
        if (data.user) {
          setStoredItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user), remember);
        }

        token = data.token;
        processQueue(null, data.token);

        // Retry original request
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        res = await fetch(`${BASE}${path}`, { ...options, headers });
      } catch (err) {
        processQueue(err as Error, null);
        removeStoredItem(AUTH_STORAGE_KEYS.token);
        removeStoredItem(AUTH_STORAGE_KEYS.refreshToken);
        removeStoredItem(AUTH_STORAGE_KEYS.user);
        window.location.href = '/login';
        throw err;
      } finally {
        isRefreshing = false;
      }
    }
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false || json.statusCode >= 400) {
    // Extract error message: handle both `{ error: "string" }` and `{ error: { message: "..." } }` formats
    const errorField = json.error;
    const errorMsg = typeof errorField === 'string' ? errorField : errorField?.message;
    const errorCode = typeof errorField === 'object' ? errorField?.code : undefined;
    let msg = json.Message || json.message || errorMsg || res.statusText || 'API error';
    if (res.status === 429 || json.statusCode === 429 || String(msg).includes('429') || String(msg).includes('no body')) {
      msg = 'Hệ thống AI đang vượt giới hạn lượt gọi (Rate Limit 429). Vui lòng thử lại sau 5–10 giây.';
    }
    throw new ApiError(msg, json.statusCode || res.status, errorCode)
  }
  if (json.Data !== undefined) return json.Data as T;
  if (json.data !== undefined) return json.data as T;
  return json as T;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSubmissionRow(raw: any): SubmissionRow {
  const studentObj = raw?.student && typeof raw.student === 'object' ? raw.student : null
  const examObj = raw?.exam && typeof raw.exam === 'object' ? raw.exam : null
  const classObj = raw?.class && typeof raw.class === 'object' ? raw.class : null
  const fileObj = raw?.file && typeof raw.file === 'object' ? raw.file : null

  const normalizedAiScore = toNullableNumber(raw?.aiScore ?? raw?.totalScore)
  const normalizedScore = toNullableNumber(raw?.score ?? raw?.finalScore ?? raw?.totalScore)

  return {
    id: String(raw?.id ?? ''),
    assignmentId: raw?.assignmentId ?? raw?.examId ?? raw?.exam?.id ?? '',
    examId: raw?.examId ?? raw?.assignmentId ?? raw?.exam?.id ?? null,
    assignment: raw?.assignment ?? examObj?.title ?? null,
    classId: raw?.classId ?? classObj?.id ?? null,
    studentId: raw?.studentId ?? studentObj?.id ?? '',
    student: raw?.student ?? studentObj?.name ?? studentObj?.fullName ?? raw?.studentId ?? '',
    status: raw?.status ?? raw?.gradingStatus ?? 'pending',
    gradingStatus: raw?.gradingStatus ?? raw?.status ?? null,
    reviewStatus: raw?.reviewStatus ?? null,
    submittedAt: raw?.submittedAt ?? null,
    gradedAt: raw?.gradedAt ?? null,
    reviewedAt: raw?.reviewedAt ?? null,
    content: raw?.content ?? null,
    language: raw?.language ?? null,
    zipFileUrl: raw?.zipFileUrl ?? undefined,
    downloadUrl: raw?.downloadUrl ?? fileObj?.downloadUrl ?? raw?.zipFileUrl ?? undefined,
    filename: raw?.filename ?? fileObj?.filename ?? fileObj?.fileName ?? undefined,
    score: normalizedScore,
    aiScore: normalizedAiScore,
    totalScore: toNullableNumber(raw?.totalScore),
    finalScore: toNullableNumber(raw?.finalScore),
    rawScore: raw?.score ?? raw?.finalScore ?? raw?.totalScore ?? null,
    rawAiScore: raw?.aiScore ?? raw?.totalScore ?? null,
    latePenaltyAmount: toNullableNumber(raw?.latePenaltyAmount),
    isReopened: raw?.isReopened ?? false,
    reopenReason: raw?.reopenReason ?? null,
    aiFeedback: raw?.aiFeedback ?? null,
    instructorFeedback: raw?.instructorFeedback ?? null,
    studentFeedback: raw?.studentFeedback ?? null,
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; refreshToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  register: (body: { email: string; password: string; fullName: string; externalId?: string }) =>
    request<{ token: string; refreshToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then(res => {
      if (res.user?.role) res.user.role = res.user.role.toLowerCase() as any
      return res
    }),

  me: () => request<AuthUser>('/auth/me').then(u => {
    if (u?.role) u.role = u.role.toLowerCase() as any
    return u
  }),

  updateProfile: (data: FormData) => request<any>('/auth/profile', { method: 'PATCH', body: data }),
  dismissPasswordChange: () => request<void>('/auth/dismiss-password-change', { method: 'POST' }),
  changePassword: (body: unknown) => request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email: string) => request<void>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: { email: string, otp: string, newPassword: string }) => request<void>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  getStatsOverview: () => request<Record<string, string | number>>('/stats/overview'),
  getActivity: () => request<ActivityLog[]>('/stats/activity'),
  getSystemHealth: () => request<Record<string, { status: string }>>('/reports/health'),

  getUsers: (role = 'all', page = 1, limit = 10, search?: string) =>
    request<UserRow[]>(`/users?role=${role}&page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getUser: (id: string) => request<any>(`/users/${id}`),
  createUser: (body: CreateUserBody | FormData) =>
    request<UserRow>('/users', { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),

  getClasses: (page = 1, limit = 10) => request<ClassRow[]>(`/classes?page=${page}&limit=${limit}`),
  createClass: (body: CreateClassBody) =>
    request<ClassRow>('/classes', { method: 'POST', body: JSON.stringify(body) }),
  updateClass: (id: string, body: Partial<CreateClassBody>) =>
    request<ClassRow>(`/classes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteClass: (id: string) =>
    request<void>(`/classes/${id}`, { method: 'DELETE' }),
  getClassStudents: (classId: string) => request<StudentRow[]>(`/classes/${classId}/students`),
  enrollStudent: (classId: string, studentId: string) =>
    request<any>(`/classes/${classId}/enroll`, { method: 'POST', body: JSON.stringify({ studentId }) }),
  getClassCodes: (semesterCode?: string, subjectCode?: string) => {
    const params = new URLSearchParams();
    if (semesterCode) params.append('semesterCode', semesterCode);
    if (subjectCode) params.append('subjectCode', subjectCode);
    return request<{ classId: string, classCode: string, studentCount: number }[]>(`/classes/codes?${params.toString()}`);
  },
  getSubjectsBySemester: (semesterCode: string) => {
    const params = new URLSearchParams({ semesterCode });
    return request<{ Id: string, SubjectCode: string, SubjectName: string }[]>(`/classes/subjects?${params.toString()}`);
  },
  updateClassNote: (classId: string, note: string) =>
    request<ClassRow>(`/classes/${classId}/note`, { method: 'PATCH', body: JSON.stringify({ note }) }),

  getAssignments: (params?: Record<string, string>) => {
    const q = new URLSearchParams(params).toString()
    return request<AssignmentRow[]>(`/assignments${q ? `?${q}` : ''}`)
  },

  // Student Portal
  getStudentDashboard: () => request<any>('/student-portal/dashboard'),
  getStudentSubjects: (semester?: string) => request<any[]>(`/student-portal/subjects${semester ? `?semester=${encodeURIComponent(semester)}` : ''}`),
  getStudentClassDetail: (classId: string) => request<any>(`/student-portal/classes/${classId}`),
  getStudentAiHint: (submissionId: string, ruleScoreId: string) => request<any>(`/submissions/${submissionId}/ai-feedback?ruleScoreId=${ruleScoreId}`),

  // Class Announcements
  getClassAnnouncements: (classId: string) => request<any[]>(`/classes/${classId}/announcements`),
  postClassAnnouncement: (classId: string, content: string, title?: string) =>
    request<any>(`/classes/${classId}/announcements`, { method: 'POST', body: JSON.stringify({ content, title }) }),
  updateClassAnnouncement: (classId: string, announcementId: string, content: string, title?: string) =>
    request<any>(`/classes/${classId}/announcements/${announcementId}`, { method: 'PUT', body: JSON.stringify({ content, title }) }),
  deleteClassAnnouncement: (classId: string, announcementId: string) =>
    request<any>(`/classes/${classId}/announcements/${announcementId}`, { method: 'DELETE' }),

  getAssignment: (id: string) => request<AssignmentRow>(`/assignments/${id}`),
  createAssignment: (body: unknown) => {
    const isFormData = body instanceof FormData;
    return request<AssignmentRow>('/assignments', { method: 'POST', body: isFormData ? body : JSON.stringify(body) })
  },
  updateAssignment: (id: string, body: unknown) =>
    request<AssignmentRow>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateAllGradingStrategies: (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') =>
    request<any>('/grading/assignments/strategy/update-all', { method: 'PUT', body: JSON.stringify({ strategy }) }),

  getClassOptions: () => request<Option[]>(`/settings/options/classes`),
  getLecturerOptions: () => request<Option[]>(`/settings/options/lecturers`),

  // â”€â”€â”€ Admin: User CRUD â”€â”€â”€
  updateUser: (id: string, body: (Partial<CreateUserBody> & { status?: string, updatedClasses?: { classId: string, newClassCode: string, newSubjectCode?: string }[] }) | FormData) =>
    request<UserRow>(`/users/${id}`, { method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
  // One request for the whole selection — the server deletes sequentially so the
  // per-user transactions cannot deadlock against each other.
  bulkDeleteUsers: (ids: string[]) =>
    request<BulkDeleteUsersResult>(`/users/bulk-delete`, { method: 'POST', body: JSON.stringify({ ids }) }),
  toggleUserLock: (id: string, locked: boolean) =>
    request<UserRow>(`/users/${id}/lock`, { method: 'PATCH', body: JSON.stringify({ locked }) }),
  importUsers: (body: { users: ImportUserRow[] } | FormData) =>
    request<any>(`/users/import`, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  importStudentsExcel: (body: FormData) =>
    request<any>(`/users/import-students-excel`, { method: 'POST', body }),
  importLecturersExcel: (body: FormData) =>
    request<any>(`/users/import-lecturers-excel`, { method: 'POST', body }),
  importTeachingAssignmentsExcel: (body: FormData) =>
    request<any>(`/users/import-teaching-assignments-excel`, { method: 'POST', body }),

  // ─── Subjects CRUD ───
  getSubjects: (page = 1, limit = 10) => request<SubjectRow[]>(`/subjects?page=${page}&limit=${limit}`),
  getSubject: (id: string) => request<SubjectRow>(`/subjects/${id}`),
  createSubject: (body: CreateSubjectBody) =>
    request<SubjectRow>('/subjects', { method: 'POST', body: JSON.stringify(body) }),
  updateSubject: (id: string, body: Partial<CreateSubjectBody>) =>
    request<SubjectRow>(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSubject: (id: string) =>
    request<void>(`/subjects/${id}`, { method: 'DELETE' }),

  getSubjectStudents: async (subjectId: string, semesterId?: string, classId?: string, page: number = 1, limit: number = 10) => {
    const params = new URLSearchParams()
    if (semesterId) params.append('semesterId', semesterId)
    if (classId && classId !== 'all') params.append('classId', classId)
    params.append('page', page.toString())
    params.append('limit', limit.toString())

    return request<any>(`/subjects/${subjectId}/students?${params.toString()}`)
  },

  // â”€â”€â”€ Semesters CRUD â”€â”€â”€
  getSemesters: () => request<SemesterRow[]>(`/semesters`),
  createSemester: (body: CreateSemesterBody) =>
    request<SemesterRow>('/semesters', { method: 'POST', body: JSON.stringify(body) }),
  createSeason: (body: CreateSeasonBody) =>
    request<SemesterRow[]>('/semesters/season', { method: 'POST', body: JSON.stringify(body) }),
  updateSemester: (id: string, body: Partial<CreateSemesterBody>) =>
    request<SemesterRow>(`/semesters/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSemester: (id: string) =>
    request<void>(`/semesters/${id}`, { method: 'DELETE' }),

  getSemesterSubjects: (semesterId: string) => request<SubjectRow[]>(`/semesters/${semesterId}/subjects`),
  addSemesterSubjects: (semesterId: string, subjectIds: string[]) => request<void>(`/semesters/${semesterId}/subjects`, { method: 'POST', body: JSON.stringify({ subjectIds }) }),
  removeSemesterSubject: (semesterId: string, subjectId: string) => request<void>(`/semesters/${semesterId}/subjects/${subjectId}`, { method: 'DELETE' }),
  deleteSeason: (season: string) => request<void>(`/semesters/season/${encodeURIComponent(season)}`, { method: 'DELETE' }),
  activateSeason: (season: string) => request<{ season: string; isActive: boolean }>(`/semesters/season/${encodeURIComponent(season)}/activate`, { method: 'POST' }),
  getClassesBySubject: (semesterId: string, subjectId: string) => request<any[]>(`/semesters/${semesterId}/subjects/${subjectId}/classes`),

  // ── Prompts ───────────────────────────────────────────────────
  getPromptTemplates: (subjectId: string) => request<any[]>(`/prompts/subject/${subjectId}`, { cache: 'no-store' }),
  createPromptTemplate: (data: any) => request<any>('/prompts', { method: 'POST', body: JSON.stringify(data) }),
  updatePromptTemplate: (id: string, data: any) => request<any>(`/prompts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePromptTemplate: (id: string) => request<void>(`/prompts/${id}`, { method: 'DELETE' }),
  incrementPromptUsage: (id: string) => request<void>(`/prompts/${id}/increment-usage`, { method: 'POST' }),



  // â”€â”€â”€ Exams CRUD â”€â”€â”€
  getExams: (page = 1, limit = 10, subjectId?: string) => {
    let url = `/exams?page=${page}&limit=${limit}`;
    if (subjectId) url += `&classId=${subjectId}`;
    return request<ExamRow[]>(url);
  },
  getExam: (id: string) => request<ExamRow>(`/exams/${id}`),
  createExam: (body: CreateExamBody) =>
    request<ExamRow>('/exams', { method: 'POST', body: JSON.stringify(body) }),
  updateExam: (id: string, body: Partial<CreateExamBody>) =>
    request<ExamRow>(`/exams/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  // â”€â”€â”€ Submissions â”€â”€â”€
  getSubmissionHistory: async (params?: SubmissionListQuery) => {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    const rows = await request<any[]>(`/submissions${q ? `?${q}` : ''}`)
    return (rows || []).map(normalizeSubmissionRow)
  },
  async getSubmissions(params?: SubmissionListQuery) {
    const q = new URLSearchParams(params as Record<string, string>).toString()
    const rows = await request<any[]>(`/submissions${q ? `?${q}` : ''}`)
    return (rows || []).map(normalizeSubmissionRow)
  },
  getSubmissionDetail: async (id: string) => {
    const row = await request<any>(`/submissions/${id}`)
    return normalizeSubmissionRow(row)
  },
  async getSubmission(id: string) {
    const row = await request<any>(`/submissions/${id}`)
    return normalizeSubmissionRow(row)
  },
  async getSubmissionDownload(id: string) {
    const row = await request<any>(`/submissions/${id}`)
    const normalized = normalizeSubmissionRow(row)
    return {
      id: normalized.id,
      assignmentId: normalized.assignmentId,
      downloadUrl: normalized.downloadUrl ?? normalized.zipFileUrl ?? undefined,
      zipFileUrl: normalized.zipFileUrl ?? undefined,
      filename: normalized.filename ?? undefined,
      submittedAt: normalized.submittedAt,
    }
  },
  submitAssignment: (file: File | null, content: string, assignmentId: string) => {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('content', content)
    formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string, zipFileUrl: string, status: string }>('/submissions', {
      method: 'POST',
      body: formData,
    })
  },
  gradeSubmission: async (submissionId: string, body: any) => {
    const row = await request<any>(`/submissions/${submissionId}/grade`, { method: 'PATCH', body: JSON.stringify(body) })
    return normalizeSubmissionRow(row)
  },
  submitFeedback: (submissionId: string, feedback: string) =>
    request<void>(`/submissions/${submissionId}/feedback`, { method: 'POST', body: JSON.stringify({ feedback }) }),
  bulkPublishGrades: (assignmentId: string) =>
    request<{ success: boolean, count: number }>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  reopenSubmission: (body: {
    examId: string
    studentId: string
    classId?: string
    extendedDueDate: string
    penaltyMode?: 'SYSTEM_DEFAULT' | 'CUSTOM_RATE' | 'FLAT_AMOUNT' | 'WAIVE' | 'SCORE_CAP'
    customPenaltyRate?: number
    flatPenaltyAmount?: number
    scoreCap?: number
    reason?: string
  }) =>
    request<{ success: boolean; message: string; override: any }>('/submissions/reopen', { method: 'POST', body: JSON.stringify(body) }),

  // â”€â”€â”€ Grading & Rubric â”€â”€â”€
  startGradingSession: (assignmentId: string) =>
    request<{ sessionId: string }>('/grading/start', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  getRubricRules: () => request<any[]>('/rubric/rules'),

  // â”€â”€â”€ AI Features â”€â”€â”€
  generateExerciseAI: (body: { topic: string, difficulty: string, type: string }) =>
    request<any>('/ai/generate-exercise', { method: 'POST', body: JSON.stringify(body) }),
  generateRubricAI: (body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>('/ai/generate-rubric', {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },
  saveExamRubric: (examId: string, body: any) => {
    const isFormData = body instanceof FormData;
    return request<any>(`/rubrics/exams/${examId}`, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    })
  },
  saveAIAssignment: (body: any) =>
    request<AssignmentRow>('/ai/save-assignment', { method: 'POST', body: JSON.stringify(body) }),
  assessSubmissionAI: (submissionId: string) =>
    request<any>(`/ai/assess/${submissionId}`, { method: 'POST' }),
  getAIFeedback: (studentId: string) =>
    request<any>(`/ai/feedback/${studentId}`),
  getAIConfig: () =>
    request<any>('/ai/config'),
  updateAIConfig: (body: any) =>
    request<any>('/ai/config', { method: 'PUT', body: JSON.stringify(body) }),

  // â”€â”€â”€ Settings â”€â”€â”€
  getSettingsConfig: () => request<any>('/settings'),
  updateSettingsConfig: (body: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(body) }),

  // Notifications
  getNotifications: (page = 1, limit = 20) => request<any>(`/notifications?page=${page}&limit=${limit}`),
  markNotificationAsRead: (id: string) => request<void>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsAsRead: () => request<void>('/notifications/read-all', { method: 'PUT' }),
  deleteNotification: (id: string) => request<void>(`/notifications/${id}`, { method: 'DELETE' }),
  deleteAllNotifications: () => request<void>('/notifications/all', { method: 'DELETE' }),
  broadcastNotification: (body: any) => request<any>('/notifications/broadcast', { method: 'POST', body: JSON.stringify(body) }),

  // â”€â”€â”€ Audit Logs â”€â”€â”€
  getAuditLogs: () => request<any[]>('/audit/logs'),
  getAIAuditLogs: () => request<any[]>('/audit/ai-usage'),

  // â”€â”€â”€ Reports â”€â”€â”€
  getSystemReports: () => request<any>('/reports'),
  getHealthReports: () => request<any>('/reports/health'),

}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Type Definitions
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export interface AuthUser {
  id: string
  email: string
  fullName: string
  name: string
  role: 'admin' | 'lecturer' | 'student'
  status: string
  externalId?: string | null
  avatar?: string | null
  phone?: string
  lecturerCode?: string
  studentCode?: string
  // true khi tài khoản được tạo qua import — hệ thống ép đổi mật khẩu lần đầu đăng nhập
  requirePasswordChange?: boolean
}

export interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: string
  studentCode?: string
  lecturerCode?: string
  phone?: string
  avatar?: string
  lastLoginAt?: string
}

export interface BulkDeleteUsersResult {
  deleted: string[]
  /** Ids that were already gone — not an error, a repeated attempt is harmless. */
  skipped: string[]
  failed: Array<{ id: string; reason: string }>
  success: boolean
  message: string
}

export interface ImportUserRow {
  fullName: string
  email: string
  classCode?: string
  semesterCode?: string
  subjectCode?: string
  role: 'ADMIN' | 'LECTURER' | 'STUDENT'
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
}

export interface CreateUserBody {
  email: string
  password: string
  fullName: string
  role: string
  studentCode?: string
  lecturerCode?: string
  phone?: string
  avatar?: string | null
  classIds?: string[]
  externalId?: string
}

export interface ClassRow {
  id: string
  code: string
  name: string
  subject: string | { id: string; code: string; name: string }
  semester: string | { id: string; code: string }
  campus?: string
  schedule?: string
  lecturer?: AuthUser
  lecturers?: AuthUser[]
  studentCount?: number
  count?: number
  // Internal staff note â€” present only for ADMIN/LECTURER (BE omits it for students).
  note?: string | null
}

export interface CreateClassBody {
  code: string
  name: string
  subjectId: string
  semesterId?: string
  campus?: string
  schedule?: string
  lecturerId: string
}

export interface StudentRow {
  id?: string
  studentId: string
  name: string
  email: string
  avatar?: string
  progress: string
  grade: string
}

export interface AssignmentRow {
  id: string
  title: string
  description: string
  type: string
  class?: string
  classId: string
  dueAt: string
  due?: string | null
  status: string
  subjectId: string
  subjectName?: string | null
  lecturer?: string | null
  lecturerAvatar?: string | null
  createdAt?: string | null
  classes?: string[]
  maxScore?: number
  submitted?: number
  content?: unknown
  attachments?: {
    id: string
    fileName: string
    fileUrl: string
    fileType: string
  }[]
  rubrics?: {
    id: string
    description: string
    maxPoints: number
    criteria: {
      id: string
      description: string
      maxPoints: number
    }[]
  }[]
}

export interface SubmissionRow {
  id: string
  assignmentId: string
  examId?: string | null
  assignment?: string | null
  classId?: string | null
  student: string
  studentId: string
  submittedAt: string | null
  gradedAt?: string | null
  reviewedAt?: string | null
  content?: string | null
  language?: string | null
  filename?: string
  downloadUrl?: string
  zipFileUrl?: string
  status: string
  gradingStatus?: string | null
  reviewStatus?: string | null
  score?: number | null
  aiScore: number | string | null
  totalScore?: number | null
  finalScore?: number | null
  rawScore?: number | string | null
  rawAiScore?: number | string | null
  aiFeedback?: unknown | null
  instructorFeedback?: string | null
  studentFeedback?: string | null
  latePenaltyAmount?: number | null
  isReopened?: boolean
  reopenReason?: string | null
}

export interface SubmissionListQuery {
  assignmentId?: string
  examId?: string
  status?: string
}

export interface CreateSubmissionBody {
  assignmentId?: string
  examId?: string
  classId?: string
  content?: string
  zipFileUrl?: string
  language?: string
}

export interface AIReviewRow {
  id: string
  type: string
  title: string
  class: string
  createdAt: string
  status: string
}

export interface AIConfig {
  aiEndpoint: string
  aiModel: string
  aiTimeout: string
  aiStubMode: string
}

export interface ActivityLog {
  id: string
  action: string
  user: string
  createdAt: string
}

export interface Option {
  value: string
  label: string
}

export interface FeedbackRow {
  id: string
  title: string
  aiScore: number | null
  score: number | null
  feedback: unknown
  approved: boolean
}

export interface StudentProgress {
  gpa: number
  done: number
  rank: string
  streak: string
  history: { assignment: string; score: number | null; date: string | null }[]
}

export interface LearningData {
  skills: { topic: string; level: string; suggestion?: string | null }[]
  recommendations: { type: string; title: string }[]
}

export interface SubjectRow {
  id: string
  code: string
  name: string
  description?: string
  status?: string
  semester?: number
  credit?: number | null
  syllabusData?: string | null
  seasons?: string[]  // active seasons teaching this subject, e.g. ["Spring", "Fall"]
}

export interface CreateSubjectBody {
  code: string
  name: string
  description?: string
  semester?: number
  syllabusData?: string
}

export interface SemesterRow {
  id: string
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive: boolean
  classCount?: number
  subjectCount?: number
}

export interface CreateSemesterBody {
  code: string
  season?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface CreateSeasonBody {
  season: string
  startDate?: string
  endDate?: string
}

export interface ExamRow {
  id: string
  title: string
  subject: string
  duration?: number
  status: string
  createdAt?: string
}

export interface CreateExamBody {
  title: string
  subjectId: string
  duration?: number
  description?: string
}

export const gradingApi = {
  getAssignments: () => request<any[]>('/grading/assignments'),
  getTrashAssignments: () => request<any[]>('/grading/assignments/trash'),
  clearCache: () => request<void>('/grading/cache/clear', { method: 'POST' }),
  getAssignment: (id: string) => request<any>('/grading/assignments/' + id),
  updateAssignment: (id: string, data: any) => request<any>('/grading/assignments/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) => request<void>('/grading/assignments/' + id, { method: 'DELETE' }),
  restoreAssignment: (id: string) => request<void>('/grading/assignments/' + id + '/restore', { method: 'POST' }),
  hardDeleteAssignment: (id: string) => request<void>('/grading/assignments/' + id + '/hard-delete', { method: 'DELETE' }),
  bulkHardDeleteAssignments: (ids: string[]) => request<{ count: number }>('/grading/assignments/bulk-hard-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkRestoreAssignments: (ids: string[]) => request<{ count: number }>('/grading/assignments/bulk-restore', { method: 'POST', body: JSON.stringify({ ids }) }),
  publishSubmission: (id: string, data?: any) => request<any>('/grading/submissions/' + id + '/publish', {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }),
  unpublishSubmission: (id: string) => request<any>('/grading/submissions/' + id + '/unpublish', { method: 'POST' }),
  bulkPublishGrades: (assignmentId: string) =>
    request<{ success: boolean, count: number }>('/submissions/bulk-publish', { method: 'POST', body: JSON.stringify({ assignmentId }) }),
  detectDuplicateSubmissions: (assignmentId: string, threshold?: number) =>
    request<{
      assignmentId: string
      checkedCount: number
      failedCount: number
      failedSubmissionIds: string[]
      emptyCount: number
      threshold: number
      pendingCount?: number
      resolvedClustersCount?: number
      clusters: Array<{
        count: number
        pendingCount?: number
        isResolved?: boolean
        maxSimilarity: number
        allIdentical: boolean
        submissions: Array<{
          submissionId: string
          studentId: string | null
          studentName: string | null
          studentCode: string | null
          attemptNumber: number | null
          submittedAt: string | null
          zipFileUrl: string | null
          topSimilarity: number
          isPenalized?: boolean
          matchedWith?: Array<{
            submissionId: string
            studentName: string | null
            studentCode: string | null
            isPenalized: boolean
            similarity: number
          }>
        }>
        pairs: Array<{
          submissionIdA: string
          submissionIdB: string
          studentNameA: string | null
          studentNameB: string | null
          similarity: number
          identical: boolean
        }>
      }>
    }>(`/submissions/duplicates?assignmentId=${encodeURIComponent(assignmentId)}${threshold !== undefined ? `&threshold=${threshold}` : ''}`),
  applyDuplicatePenalty: (data: {
    assignmentId: string
    submissionIds: string[]
    penaltyType: 'NONE' | 'FLAT_POINTS' | 'PERCENT' | 'ZERO_SCORE'
    penaltyValue: number
    reason?: string
  }) =>
    request<{
      success: boolean
      updatedCount: number
      updatedSubmissions: Array<{
        id: string
        studentName: string | null
        oldScore: number | null
        newScore: number
        deductedPoints: number
      }>
    }>('/submissions/apply-duplicate-penalty', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSubmissionResult: (id: string, data: any) => request<any>('/grading/submissions/' + id + '/result', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  uploadAssignment: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<any>('/grading/assignments/upload', {
      method: 'POST',
      body: formData,
    })
  },

  extractText: (file: File, semester: string, subject: string, options?: RequestInit) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('semester', semester)
    formData.append('subject', subject)
    return request<{ text: any, documentImageKey: string | null }>('/grading/assignments/extract-text', {
      method: 'POST',
      body: formData,
      ...options
    })
  },

  generateContent: (prompt: string, semester: string, subject: string, options?: RequestInit & { pageImages?: string[] }) => request<{ markdown: string }>('/grading/assignments/generate-content', {
    method: 'POST',
    body: JSON.stringify({ prompt, semester, subject, pageImages: options?.pageImages }),
    ...options,
  }).then(res => res.markdown),

  parseRubric: (content: string, documentImageKey?: string | null, options?: RequestInit) => request<{ rubric: any, blueprint: any }>('/grading/assignments/parse-rubric', {
    method: 'POST',
    body: JSON.stringify({ content, documentImageKey }),
    ...options
  }),

  // `subject` is the subject code (e.g. "DBI202"). The backend uses it to settle projectType,
  // which decides how submissions are graded; without it the backend falls back to guessing
  // from the prompt text.
  parseRequirements: (content: string, documentImageKey?: string | null, subject?: string) => request<{ blueprint: any }>('/grading/assignments/parse-requirements', {
    method: 'POST',
    body: JSON.stringify({ content, documentImageKey, subject }),
  }).then(res => res.blueprint),

  generateRubric: (blueprint: any) => request<{ rubric: any }>('/grading/assignments/generate-rubric', {
    method: 'POST',
    body: JSON.stringify({ blueprint }),
  }).then(res => res.rubric),

  publishAssignment: (metadata: any, blueprint: any, rubric: any) => request<any>('/grading/assignments/publish', {
    method: 'POST',
    body: JSON.stringify({ metadata, blueprint, rubric }),
  }),

  updateAllGradingStrategies: (strategy: 'CONTINUOUS_QUEUE' | 'BATCH_POST_DEADLINE') => request<any>('/grading/assignments/strategy/update-all', {
    method: 'PUT',
    body: JSON.stringify({ strategy }),
  }),

  submitAssignment: (file: File | null, content: string, assignmentId: string) => {
    const formData = new FormData()
    if (file) formData.append('file', file)
    formData.append('content', content)
    formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string, zipFileUrl: string, status: string }>('/submissions', {
      method: 'POST',
      body: formData,
    })
  },

  submitProject: (file: File, assignmentId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ submissionId: string }>('/grading/submissions', {
      method: 'POST',
      body: formData,
    })
  },
  submitBatchProject: (files: File[], assignmentId?: string) => {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    if (assignmentId) formData.append('assignmentId', assignmentId)
    return request<{ jobs: any[] }>('/grading/submissions/upload-batch', {
      method: 'POST',
      body: formData,
    })
  },

  parseSqlKey: (formData: FormData) => {
    return request<any>('/grading/assignments/parse-sql-key', {
      method: 'POST',
      body: formData,
    })
  },

  updateAnswerKey: (assignmentId: string, formData: FormData) => {
    return request<any>(`/grading/assignments/${assignmentId}/update-answer-key`, {
      method: 'POST',
      body: formData,
    })
  },

  getSqlKeyUrl: (assignmentId: string) => {
    return `${(import.meta as any).env.VITE_API_URL || '/api'}/grading/assignments/${assignmentId}/sql-key?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`
  },

  gradeExistingSubmission: (submissionId: string) => {
    return request<{ submissionId: string, statusUrl: string }>('/grading/submissions/grade-existing', {
      method: 'POST',
      body: JSON.stringify({ submissionId }),
    })
  },

  gradeExistingBatch: (assignmentId: string) => {
    return request<{ jobs: any[] }>('/grading/submissions/grade-existing-batch', {
      method: 'POST',
      body: JSON.stringify({ assignmentId }),
    })
  },

  gradeSelectedBatch: (assignmentId: string, submissionIds: string[]) => {
    return request<{ jobs: any[] }>('/grading/submissions/grade-selected-batch', {
      method: 'POST',
      body: JSON.stringify({ assignmentId, submissionIds }),
    })
  },

  getBatchStatus: (ids: string[]) => {
    if (!ids || ids.length === 0) return Promise.resolve({ statuses: {} as Record<string, any> })
    return request<{ statuses: Record<string, any> }>('/grading/submissions/batch-status?ids=' + ids.join(','))
  },

  cancelBatch: (ids: string[]) => {
    if (!ids || ids.length === 0) return Promise.resolve({ success: true, cancelledCount: 0 })
    return request<{ success: boolean, cancelledCount: number }>('/grading/submissions/batch-cancel', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  subscribeToProgress: (
    submissionId: string,
    onProgress: (job: any) => void,
    onComplete: () => void,
    onError: (err: any) => void
  ) => {
    const token = getStoredItem(AUTH_STORAGE_KEYS.token)
    // EventSource doesn't support headers directly in browser API. 
    // Usually tokens for SSE are passed via query params.
    const url = '/api/grading/submissions/' + submissionId + '/stream?token=' + token
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data)
        if (job.error) {
          onError(new Error(job.error))
          eventSource.close()
          return
        }

        onProgress(job)

        if (job.state === 'completed') {
          eventSource.close()
          onComplete()
        } else if (job.state === 'failed') {
          eventSource.close()
          onError(new Error(job.error || 'Evaluation failed'))
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE Error', err)
      eventSource.close()
      onError(new Error('Connection to server lost.'))
    }

    return () => {
      eventSource.close()
    }
  },

  getSubmissionResult: (submissionId: string) => request<any>('/grading/submissions/' + submissionId + '/result'),

  submitFeedback: (submissionId: string, feedback: string) => request<{ success: boolean, feedback: string }>(`/submissions/${submissionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  }),

  cancelSubmission: (submissionId: string) => request<{ success: boolean }>('/grading/submissions/' + submissionId + '/cancel', { method: 'POST' }),

  getHistory: (assignmentId?: string, page: number = 1, limit: number = 10, search?: string, status?: string, scoreRange?: string, sort?: string, classId?: string) => {
    const params = new URLSearchParams();
    if (assignmentId) params.append('assignmentId', assignmentId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (scoreRange) params.append('scoreRange', scoreRange);
    if (sort) params.append('sort', sort);
    if (classId) params.append('classId', classId);

    return request<{ classes?: any[], history: any[], meta: { total: number, page: number, limit: number, totalPages: number } }>(`/grading/submissions/history?${params.toString()}`);
  },

  deleteHistory: (id: string) => request<void>('/grading/submissions/history/' + id, { method: 'DELETE' }),
  getSemesters: () => request<any[]>('/semesters').catch(() => []),

  downloadSubmission: async (submissionId: string, studentName?: string) => {
    const token = getStoredItem(AUTH_STORAGE_KEYS.token);
    const res = await fetch(`${BASE}/submissions/${submissionId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      let errMsg = 'Failed to download submission';
      try {
        const json = await res.json();
        errMsg = json.Message || json.message || errMsg;
      } catch (e) { }
      throw new ApiError(errMsg, res.status);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const disposition = res.headers.get('Content-Disposition');
    let filename = `${studentName || 'submission'}.zip`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
}

export const aiApi = {
  generatePrompt: (data: {
    name?: string
    topic?: string
    category?: string
    difficulty?: string
    subjectCode?: string
    additionalNotes?: string
  }) =>
    request<{ prompt: string }>('/ai/prompts/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refinePrompt: (data: { content: string }) =>
    request<{ prompt: string }>('/ai/prompts/refine', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}
