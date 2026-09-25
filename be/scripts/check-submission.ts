import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = '3de45762-425b-42aa-b71b-cf46845f8b41';
  const row = await prisma.submission.findUnique({
    where: { Id: id },
    select: { Id: true, GradingStatus: true, FinalScore: true, TotalScore: true, ReportData: true }
  });

  if (!row) {
    console.log('NOT FOUND in database');
  } else {
    console.log('Found:', {
      Id: row.Id,
      GradingStatus: row.GradingStatus,
      FinalScore: row.FinalScore,
      TotalScore: row.TotalScore,
      hasReportData: !!row.ReportData,
      reportDataLength: row.ReportData?.length || 0
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
