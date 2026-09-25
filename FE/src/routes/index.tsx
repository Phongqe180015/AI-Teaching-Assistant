import { Routes, Route, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/layouts/PublicLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { HomePage } from '@/pages/home/HomePage'
import { AboutPage } from '@/pages/home/AboutPage'
import { FeaturesPage } from '@/pages/home/FeaturesPage'
import BatchDashboard from '@/pages/lecturer/grading/BatchDashboard'
import LiveJobPage from '@/pages/lecturer/grading/LiveJobPage'
import AssignmentsListPage from '@/pages/lecturer/grading/AssignmentsListPage'
import AssignmentUploadPage from '@/pages/lecturer/grading/AssignmentUploadPage'
import AssignmentPage from '@/pages/lecturer/grading/AssignmentPage'
import ResultPage from '@/pages/shared/grading/ResultPage'
import UploadPage from '@/pages/shared/grading/UploadPage'
import HistoryPage from '@/pages/shared/grading/HistoryPage'
import HubPage from '@/pages/shared/grading/HubPage'
import AssignmentRubricPage from '@/pages/lecturer/grading/AssignmentRubricPage'
import { LoginPage } from '@/pages/LoginPage'

import { ADMIN_NAV, LECTURER_NAV, STUDENT_NAV } from '@/constants/navigation'
import { AdminOverview } from '@/pages/admin/AdminOverview'
import { AdminUsers } from '@/pages/admin/AdminUsers'
import { AdminClasses } from '@/pages/admin/AdminClasses'
import { AdminSubjects } from '@/pages/admin/AdminSubjects'
import { AdminSubjectDetail } from '@/pages/admin/AdminSubjectDetail'
import { AdminExams } from '@/pages/admin/AdminExams'
import { AdminAIConfig } from '@/pages/admin/AdminAIConfig'
import { AdminSettings } from '@/pages/admin/AdminSettings'
import { AdminAuditLogs } from '@/pages/admin/AdminAuditLogs'
import { AdminReports } from '@/pages/admin/AdminReports'
import { AdminNotifications } from '@/pages/admin/AdminNotifications'
import { Profile } from '@/pages/profile/Profile'

import { LecturerOverview } from '@/pages/lecturer/LecturerOverview'
import { LecturerClasses } from '@/pages/lecturer/LecturerClasses'
import { LecturerClassDetail } from '@/pages/lecturer/LecturerClassDetail'
import { LecturerSubmissions } from '@/pages/lecturer/LecturerSubmissions'
import { LecturerSubjects } from '@/pages/lecturer/LecturerSubjects'
import { LecturerSubjectDetail } from '@/pages/lecturer/LecturerSubjectDetail'
import { LecturerAIRubric } from '@/pages/lecturer/LecturerAIRubric'
import { LecturerNotifications } from '@/pages/lecturer/LecturerNotifications'
import { PromptSubjectsList } from '@/pages/lecturer/prompt/PromptSubjectsList'
import { PromptListBySubject } from '@/pages/lecturer/prompt/PromptListBySubject'
import { PromptCreateEdit } from '@/pages/lecturer/prompt/PromptCreateEdit'

import { StudentOverview } from '@/pages/student/StudentOverview'
import { StudentAssignmentDetail } from '@/pages/student/StudentAssignmentDetail'
import { StudentSubjects } from '@/pages/student/StudentSubjects'
import { StudentCourses } from '@/pages/student/StudentCourses'
import { StudentClasses } from '@/pages/student/StudentClasses'
import { StudentClassDetail } from '@/pages/student/StudentClassDetail'
import { StudentSubjectDetail } from '@/pages/student/StudentSubjectDetail'
import { StudentNotifications } from '@/pages/student/StudentNotifications'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="features" element={<FeaturesPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <ErrorBoundary>
              <DashboardLayout
                navItems={ADMIN_NAV}
                role="admin"
                roleLabel="System Administrator"
                portalTitle="AITA Admin"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="classes" element={<AdminClasses />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="subjects/:id" element={<AdminSubjectDetail />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="ai-config" element={<AdminAIConfig />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="/lecturer"
        element={
          <ProtectedRoute allowedRole="lecturer">
            <ErrorBoundary>
              <DashboardLayout
                navItems={LECTURER_NAV}
                role="lecturer"
                roleLabel="Lecturer"
                portalTitle="AITA Lecturer"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<LecturerOverview />} />
        <Route path="classes" element={<LecturerClasses />} />
        <Route path="classes/:id" element={<LecturerClassDetail />} />
        <Route path="subjects" element={<LecturerSubjects />} />
        <Route path="subjects/:code" element={<LecturerSubjectDetail />} />
        <Route path="prompts" element={<PromptSubjectsList />} />
        <Route path="prompts/:subjectId" element={<PromptListBySubject />} />
        <Route path="prompts/:subjectId/create" element={<PromptCreateEdit />} />
        <Route path="prompts/:subjectId/edit/:promptId" element={<PromptCreateEdit />} />
        <Route path="rubric-generator" element={<LecturerAIRubric />} />
        <Route path="assignments/:id/submissions" element={<LecturerSubmissions />} />
        <Route path="notifications" element={<LecturerNotifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="grading/assignments/:id/submit" element={<BatchDashboard />} />
        <Route path="grading/live/:id" element={<LiveJobPage />} />
        <Route path="grading/assignments" element={<AssignmentsListPage />} />
        <Route path="grading/assignments/upload" element={<AssignmentUploadPage />} />
        <Route path="grading/assignments/:id" element={<AssignmentPage />} />
        <Route path="grading/assignments/:id/rubric" element={<AssignmentRubricPage />} />
        <Route path="grading/result/:id" element={<ResultPage />} />
        <Route path="grading/upload" element={<UploadPage />} />
        <Route path="grading/history" element={<HistoryPage />} />
        <Route path="grading/hub" element={<HubPage />} />
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <ErrorBoundary>
              <DashboardLayout
                navItems={STUDENT_NAV}
                role="student"
                roleLabel="Student"
                portalTitle="AITA Student"
              />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentOverview />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="courses/:code" element={<StudentSubjectDetail />} />
        <Route path="classes" element={<StudentClasses />} />
        <Route path="subjects" element={<StudentSubjects />} />
        <Route path="classes/:id" element={<StudentClassDetail />} />
        <Route path="assignments" element={<Navigate to="/student/courses" replace />} />
        <Route path="assignments/:id" element={<StudentAssignmentDetail />} />
        <Route path="grading/result/:id" element={<ResultPage />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}


