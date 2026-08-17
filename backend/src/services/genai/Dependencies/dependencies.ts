import { GenaiService } from '../service/genaiService';
import { GenaiController } from '../controller/genaiController';

class Container {
    static init() {
        const services = {
            genaiService: new GenaiService(),
        };

        const controller = {
            genaiController: new GenaiController(services.genaiService),
        };

        return { services, controller };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
