import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching students with duplicate enrollments in the same subject and semester...');
  
  // Find users who have multiple StudentClass records in the same Subject+Semester
  const studentClasses = await prisma.studentClass.findMany({
    include: {
      Class: {
        include: {
          Subject: true,
          Semester: true
        }
      }
    }
  });
  
  const map = new Map();
  const toDelete = [];
  
  for (const sc of studentClasses) {
    if (!sc.Class || !sc.Class.Subject || !sc.Class.Semester) continue;
    
    const key = `${sc.UserId}_${sc.Class.SubjectId}_${sc.Class.SemesterId}`;
    if (!map.has(key)) {
      map.set(key, sc);
    } else {
      // Duplicate found!
      const existing = map.get(key);
      const existingTime = existing.EnrolledAt ? existing.EnrolledAt.getTime() : 0;
      const newTime = sc.EnrolledAt ? sc.EnrolledAt.getTime() : 0;
      
      if (newTime > existingTime) {
        toDelete.push(existing);
        map.set(key, sc); // Keep the newer one
      } else {
        toDelete.push(sc);
      }
    }
  }
  
  console.log(`Found ${toDelete.length} duplicate enrollments to delete.`);
  
  for (const sc of toDelete) {
    await prisma.studentClass.delete({
      where: {
        UserId_ClassId: {
          UserId: sc.UserId,
          ClassId: sc.ClassId
        }
      }
    });
    console.log(`Deleted duplicate enrollment for user ${sc.UserId} in class ${sc.ClassId}`);
  }
  
  // Same for instructors
  const instructorClasses = await prisma.instructorClass.findMany({
    include: {
      Class: {
        include: {
          Subject: true,
          Semester: true
        }
      }
    }
  });
  
  const mapInst = new Map();
  const toDeleteInst = [];
  
  for (const ic of instructorClasses) {
    if (!ic.Class || !ic.Class.Subject || !ic.Class.Semester) continue;
    
    const key = `${ic.UserId}_${ic.Class.SubjectId}_${ic.Class.SemesterId}`;
    if (!mapInst.has(key)) {
      mapInst.set(key, ic);
    } else {
      const existing = mapInst.get(key);
      const existingTime = existing.EnrolledAt ? existing.EnrolledAt.getTime() : 0;
      const newTime = ic.EnrolledAt ? ic.EnrolledAt.getTime() : 0;
      
      if (newTime > existingTime) {
        toDeleteInst.push(existing);
        mapInst.set(key, ic);
      } else {
        toDeleteInst.push(ic);
      }
    }
  }
  
  console.log(`Found ${toDeleteInst.length} duplicate instructor enrollments to delete.`);
  
  for (const ic of toDeleteInst) {
    await prisma.instructorClass.delete({
      where: {
        UserId_ClassId: {
          UserId: ic.UserId,
          ClassId: ic.ClassId
        }
      }
    });
    console.log(`Deleted duplicate instructor enrollment for user ${ic.UserId} in class ${ic.ClassId}`);
  }
  
  console.log('Cleanup complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
