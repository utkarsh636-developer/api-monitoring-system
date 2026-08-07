export interface EndpointState {
    mean: number;
    variance: number;
    count: number;
}

export interface EwmaResult {
    updatedState: EndpointState;
    isAnomaly: boolean;
    /** How many standard deviations the observed value is above the current mean. */
    stdDevs: number;
    /** The EWMA mean at the moment of evaluation (before this sample is folded in). */
    expectedValue: number;
}

export interface EwmaServiceOptions {
    /**
     * Smoothing factor — controls how fast the baseline adapts to new data.
     *
     * WHY 0.2?
     *   alpha=0.2 means each new sample contributes 20% to the updated mean.
     *   After 20 samples the effective half-weight window is ≈ 1/alpha = 5 samples,
     *   meaning the baseline adapts within a few minutes of a genuine latency shift
     *   while still smoothing over one-off spikes.
     *
     *   Lower (e.g. 0.05) → takes hundreds of hits to react to real degradation.
     *   Higher (e.g. 0.5)  → flags transient bursts as anomalies far too often.
     *   0.1–0.3 is the industry standard for network/latency monitoring
     *   (used by Netflix Hystrix and AWS CloudWatch anomaly detection internally).
     */
    alpha: number;

    /**
     * Alert threshold expressed in standard deviations from the mean.
     *
     * WHY 3?
     *   The 3-sigma rule captures ≈99.7% of normally distributed variation.
     *   Anything beyond 3σ is statistically rare enough to warrant an alert.
     *   API latency distributions are right-skewed (not perfectly Gaussian),
     *   so 3σ is intentionally conservative — low false-positive rate at the
     *   cost of missing mild anomalies.  2σ catches more but generates noise;
     *   4σ misses genuine P99 latency spikes.
     */
    threshold: number;

    /**
     * Minimum number of samples required before flagging any anomaly.
     *
     * WHY 20?
     *   With 1 sample, variance = 0, so any second deviation divides by stdDev=0
     *   (→ infinity → immediate false alarm).  With 5–10 samples the variance
     *   estimate is dominated by early outliers.  At 20 samples, the exponential
     *   weight from the very first sample has decayed to (1-0.2)^20 ≈ 0.01
     *   (1% influence), giving a statistically stable baseline.
     *   In practice, 20 hits for a monitored endpoint arrive within minutes.
     */
    warmupSamples: number;
}

export class EwmaService {
    private readonly alpha: number;
    private readonly threshold: number;
    private readonly warmupSamples: number;

    constructor({ alpha, threshold, warmupSamples }: EwmaServiceOptions) {
        this.alpha = alpha;
        this.threshold = threshold;
        this.warmupSamples = warmupSamples;
    }

    /**
     * Evaluates a single new observation against the current endpoint state.
     *
     * The update formulas used here come from Welford's online variance algorithm
     * adapted for exponential weighting:
     *
     *   diff      = x - mean           (deviation of new sample from current mean)
     *   increment = alpha * diff        (how much the mean will shift)
     *   mean     += increment           (update mean)
     *   variance  = (1-alpha) * (variance + diff * increment)
     *              ─ previous variance decays by (1-alpha) each step
     *              ─ new variance contribution = diff * increment (cross-product term)
     *   stdDev    = sqrt(variance)
     *   isAnomaly = (count >= warmupSamples) && |x - mean| > threshold * stdDev
     *
     * Returns a new state object — the caller is responsible for persisting it.
     */
    evaluate(x: number, state: EndpointState): EwmaResult {
        const { mean, variance, count } = state;

        // Capture expected value BEFORE updating
        const expectedValue = mean;

        // ── STEP 1: Evaluate stdDevs against the PRIOR baseline ───────────────
        //
        // ROOT CAUSE OF THE ORIGINAL BUG:
        //   The original code computed newVariance (which includes the spike),
        //   then used sqrt(newVariance) to evaluate whether the spike was anomalous.
        //   A 500ms spike after 20× 45ms hits inflates newVariance to 33,124,
        //   giving stdDev=182 and stdDevs=455/182=2.5σ — BELOW the 3σ threshold.
        //   The spike literally masked itself.
        //
        // THE FIX:
        //   Evaluate stdDevs using the PRIOR variance (before the spike is folded in).
        //   This gives the true σ-distance from the established baseline.
        //
        // MIN FLOOR of 1.0ms:
        //   After 20 identical samples, variance=0 (priorStdDev=0).
        //   Without the floor, stdDevs = 455/0 = Infinity or NaN, causing undefined behaviour.
        //   With the floor, stdDevs = 455/1.0 = 455σ — correctly triggers the alert.
        const priorStdDev = Math.sqrt(Math.max(0, variance));
        const effectiveStdDev = Math.max(priorStdDev, 1.0);
        const stdDevs = Math.abs(x - expectedValue) / effectiveStdDev;

        const newCount = count + 1;
        const isAnomaly = newCount >= this.warmupSamples && stdDevs > this.threshold;

        // ── STEP 2: Update EWMA state for future samples ──────────────────────
        // This is intentionally done AFTER the anomaly check so the spike does
        // not widen the baseline and hide itself from detection.
        const diff = x - mean;
        const increment = this.alpha * diff;
        const newMean = mean + increment;
        const newVariance = (1 - this.alpha) * (variance + diff * increment);

        return {
            updatedState: { mean: newMean, variance: newVariance, count: newCount },
            isAnomaly,
            stdDevs,
            expectedValue,
        };
    }
}
