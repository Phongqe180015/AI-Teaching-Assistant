import { z } from 'zod'

/**
 * Class validation schemas
 */
export const createClassSchema = z.object({
  code: z.string().min(1, 'Mã lớp không được trống'),
  name: z.string().min(2, 'Tên lớp phải có ít nhất 2 ký tự'),
  subject: z.string().optional(),
  semester: z.string().optional(),
  campus: z.string().optional(),
  schedule: z.string().optional(),
  lecturerId: z.string().min(1, 'Vui lòng chọn giảng viên'),
})

export type CreateClassFormData = z.infer<typeof createClassSchema>
