import { ApiHitRepository } from "../repository/apiHitRepository";
import { MetricsRepository } from "../repository/metricsRepository";
import { ProcessorService } from "../service/processorService";
import logger from '../../../shared/config/logger';

class Container {
    static init() {
        const repositories = {
            apiHitRepository: new ApiHitRepository({ logger }),
            metricsRepository: new MetricsRepository({ logger }),
        };

        const services = {
            processorService: new ProcessorService({
                apiHitRepository: repositories.apiHitRepository,
                metricsRepository: repositories.metricsRepository,
            }),
        };

        return { repositories, services };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
