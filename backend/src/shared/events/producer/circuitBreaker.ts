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
        warn(message?: any, ...optionalParams: any[]): void;
        debug(message?: any, ...optionalParams: any[]): void;
    };
}

/**
 * A simple implementation of the Circuit Breaker pattern in TypeScript. This class allows you to wrap calls to external services and automatically handle failures by opening the circuit after a certain number of consecutive failures, and then allowing a limited number of test requests after a cooldown period to determine if the service has recovered.
 * 
 * Usage:
 * const circuitBreaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 30000 })
 * circuitBreaker.allowRequest() // returns true if request is allowed, false if circuit is open
 * circuitBreaker.onSuccess() // call this when a request succeeds
 * circuitBreaker.onFailure() // call this when a request fails
 * 
 * The circuit breaker will automatically transition between states (CLOSED, OPEN, HALFOPEN) based on the success and failure of requests, and will log state changes and metrics for monitoring purposes.
 */
export class CircuitBreaker {
    private failureThreshold: number;
    private cooldownMs: number;
    private halfOpenMaxAttempts: number;
    private logger: NonNullable<CircuitBreakerOptions['logger']>;

    private _state: CircuitState;
    private failures: number;
    private lastFailureTime: number;
    private halfOpenAttempts: number;
    private halfOpenSuccesses: number;

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
        this.failures = 0;
        this.lastFailureTime = 0;
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
    }

    public get state(): CircuitState {
        if (this._state === CircuitState.OPEN && this.cooldownElapsed()) {
            this.transitionTo(CircuitState.HALF_OPEN);
        }

        return this._state;
    }

    /**
     * Checks if the cooldown period has elapsed since the last failure.
     * @returns {boolean} True if the cooldown period has elapsed, false otherwise.
     */
    private cooldownElapsed(): boolean {
        return Date.now() - this.lastFailureTime >= this.cooldownMs;
    }

    /**
     * Transitions the circuit breaker to a new state.
     * @param {CircuitState} newState - The new state to transition to.
     */
    private transitionTo(newState: CircuitState): void {
        const prev = this._state;
        this._state = newState;

        this.logger.info(`[CircuitBreaker] ${prev} => ${newState}`);

        if (newState === CircuitState.HALF_OPEN) {
            this.halfOpenAttempts = 0;
            this.halfOpenSuccesses = 0;
            this.logger.info(`[CircuitBreaker] ${prev} => HALF_OPEN`);
        }
    }

    /**
     * Opens the circuit, preventing further requests from being allowed until the cooldown period has elapsed. This method is called when the failure threshold is reached or when a test request in the HALFOPEN state fails.
     */
    private openCircuit(): void {
        this.lastFailureTime = Date.now();
        this.transitionTo(CircuitState.OPEN);
        this.logger.error('[CircuitBreaker] OPEN', {
            failures: this.failures,
            cooldownMs: this.cooldownMs,
        });
    }

    /**
     * Resets the circuit breaker to the CLOSED state, allowing requests to be processed normally. This method is called when a test request in the HALFOPEN state succeeds or can be called manually for debugging purposes.
     */
    private reset(): void {
        this._state = CircuitState.CLOSED;
        this.failures = 0;
        this.halfOpenAttempts = 0;
        this.halfOpenSuccesses = 0;
        this.logger.info('[CircuitBreaker] HALF_OPEN => CLOSED');
    }

    /**
     * Determines if a request is allowed based on the current state of the circuit breaker.
     * @returns {boolean} True if the request is allowed, false otherwise.
     */
    public allowRequest(): boolean {
        const current = this.state;

        this.logger.debug('[CircuitBreaker] allowRequest check', {
            state: current,
            halfOpenAttempts: this.halfOpenAttempts,
            halfOpenMaxAttempts: this.halfOpenMaxAttempts,
            halfOpenSuccesses: this.halfOpenSuccesses,
            failures: this.failures
        });

        // In CLOSED state, all requests are allowed. 
        if (current === CircuitState.CLOSED) return true;

        // In OPEN state, no requests are allowed until cooldown has elapsed, then it transitions to HALFOPEN.
        if (current === CircuitState.HALF_OPEN) {
            if (this.halfOpenAttempts < this.halfOpenMaxAttempts) {
                this.halfOpenAttempts++;
                this.logger.info(`[CircuitBreaker] allowing HALFOPEN attempt ${this.halfOpenAttempts}/${this.halfOpenMaxAttempts}`);
                return true;
            }
            this.logger.warn(`[CircuitBreaker] HALFOPEN attempts exhausted (${this.halfOpenAttempts}/${this.halfOpenMaxAttempts})`);
            return false;
        }

        this.logger.info(`[CircuitBreaker] rejecting request, state: ${current}`);

        // In OPEN state, reject all requests until cooldown has elapsed
        return false;
    }

    /**
     * Records a successful request. 
     * If the circuit breaker is in the HALFOPEN state, it counts the success and transitions to CLOSED if the required number of successful attempts is reached. If the circuit breaker is in the CLOSED state and there were previous failures, it resets the failure count.
     */
    public onSuccess(): void {
        this.logger.info('[CircuitBreaker] success recorded', {
            state: this.state,
            halfOpenSuccesses: this.halfOpenSuccesses,
            halfOpenMaxAttempts: this.halfOpenMaxAttempts,
            failures: this.failures
        });

        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenSuccesses++;
            this.logger.info(`[CircuitBreaker] HALFOPEN success ${this.halfOpenSuccesses}/${this.halfOpenMaxAttempts}`);
            if (this.halfOpenSuccesses >= this.halfOpenMaxAttempts) {
                this.reset();
                this.logger.info('[CircuitBreaker] reset to CLOSED after successful half-open probes');
            }
            return;
        }

        if (this.failures > 0) {
            this.failures = 0;
            this.logger.info('[CircuitBreaker] failure counter reset after success');
        }
    }

    /**
     * Records a failed request. If the circuit breaker is in the HALFOPEN state, it immediately transitions back to OPEN. If the circuit breaker is in the CLOSED state, it increments the failure count and opens the circuit if the failure threshold is reached.
     */
    public onFailure(): void {
        this.logger.error('[CircuitBreaker] failure recorded', {
            state: this.state,
            failures: this.failures,
            failureThreshold: this.failureThreshold
        });

        // If a failure occurs in HALFOPEN state, immediately transition back to OPEN
        if (this.state === CircuitState.HALF_OPEN) {
            this.logger.warn('[CircuitBreaker] half-open failed, reopening circuit');
            this.openCircuit();
            return;
        }

        this.failures++;
        this.lastFailureTime = Date.now();

        this.logger.info(`[CircuitBreaker] failure count: ${this.failures}/${this.failureThreshold}`);
        if (this.failures >= this.failureThreshold) {
            this.openCircuit();
        }
    }

    /**
     * Returns a snapshot of the current state of the circuit breaker.
     */
    public snapshot(): {
        state: CircuitState;
        failures: number;
        lastFailureTime: number;
        halfOpenAttempts: number;
        halfOpenSuccesses: number;
        cooldownMs: number;
        failureThreshold: number;
    } {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
            halfOpenAttempts: this.halfOpenAttempts,
            halfOpenSuccesses: this.halfOpenSuccesses,
            cooldownMs: this.cooldownMs,
            failureThreshold: this.failureThreshold,
        };
    }
}
