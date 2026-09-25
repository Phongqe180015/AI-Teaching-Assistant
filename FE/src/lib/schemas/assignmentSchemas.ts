import { z } from 'zod'

/**
 * Assignment validation schemas
 */
export const createAssignmentSchema = z.object({
  classId: z.string().min(1, 'Vui lòng chọn lớp'),
  title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự'),
  description: z.string().optional(),
  type: z.enum(['QUIZ', 'CODING', 'GROUP']),
  dueAt: z.string().optional(),
  maxScore: z.number().min(0, 'Điểm tối đa phải ≥ 0').default(10),
  content: z.string().optional(),
})

export type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>
