import { Class } from '../../domain/entities/class.entity.js'

export class ClassMapper {
  static toDomain(raw: any): Class {
    const classEntity = Class.restore(
      raw.Id,
      raw.ClassCode,
      raw.SubjectId,
      raw.SemesterId,
      raw.Status
    )

    // Attach unmapped fields for DTO compatibility
    if (raw.Subject) {
      (classEntity as any).subjectName = raw.Subject.SubjectName;
      (classEntity as any).subjectCode = raw.Subject.SubjectCode;
    }
    if (raw.Semester) {
      (classEntity as any).semesterName = raw.Semester.Code;
      (classEntity as any).semesterSeason = raw.Semester.Season;
    }
    if (raw.InstructorClass && raw.InstructorClass.length > 0) {
      (classEntity as any).instructorName = raw.InstructorClass[0].User?.FullName;
      (classEntity as any).instructorId = raw.InstructorClass[0].User?.Id;
      (classEntity as any).instructorEmail = raw.InstructorClass[0].User?.Email;
      (classEntity as any).instructorAvatar = raw.InstructorClass[0].User?.Avatar;
    }
    if (raw._count?.StudentClass !== undefined) {
      (classEntity as any).studentCount = raw._count.StudentClass
    }
    // Internal note — carried on the entity so the response DTO can expose it to staff.
    (classEntity as any).note = raw.Note ?? null

    return classEntity
  }

  static toPersistence(classEntity: Class): any {
    return {
      Id: classEntity.id,
      ClassCode: classEntity.classCode,
      SubjectId: classEntity.subjectId,
      SemesterId: classEntity.semesterId,
      Status: classEntity.status,
    }
  }
}
