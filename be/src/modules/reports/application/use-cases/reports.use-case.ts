import { IReportsRepository } from '../../domain/repositories/reports-repository.interface.js'

export class GetAdminReportUseCase {
    constructor(private readonly reportsRepo: IReportsRepository) { }

    async execute(period: string = '30d') {
        const days = period === '7d' ? 7 : period === 'semester' ? 120 : 30
        const since = new Date(Date.now() - days * 86400000)

        const summary = await this.reportsRepo.getAdminSummary(since)

        return {
            period,
            summary,
            chart: {
                labels: ['Users', 'Classes', 'Exams', 'Submissions'],
                values: [summary.users, summary.classes, summary.exams, summary.submissions],
            },
        }
    }
}

export class GetSystemHealthUseCase {
    async execute() {
        return {
            api: { status: 'up', latencyMs: 1 },
            database: { status: 'up' },
            aiEngine: { status: 'up', mode: process.env.AI_STUB_MODE !== 'false' ? 'stub' : 'live' },
        }
    }
}
