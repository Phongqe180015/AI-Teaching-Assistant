import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { UpdateExamRequestDto, ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'
import type { SendAssignmentNotificationUseCase } from '../../../notifications/application/use-cases/send-assignment-notification.use-case.js'

export class UpdateExamUseCase implements IUseCase<{ id: string; dto: UpdateExamRequestDto }, ExamResponseDto> {
  constructor(
    private readonly examRepo: IExamRepository,
    private readonly sendNotificationUseCase?: SendAssignmentNotificationUseCase
  ) { }

  async execute(params: { id: string; dto: UpdateExamRequestDto }): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(params.id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    const { data } = params.dto
    const wasPublished = exam.status === 'Published'
    
    exam.updateInfo({
      title: data.title,
      description: data.description,
    })

    if (data.status === 'published' || data.status === 'Published') {
      if (exam.status !== 'Published') {
        exam.publish()
      }
    } else if (data.status === 'draft' || data.status === 'Draft') {
      if (exam.status !== 'Draft') {
        exam.status = 'Draft'
      }
    }

    await this.examRepo.save(exam)

    const isNewlyPublished = !wasPublished && exam.status === 'Published'
    if ((isNewlyPublished || (data as any).sendNotification) && this.sendNotificationUseCase) {
      this.sendNotificationUseCase.execute({
        examId: exam.id,
        title: exam.title || 'Bài tập mới',
        type: exam.examType || 'Assignment',
        subjectId: exam.subjectId || undefined,
        dueDate: (exam as any).dueDate || (exam as any).dueAt || undefined,
        createdBy: exam.createdBy || 'system'
      }).catch(console.error)
    }

    return ExamResponseDto.from(exam as any)
  }
}
