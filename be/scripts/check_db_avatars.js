import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { Id: true, Email: true, FullName: true, Avatar: true, StudentCode: true, LecturerCode: true }
  });
  console.log('Total users:', users.length);
  for (const u of users) {
    console.log(`- ${u.FullName} (${u.Email}): Avatar = ${u.Avatar}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
