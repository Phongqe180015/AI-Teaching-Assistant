import { randomUUID } from 'crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { CreateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { Exam } from '../../domain/entities/exam.entity.js'
import type { SendAssignmentNotificationUseCase } from '../../../notifications/application/use-cases/send-assignment-notification.use-case.js'

export class CreateExamUseCase implements IUseCase<{ dto: CreateExamRequestDto; file?: Express.Multer.File; userId?: string }, ExamResponseDto> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly sendNotificationUseCase?: SendAssignmentNotificationUseCase
  ) { }

  async execute(input: { dto: CreateExamRequestDto; file?: Express.Multer.File; userId?: string }): Promise<ExamResponseDto> {
    const { data } = input.dto
    const file = input.file
    const examType = data.type === 'quiz' ? 'Quiz' : (data.type || 'Assignment')

    if (data.weightPercentage) {
      const existingExams = await this.examRepo.findMany({ subjectId: data.subjectId })
      const currentTotalWeight = existingExams.reduce((sum, exam) => {
        let weight = 0
        if (exam.weightPercentage) weight = Number(exam.weightPercentage)
        else if ((exam as any).aiGeneratedContent) {
          try {
            const parsed = JSON.parse((exam as any).aiGeneratedContent)
            if (parsed.weightPercentage) weight = Number(parsed.weightPercentage)
          } catch(e) {}
        }
        return sum + weight
      }, 0)

      if (currentTotalWeight + Number(data.weightPercentage) > 70) {
        throw new Error(`Tổng tỷ trọng điểm các bài Assignment/Lab không được vượt quá 70%. Tổng hiện tại là ${currentTotalWeight}%.`)
      }
    }

    const exam = Exam.create(
      randomUUID(),
      data.title,
      data.subjectId,
      examType as any,
      input.userId || 'system', // createdBy, ideally should be passed from AuthUser
      {
        description: data.description,
        totalPoints: data.maxScore ?? 10,
        weightPercentage: data.weightPercentage ?? 0,
        duration: data.duration,
      }
    )

    await this.examRepo.create(exam)

    if (data.classIds && Array.isArray(data.classIds) && data.classIds.length > 0) {
      // Use dueDate if dueAt is not provided (due to FE changes)
      const due = data.dueAt || data.dueDate;
      // Filter out 'all' just in case, though FE will send specific IDs
      const specificClassIds = data.classIds.filter(id => id !== 'all');
      await Promise.all(specificClassIds.map(classId => 
        this.examRepo.assignToClass(exam.id, classId, due)
      ));

      if (data.sendNotification && this.sendNotificationUseCase) {
        this.sendNotificationUseCase.execute({
          examId: exam.id,
          title: data.title,
          type: examType,
          classIds: specificClassIds,
          subjectId: data.subjectId,
          dueDate: due,
          createdBy: input.userId || 'system'
        }).catch(console.error)
      }
    }

    if (file) {
      await this.examRepo.addAttachment(exam.id, {
        fileName: file.originalname,
        fileUrl: `/uploads/attachments/${file.filename}`,
        fileType: file.mimetype
      })
    }

    // Since we just created the attachment directly via Prisma, we should reload the exam or manually inject it
    // In this case, we can just return what we know, or fetch it again
    const createdExam = await this.examRepo.findById(exam.id)
    return ExamResponseDto.from(createdExam as any)
  }
}
