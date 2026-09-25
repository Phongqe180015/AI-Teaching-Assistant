import { z } from 'zod'

export const CreateExamSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  duration: z.coerce.number().optional(),
  dueAt: z.string().optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().optional(),
  weightPercentage: z.coerce.number().optional(),
  classId: z.string().optional(),
  classIds: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean)
    }
    return val || []
  }),
  sendNotification: z.preprocess((val) => {
    if (val === undefined) return undefined;
    return val === 'true' || val === true;
  }, z.boolean().optional()),
  latePenaltyType: z.enum(['NONE', 'DAILY_POINTS', 'DAILY_PERCENT', 'FLAT_POINTS']).optional().default('NONE'),
  latePenaltyValue: z.coerce.number().optional(),
  maxLatePenalty: z.coerce.number().optional(),
  allowLateSubmission: z.coerce.boolean().optional().default(true),
}).transform(data => {
  if (data.classId && (!data.classIds || data.classIds.length === 0)) {
    data.classIds = [data.classId]
  }
  return data
})

export type CreateExamRequestDtoType = z.infer<typeof CreateExamSchema>

export class CreateExamRequestDto {
  constructor(public readonly data: CreateExamRequestDtoType) {}

  static from(body: unknown): CreateExamRequestDto {
    return new CreateExamRequestDto(CreateExamSchema.parse(body))
  }
}

export const UpdateExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  weightPercentage: z.coerce.number().optional(),
  latePenaltyType: z.enum(['NONE', 'DAILY_POINTS', 'DAILY_PERCENT', 'FLAT_POINTS']).optional(),
  latePenaltyValue: z.coerce.number().optional(),
  maxLatePenalty: z.coerce.number().optional(),
  allowLateSubmission: z.coerce.boolean().optional(),
})

export type UpdateExamRequestDtoType = z.infer<typeof UpdateExamSchema>

export class UpdateExamRequestDto {
  constructor(public readonly data: UpdateExamRequestDtoType) {}

  static from(body: unknown): UpdateExamRequestDto {
    return new UpdateExamRequestDto(UpdateExamSchema.parse(body))
  }
}

export class ExamResponseDto {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly type: string,
    public readonly status: string,
    public readonly subjectId: string | null,
    public readonly maxScore: number | null,
    public readonly dueAt: number | null,
    public readonly due: string | null,
    public readonly createdAt: string | null,
    public readonly classes: string[] | null,
    public readonly subjectName?: string | null,
    public readonly lecturer?: string | null,
    public readonly lecturerAvatar?: string | null,
    public readonly attachments?: { id: string, fileName: string, fileUrl: string, fileType: string }[] | null,
    public readonly rubrics?: any[] | null,
    public readonly weightPercentage?: number | null,
    public readonly latePenaltyType?: string | null,
    public readonly latePenaltyValue?: number | null,
    public readonly maxLatePenalty?: number | null,
    public readonly allowLateSubmission?: boolean | null
  ) {}

  static from(exam: any): ExamResponseDto {
    const dueValue = exam.dueDate || exam.DueDate;
    const weightPct = exam.weightPercentage ?? (exam.WeightPercentage ? Number(exam.WeightPercentage) : 10);
    
    // Parse rubrics from ExamSection or AI Generated Rubrics
    let rubrics = null;
    if (exam.aiRubrics && exam.aiRubrics.length > 0) {
      rubrics = exam.aiRubrics;
    } else if (exam.ExamSection && Array.isArray(exam.ExamSection) && exam.ExamSection.length > 0) {
      rubrics = exam.ExamSection.flatMap((section: any) => {
        if (!section.RubricRule || !Array.isArray(section.RubricRule)) return [];
        return section.RubricRule.map((rule: any) => {
          return {
            id: rule.Id || rule.id,
            description: rule.Description || rule.description,
            maxPoints: rule.MaxPoints || rule.maxPoints,
            criteria: (rule.RubricCriterion || []).map((c: any) => ({
              id: c.Id || c.id,
              description: c.Description || c.description,
              maxPoints: c.MaxPoints || c.maxPoints
            }))
          };
        });
      });
    }

    return new ExamResponseDto(
      exam.Id || exam.id,
      exam.Title || exam.title,
      exam.Description || exam.description,
      (exam.ExamType || exam.type)?.toLowerCase() ?? 'assignment',
      (exam.Status || exam.status)?.toLowerCase() ?? 'draft',
      exam.SubjectId || exam.subjectId,
      exam.TotalPoints || exam.totalPoints,
      exam.Duration || exam.duration,
      dueValue ? new Date(dueValue).toISOString() : null,
      exam.startDate ? new Date(exam.startDate).toISOString() : null,
      exam.classes || null,
      exam.subjectName ? `${exam.subjectCode || ''} - ${exam.subjectName}` : null,
      exam.lecturer || null,
      exam.lecturerAvatar || null,
      exam.ExamAttachment ? exam.ExamAttachment.map((a: any) => ({
        id: a.Id || a.id,
        fileName: a.FileName || a.fileName,
        fileUrl: a.FileUrl || a.fileUrl,
        fileType: a.FileType || a.fileType
      })) : null,
      rubrics,
      weightPct,
      exam.LatePenaltyType || exam.latePenaltyType || 'NONE',
      exam.LatePenaltyValue !== undefined && exam.LatePenaltyValue !== null ? Number(exam.LatePenaltyValue) : (exam.latePenaltyValue !== undefined ? Number(exam.latePenaltyValue) : null),
      exam.MaxLatePenalty !== undefined && exam.MaxLatePenalty !== null ? Number(exam.MaxLatePenalty) : (exam.maxLatePenalty !== undefined ? Number(exam.maxLatePenalty) : null),
      exam.AllowLateSubmission ?? exam.allowLateSubmission ?? true
    )
  }
}
