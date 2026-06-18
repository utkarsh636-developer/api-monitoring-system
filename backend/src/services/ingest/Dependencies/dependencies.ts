import { createEventProducer } from "../../../shared/events/producer/createEventProducer";
import { IngestController } from "../controller/ingestController";
import { IngestService } from "../services/ingestService";

class Container {
    static init() {
        const eventProducer = createEventProducer();

        const services = {
            ingestService: new IngestService({ eventProducer })
        };

        const controllers = {
            ingestController: new IngestController(services)
        };

        return { services, controllers };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
