import clientRepository from '../../client/repository/clientRepository';
import processorContainer from '../../processer/Dependencies/dependencies';
import authContainer from '../../auth/Dependencies/dependencies';

import { AnalyticsService } from '../service/analyticsService';
import { AnalyticsController } from '../controller/analyticsController';

class Container {
    static init() {
        const repositories = {
            clientRepository,
            metricsRepository: processorContainer.repositories.metricsRepository,
        };

        const analyticsService = new AnalyticsService(repositories.metricsRepository);

        const services = {
            analyticsService,
            authService: authContainer.services.authService,
        };

        const analyticsController = new AnalyticsController({
            analyticsService: services.analyticsService,
            authService: services.authService,
            clientRepository: repositories.clientRepository,
        });

        const controllers = {
            analyticsController,
        };

        return { repositories, services, controllers };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
