import { AlertRepository } from '../repository/alertRepository';
import { AnomalyService } from '../service/anomalyService';
import { EwmaService } from '../service/ewmaService';
import logger from '../../../shared/config/logger';

class Container {
    static init() {
        const repositories = {
            alertRepository: new AlertRepository({ logger }),
        };

        const ewmaService = new EwmaService({
            alpha: 0.2,          // Smoothing factor — see ewmaService.ts for rationale
            threshold: 3,        // Alert at 3 standard deviations above the mean
            warmupSamples: 20,   // Minimum samples before flagging anomalies
        });

        const services = {
            anomalyService: new AnomalyService({
                ewmaService,
                alertRepository: repositories.alertRepository,
            }),
        };

        return { repositories, services };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
