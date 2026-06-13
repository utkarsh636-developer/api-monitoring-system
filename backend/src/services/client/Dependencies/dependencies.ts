import clientRepository from "../repository/clientRepository";
import apiKeyRepository from "../repository/apiKeyRepository";
import userRepository from "../../auth/repository/UserRepository";
import { ClientService } from "../service/clientService";
import { ClientController } from "../controller/clientController";
import authContainer from "../../auth/Dependencies/dependencies";

class Container {
    static init() {
        const repositories = {
            clientRepository,
            apiKeyRepository,
            userRepository
        };

        const services = {
            clientServices: new ClientService({
                clientRepository: repositories.clientRepository,
                apiKeyRepository: repositories.apiKeyRepository,
                userRepository: repositories.userRepository
            })
        };

        const controller = {
            clientController: new ClientController(services.clientServices, authContainer.services.authService)
        };

        return { repositories, services, controller };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
