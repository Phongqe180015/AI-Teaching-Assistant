import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { ListRubricRulesUseCase, GetRubricRuleWithCriteriaUseCase } from '../application/use-cases/rubric.use-case.js'
import { SaveExamRubricUseCase } from '../application/use-cases/save-exam-rubric.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'
import { z } from 'zod'

const SaveExamRubricSchema = z.object({
    description: z.string().optional(),
    maxPoints: z.number().optional(),
    criteria: z.array(z.object({
        description: z.string(),
        maxPoints: z.number()
    })).optional()
})

export class RubricController extends BaseController {
    constructor(
        private readonly listRubricRulesUseCase: ListRubricRulesUseCase,
        private readonly getRubricRuleWithCriteriaUseCase: GetRubricRuleWithCriteriaUseCase,
        private readonly saveExamRubricUseCase: SaveExamRubricUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async listRules(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching list of rubric rules')
        const result = await this.listRubricRulesUseCase.execute()
        this.ok(res, result, MESSAGES.RUBRIC_LIST_SUCCESS)
    }

    async getRuleWithCriteria(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string
        this.logger.debug(`Fetching rubric rule with criteria: ${id}`)
        const result = await this.getRubricRuleWithCriteriaUseCase.execute(id)
        this.ok(res, result, MESSAGES.RUBRIC_GET_SUCCESS)
    }

    async saveExamRubric(req: Request, res: Response): Promise<void> {
        const examId = req.params.examId as string
        this.logger.debug(`Saving rubric for exam: ${examId}`)

        const bodyStr = req.body.data || '{}'
        const parsedBody = JSON.parse(bodyStr)
        const validated = SaveExamRubricSchema.parse(parsedBody)

        let referenceAnswer = undefined
        if (req.file) {
            referenceAnswer = (req.file as any).location || `/uploads/${req.file.filename}`
        } else if (parsedBody.referenceAnswer) {
            referenceAnswer = parsedBody.referenceAnswer
        }

        await this.saveExamRubricUseCase.execute({
            examId,
            rule: {
                description: validated.description,
                maxPoints: validated.maxPoints,
                referenceAnswer
            },
            criteria: validated.criteria || []
        })

        this.ok(res, null, 'Đã lưu Rubric thành công')
    }
}

