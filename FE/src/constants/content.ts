export const PRODUCT_PILLARS = [
  {
    id: 'lecturer',
    title: 'Lecturer Web Dashboard',
    subtitle: 'Lecturer Portal',
    description:
      'Manage classes, generate AI assignments, review content, support grading, and track student progress.',
    features: [
      'Class and subject management',
      'Create and edit AI assignments',
      'Grading and feedback',
      'Learning reports',
    ],
  },
  {
    id: 'student',
    title: 'Student Learning Portal',
    subtitle: 'Student Portal',
    description:
      'Access assignments, submit source code, receive AI feedback, and track personal progress.',
    features: [
      'Receive and submit assignments online',
      'Source code submission',
      'Detailed AI feedback',
      'Skill improvement recommendations',
    ],
  },
  {
    id: 'ai',
    title: 'AI Engine',
    subtitle: 'Artificial Intelligence Engine',
    description:
      'Generate assignments, support assessment, and provide personalized learning feedback — reviewed by lecturers before publishing.',
    features: [
      'Exercise Generation AI',
      'AI-assisted Assessment',
      'Learning Feedback AI',
      'Difficulty tuning',
    ],
  },
]

export const AI_MODULES = [
  {
    id: 'exercise-gen',
    name: 'Exercise Generation AI',
    description: 'Create quizzes, coding tasks, group projects, and tune difficulty levels.',
    status: 'ready' as const,
  },
  {
    id: 'assessment',
    name: 'AI-assisted Assessment',
    description: 'Grade quizzes, analyze code, evaluate group work, and assess member contributions.',
    status: 'ready' as const,
  },
  {
    id: 'feedback',
    name: 'Learning Feedback AI',
    description: 'Provide review suggestions, code comments, advanced guidance, and learning performance analysis.',
    status: 'ready' as const,
  },
]

export const HOME_FEATURES = [
  {
    title: 'Reduce Lecturer Workload',
    description: 'Automate assignment creation, preliminary grading, and report aggregation.',
    icon: 'Zap',
  },
  {
    title: 'Fast Feedback',
    description: 'Students receive feedback in 40–60 seconds (depending on AI configuration).',
    icon: 'Clock',
  },
  {
    title: 'Deep Assessment',
    description: 'Beyond test cases: evaluates style, logic, performance, and teamwork.',
    icon: 'Code2',
  },
  {
    title: 'Personalization',
    description: 'Analyze weak points and recommend suitable review content.',
    icon: 'Target',
  },
]
