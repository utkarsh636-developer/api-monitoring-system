export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
    failureThreshold?: number;
    cooldownMs?: number;
    halfOpenMaxAttempts?: number;
    logger?: {
        info(message?: any, ...optionalParams: any[]): void;
        error(message?: any, ...optionalParams: any[]): void;
        warn?(message?: any, ...optionalParams: any[]): void;
        log?(message?: any, ...optionalParams: any[]): void;
    };
}

/**
 * A simple implementation of the Circuit Breaker pattern in TypeScript. This class allows you to wrap calls to external services and automatically handle failures by opening the circuit after a certain number of consecutive failures, and then allowing a limited number of test requests after a cooldown period to determine if the service has recovered.
 * 
 * Usage:
 * const circuitBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30000 }
 * circuitBreaker.allowRequest() // returns true if request is allowed, false if circuit is open
 * circuitBreaker.onSuccess() // call this when a request succeeds
 * circuitBreaker.onFailure() // call this when a request fails
 * 
 * The circuit breaker will automatically transition between states (CLOSED, OPEN, HALF_OPEN) based on the success and failure of requests, and will log state changes and metrics for monitoring purposes.
 */
export class CircuitBreaker {
    private failureThreshold: number;
    private cooldownMs: number;
    private halfOpenMaxAttempts: number;
    private logger: NonNullable<CircuitBreakerOptions['logger']>;

    private _state: CircuitState;
    private _failures: number;
    private _lastFailureTime: number;
    private _halfOpenAttempts: number;
    private _halfOpenSuccesses: number;

    /**
     * Creates a new CircuitBreaker instance with the specified options.
     * @param {CircuitBreakerOptions} [opts] - Configuration options for the circuit breaker.
     */
    constructor(opts: CircuitBreakerOptions = {}) {
        this.failureThreshold = opts.failureThreshold ?? 5;
        this.cooldownMs = opts.cooldownMs ?? 30000;
        this.halfOpenMaxAttempts = opts.halfOpenMaxAttempts ?? 3;
        this.logger = opts.logger ?? console;

        this._state = CircuitState.CLOSED;
        this._failures = 0;
        this._lastFailureTime = 0;
        this._halfOpenAttempts = 0;
        this._halfOpenSuccesses = 0;
    }

    // Some helper methods

    /**
     * Checks if the cooldown period has elapsed since the last failure.
     * @returns {boolean} True if the cooldown period has elapsed, false otherwise.
     */
    private _cooldownElapsed(): boolean {
        return Date.now() - this._lastFailureTime >= this.cooldownMs;
    }

    /**
     * Transitions the circuit breaker to a new state.
     * @param {CircuitState} newState - The new state to transition to.
     */
    private _transitionTo(newState: CircuitState): void {
        const prev = this._state;
        this._state = newState;

        this.logger.info(`[CircuitBreaker] ${prev} => ${newState}`);

        if (newState === CircuitState.HALF_OPEN) {
            this._halfOpenAttempts = 0;
            this._halfOpenSuccesses = 0;
            this.logger.info(`[CircuitBreaker] ${prev} => HALF_OPEN`);
        }
    }

    /**
     * Opens the circuit, preventing further requests from being allowed until the cooldown period has elapsed. This method is called when the failure threshold is reached or when a test request in the HALF_OPEN state fails.
     */
    private _openCircuit(): void {
        this._lastFailureTime = Date.now();
        this._transitionTo(CircuitState.OPEN);
        this.logger.error('[CircuitBreaker] OPEN', {
            failures: this._failures,
            cooldownMs: this.cooldownMs,
        });
    }

    /**
     * Resets the circuit breaker to the CLOSED state, allowing requests to be processed normally. This method is called when a test request in the HALF_OPEN state succeeds or can be called manually for debugging purposes.
     */
    private _reset(): void {
        this._state = CircuitState.CLOSED;
        this._failures = 0;
        this._halfOpenAttempts = 0;
        this._halfOpenSuccesses = 0;
        this.logger.info('[CircuitBreaker] HALF_OPEN => CLOSED');
    }
}
