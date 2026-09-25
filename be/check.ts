import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Lecturers:', await prisma.user.findMany({
        where: { UserRole: { some: { Role: { RoleName: 'LECTURER' } } }, Status: 'Active' },
        select: { Email: true, Status: true, UserRole: { include: { Role: true } } }
    }))
    console.log('All Users with LECTURER role:', await prisma.user.findMany({
        where: { UserRole: { some: { Role: { RoleName: 'LECTURER' } } } },
        select: { Email: true, Status: true, UserRole: { include: { Role: true } } }
    }))
    console.log('All Users:', await prisma.user.findMany({
        select: { Email: true, Status: true, UserRole: { include: { Role: true } } }
    }))
}

main().catch(console.error).finally(() => prisma.$disconnect())
