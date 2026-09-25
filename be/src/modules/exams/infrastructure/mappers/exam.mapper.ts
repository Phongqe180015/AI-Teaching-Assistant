import { Exam } from '../../domain/entities/exam.entity.js'
import type { ExamTypeValue, ExamStatusValue } from '../../domain/entities/exam.entity.js'

export class ExamMapper {
  static toDomain(raw: any): Exam {
    let aiContent = raw.AiGeneratedContent;
    let weightPercentage = raw.WeightPercentage ? Number(raw.WeightPercentage) : null;
    if (aiContent) {
      try {
        const parsed = typeof aiContent === 'string' ? JSON.parse(aiContent) : aiContent;
        if (parsed && parsed.weightPercentage) weightPercentage = Number(parsed.weightPercentage);
      } catch (e) { }
    }
    if (weightPercentage === null || weightPercentage === undefined || isNaN(weightPercentage)) {
      weightPercentage = 10;
    }

    const exam = Exam.restore(
      raw.Id,
      raw.Title,
      raw.Description,
      raw.AssignmentTemplateId,
      raw.ProjectTypeId,
      raw.GradingProfileId,
      raw.SubjectId,
      raw.ExamType as ExamTypeValue,
      raw.Duration,
      raw.TotalPoints,
      weightPercentage,
      raw.Status as ExamStatusValue,
      raw.SubmissionFormat,
      raw.AiGeneratedContent,
      raw.OriginalPrompt,
      raw.PromptTemplateId,
      raw.CreatedBy,
      raw.DueDate ? new Date(raw.DueDate) : null
    )

    // Add additional unmapped fields safely if needed by DTOs or logic
    if (raw.Subject) {
      (exam as any).subjectName = raw.Subject.SubjectName;
      (exam as any).subjectCode = raw.Subject.SubjectCode;
    }
    if (raw.StartDate) {
      (exam as any).startDate = raw.StartDate;
    }
    if (raw.ExamClass) {
      (exam as any).classes = raw.ExamClass.map((ec: any) => ec.ClassId);

      // One entry per class the exam is attached to, so a viewing student can be matched to
      // the class they are actually enrolled in (see GetExamUseCase). Internal only —
      // ExamResponseDto maps named fields, so this never reaches the response.
      (exam as any).classLecturers = raw.ExamClass.map((ec: any) => {
        const user = ec.Class?.InstructorClass?.[0]?.User;
        return {
          classId: ec.ClassId,
          lecturer: user?.FullName ?? null,
          lecturerAvatar: user?.Avatar ?? null,
          studentIds: (ec.Class?.StudentClass ?? []).map((sc: any) => sc.UserId),
        };
      });

      // Default for lecturers/admins is unchanged: the exam's first attached class. (It now
      // skips classes that have no instructor, which can only fill a value that was blank.)
      const fallback = (exam as any).classLecturers.find((c: any) => c.lecturer);
      if (fallback) {
        (exam as any).lecturer = fallback.lecturer;
        (exam as any).lecturerAvatar = fallback.lecturerAvatar;
      }
    }
    if (raw._count?.Submission !== undefined) {
      (exam as any).submissionCount = raw._count.Submission
    }
    if (raw.ExamAttachment) {
      (exam as any).ExamAttachment = raw.ExamAttachment
    }
    if (raw.ExamSection) {
      (exam as any).ExamSection = raw.ExamSection
    }
    (exam as any).GradingStrategy = raw.GradingStrategy || 'CONTINUOUS_QUEUE';
    (exam as any).gradingStrategy = raw.GradingStrategy || 'CONTINUOUS_QUEUE';
    (exam as any).isDeleted = Boolean(raw.IsDeleted);
    (exam as any).IsDeleted = Boolean(raw.IsDeleted);
    (exam as any).deletedAt = raw.DeletedAt || null;

    return exam
  }

  static toPersistence(exam: Exam): any {
    let aiGeneratedContent = exam.aiGeneratedContent;
    if (exam.weightPercentage) {
      try {
        const parsed = aiGeneratedContent ? JSON.parse(aiGeneratedContent) : {};
        parsed.weightPercentage = exam.weightPercentage;
        aiGeneratedContent = JSON.stringify(parsed);
      } catch (e) { }
    }

    return {
      Id: exam.id,
      Title: exam.title,
      Description: exam.description,
      AssignmentTemplateId: exam.assignmentTemplateId,
      ProjectTypeId: exam.projectTypeId,
      GradingProfileId: exam.gradingProfileId,
      SubjectId: exam.subjectId,
      ExamType: exam.examType,
      Duration: exam.duration,
      TotalPoints: exam.totalPoints,
      Status: exam.status,
      SubmissionFormat: exam.submissionFormat,
      AiGeneratedContent: aiGeneratedContent,
      OriginalPrompt: exam.originalPrompt,
      PromptTemplateId: exam.promptTemplateId,
      CreatedBy: exam.createdBy,
      DueDate: exam.dueDate
    }
  }
}
