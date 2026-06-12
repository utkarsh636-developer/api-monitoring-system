import { AuthController } from "../controller/authController";
import { AuthService } from "../service/authService";
import userRepository from "../repository/UserRepository";

class Container {
    static init() {
        const repositories = {
            userRepository: userRepository
        };

        const services = {
            authService: new AuthService(repositories.userRepository)
        };

        const controller = {
            authController: new AuthController(services.authService)
        };

        return {
            repositories,
            services,
            controller
        };
    }
}

const initialized = Container.init();
export { Container };
export default initialized;
