const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      UserRole: {
        some: {
          Role: { RoleName: 'LECTURER' }
        }
      }
    },
    select: {
      Id: true,
      FullName: true,
      Email: true,
      InstructorClass: {
        select: {
          Class: {
            select: {
              Id: true,
              ClassCode: true,
              SemesterId: true,
              Semester: { select: { Id: true, Code: true, Season: true } },
              Subject: { select: { Id: true, SubjectCode: true, SubjectName: true, Semester: true } }
            }
          }
        }
      }
    }
  });
  console.log('--- LECTURERS & THEIR CLASSES ---');
  console.log(JSON.stringify(users, null, 2));

  const allClasses = await prisma.class.findMany({
    select: {
      Id: true,
      ClassCode: true,
      SemesterId: true,
      Semester: { select: { Id: true, Code: true, Season: true } },
      Subject: { select: { Id: true, SubjectCode: true, SubjectName: true, Semester: true } },
      InstructorClass: {
        select: {
          User: { select: { FullName: true, Email: true } }
        }
      }
    }
  });
  console.log('--- ALL CLASSES ---');
  console.log(JSON.stringify(allClasses, null, 2));

  const semesters = await prisma.semester.findMany();
  console.log('--- SEMESTERS ---');
  console.log(JSON.stringify(semesters, null, 2));

  const subjects = await prisma.subject.findMany();
  console.log('--- SUBJECTS ---');
  console.log(JSON.stringify(subjects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
