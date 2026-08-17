import { Request, Response, NextFunction } from 'express';
import ResponseFormatter from '../../../shared/utils/responseFormatter';
import { GenaiService } from '../service/genaiService';

export class GenaiController {
    private genaiService: GenaiService;

    constructor(genaiService: GenaiService) {
        if (!genaiService) {
            throw new Error('GenaiService is required');
        }
        this.genaiService = genaiService;
    }

    async queryNl(req: Request, res: Response, next: NextFunction): Promise<Response | void> {
        try {
            const { prompt } = req.body as { prompt: string };
            // clientId is extracted from the verified JWT payload attached by authenticate middleware
            const clientId = req.user!.clientId;

            if (!clientId) {
                return res.status(403).json(
                    ResponseFormatter.error(
                        "GenAI queries require a client-associated account. Super-admin accounts are not supported for this endpoint.",
                        403
                    )
                );
            }

            const result = await this.genaiService.queryNl(prompt, clientId);

            return res.status(200).json(
                ResponseFormatter.success(result, 'GenAI query completed successfully', 200)
            );
        } catch (error) {
            next(error);
        }
    }
}
