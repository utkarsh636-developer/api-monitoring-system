import config from '../../../shared/config/index';
import AppError from '../../../shared/utils/AppError';
import logger from '../../../shared/config/logger';

export interface GenaiQueryResult {
    response: string;
}

export class GenaiService {
    /**
     * Calls the internal FastAPI /nl-query endpoint with the user's prompt.
     * Injects X-Client-Id from the authenticated session (never from the caller).
     * Injects X-Internal-Service-Key from environment config.
     *
     * @throws AppError if the FastAPI call fails for any reason.
     */
    async queryNl(prompt: string, clientId: string): Promise<GenaiQueryResult> {
        const url = `${config.genai.serviceUrl}/nl-query`;

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Service-Key': config.genai.internalServiceKey,
                    'X-Client-Id': clientId,
                },
                body: JSON.stringify({ prompt }),
                signal: AbortSignal.timeout(60_000), // 60-second timeout
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error('[GenaiService] Network error calling FastAPI service', { url, error: message });
            throw new AppError(
                `GenAI service is unreachable: ${message}`,
                502
            );
        }

        if (!response.ok) {
            let detail = '';
            try {
                const body = await response.json() as { detail?: string };
                detail = body.detail ?? '';
            } catch {
                // ignore parse error — we'll use status text
            }
            const errMsg = detail || response.statusText;
            logger.error('[GenaiService] FastAPI returned non-200 status', {
                url,
                status: response.status,
                detail: errMsg,
            });
            throw new AppError(
                `GenAI service error (${response.status}): ${errMsg}`,
                502
            );
        }

        const data = await response.json() as { response: string };
        return { response: data.response };
    }
}
