import type { ReactNode } from 'react'

export type UserRole = 'admin' | 'lecturer' | 'student'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
  badge?: string
  category?: string
}

export interface BreadcrumbItem {
  label: string
  path?: string
  /** In-page navigation for drill-down views that have no route of their own. */
  onClick?: () => void
}

export interface StatMetric {
  id: string
  label: string
  value: string | number
  hint?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: any
  status?: 'up' | 'down' | 'warning'
}

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

export interface TabItem {
  id: string
  label: string
}

export interface FilterOption {
  value: string
  label: string
}

export interface Option {
  value: string
  label: string
}

// --- Grading Types ---
export interface IoTestCaseEvidence {
  caseId: string;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  timedOut: boolean;
}

export interface HttpStep {
  method: string;
  url: string;
  status: number;
  requestBody?: any;
  responseBody?: any;
  assertions?: Array<{
    assertion: string;
    passed: boolean;
    actual: any;
  }>;
}

export interface CodeSnippetEvidence {
  codeSnippet: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  explanation?: string;
}

export interface RuleEvidence {
  snippets?: CodeSnippetEvidence[];
  codeSnippet?: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  httpSteps?: HttpStep[];
  screenshotBase64?: string;
  explanation?: string;
  ioTestCases?: IoTestCaseEvidence[];
  studentText?: string;
  extractedImages?: any[];
  hybridBreakdown?: {
    codePct: number;
    probePct?: number;
    visionPct?: number;
    textPct?: number;
  };
  sqlTestCases?: any[];
}

export interface ScoreRule {
  name: string;
  description?: string;
  passed: boolean;
  score: number;
  maxScore: number;
  details?: string;
  severity?: string;
  category?: string;
  recommendation?: string;
  evidence?: RuleEvidence;
}

export interface BuildResult {
  success: boolean;
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  submissionId: string;
  assignmentId?: string;
  score: number;
  maxScore: number;
  rules: ScoreRule[];
  failedRules: ScoreRule[];
  manualReviewNotes?: string[];
  overallFeedback?: string;
  assessedAt?: string;
  isPublished?: boolean;
  studentFeedback?: string;
  error?: string;
}

export interface RubricRule {
  id: string;
  title: string;
  name?: string;
  description: string;
  category: string;
  weight: number;
  scoringStrategy: string;
  tags?: string[];
  requiredEvidence?: any[];
  criteria?: any[];
}

export interface RubricDefinition {
  id: string;
  assignmentId: string;
  title: string;
  totalWeight: number;
  passThreshold: number;
  rules: RubricRule[];
}

export interface PublishedAssignment {
  id: string;
  version: string;
  blueprintId: string;
  metadata: {
    title: string;
    description: string;
    projectType: string;
  };
  rubric: RubricDefinition;
  testSuites: any;
}

