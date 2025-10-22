/**
 * RT60 (Reverberation Time) Calculator for React/Web
 *
 * RT60 is the time required for sound to decay by 60 dB after the source stops.
 * This class implements the Schroeder integration method for RT60 calculation.
 *
 * @author Ported from Android version
 * @license Apache-2.0
 */

export interface RT60Result {
  rt60: number;
  rt30: number;
  rt20: number;
  decayCurve: number[] | null;
  status: string;
  numSamples: number;
  duration: number;
}

export interface RT60Config {
  sampleRate: number;
  minRecordingTime?: number;
  maxRecordingTime?: number;
  impulseThreshold?: number;
  noiseFloor?: number;
}

export class RT60Calculator {
  private static readonly MAX_SAMPLES = 500000; // ~10s at 48kHz (safety limit)

  private sampleRate: number;
  private minRecordingTime: number = 2.0;  // seconds
  private maxRecordingTime: number = 10.0; // seconds
  private impulseThreshold: number = 0.3;  // 0-1 scale
  private noiseFloor: number = 0.01;

  // Measurement state
  private isRecording: boolean = false;
  private impulseDetected: boolean = false;
  private audioSamples: number[] = [];
  private recordingStartTime: number = 0;
  private impulseDetectedTime: number = 0;
  private maxAmplitude: number = 0;

  // Results
  private rt60: number = 0;
  private rt30: number = 0;
  private rt20: number = 0;
  private decayCurve: number[] | null = null;
  private status: string = 'Ready';

  constructor(config: RT60Config) {
    if (config.sampleRate <= 0) {
      throw new Error(`Sample rate must be positive, got: ${config.sampleRate}`);
    }
    this.sampleRate = config.sampleRate;
    if (config.minRecordingTime !== undefined) {
      this.minRecordingTime = config.minRecordingTime;
    }
    if (config.maxRecordingTime !== undefined) {
      this.maxRecordingTime = config.maxRecordingTime;
    }
    if (config.impulseThreshold !== undefined) {
      this.impulseThreshold = Math.max(0.1, Math.min(1.0, config.impulseThreshold));
    }
    if (config.noiseFloor !== undefined) {
      this.noiseFloor = Math.max(0.001, Math.min(0.1, config.noiseFloor));
    }
  }

  /**
   * Start RT60 measurement
   */
  public startMeasurement(): void {
    this.reset();
    this.isRecording = true;
    this.impulseDetected = false;
    this.maxAmplitude = 0;
    this.recordingStartTime = Date.now();
    this.impulseDetectedTime = 0;
    this.status = 'Waiting for impulse...';
    console.log('[RT60] Measurement started. Waiting for impulse.');
  }

  /**
   * Stop RT60 measurement
   */
  public stopMeasurement(): void {
    this.isRecording = false;
    if (this.impulseDetected && this.audioSamples.length > 0) {
      this.calculateRT60();
    } else {
      this.status = 'No impulse detected';
    }
  }

  /**
   * Reset all measurements
   */
  public reset(): void {
    this.audioSamples = [];
    this.impulseDetected = false;
    this.maxAmplitude = 0;
    this.rt60 = 0;
    this.rt30 = 0;
    this.rt20 = 0;
    this.decayCurve = null;
    this.status = 'Ready';
    this.recordingStartTime = 0;
    this.impulseDetectedTime = 0;
  }

  /**
   * Feed audio samples to the RT60 calculator
   * @param samples Audio samples (normalized to -1.0 to 1.0)
   */
  public feedData(samples: Float32Array): void {
    if (!samples || samples.length === 0) {
      return;
    }

    if (!this.isRecording) return;

    const currentTime = Date.now();
    const elapsedTime = (currentTime - this.recordingStartTime) / 1000.0;

    // Check if maximum recording time exceeded
    if (elapsedTime > this.maxRecordingTime) {
      this.stopMeasurement();
      return;
    }

    for (let i = 0; i < samples.length; i++) {
      // Check memory limit
      if (this.audioSamples.length >= RT60Calculator.MAX_SAMPLES) {
        console.warn(`[RT60] Maximum sample limit reached (${RT60Calculator.MAX_SAMPLES}), stopping measurement`);
        this.stopMeasurement();
        return;
      }

      const normalizedSample = samples[i];

      // Impulse detection
      if (!this.impulseDetected) {
        const amplitude = Math.abs(normalizedSample);
        if (amplitude > this.maxAmplitude) {
          this.maxAmplitude = amplitude;
        }

        // Detect impulse when amplitude exceeds threshold
        if (amplitude > this.impulseThreshold) {
          this.impulseDetected = true;
          this.impulseDetectedTime = Date.now();
          this.audioSamples = []; // Start fresh from impulse
          this.status = 'Recording decay...';
          console.log('[RT60] Impulse detected! Recording decay...');
        }
      }

      // Record samples after impulse detection
      if (this.impulseDetected) {
        this.audioSamples.push(normalizedSample);
      }
    }

    // Auto-stop after minimum recording time if impulse was detected
    if (this.impulseDetected) {
      const timeSinceImpulse = (currentTime - this.impulseDetectedTime) / 1000.0;
      if (timeSinceImpulse > this.minRecordingTime) {
        // Check if signal has decayed sufficiently
        const recentEnergy = this.calculateRecentEnergy(100);
        if (recentEnergy < this.noiseFloor) {
          this.stopMeasurement();
        }
      }
    }
  }

  /**
   * Calculate energy of the most recent samples
   */
  private calculateRecentEnergy(numSamples: number): number {
    if (this.audioSamples.length === 0) {
      return 0.0;
    }

    if (this.audioSamples.length < numSamples) {
      numSamples = this.audioSamples.length;
    }

    let sum = 0;
    for (let i = this.audioSamples.length - numSamples; i < this.audioSamples.length; i++) {
      const sample = this.audioSamples[i];
      sum += sample * sample;
    }
    return Math.sqrt(sum / numSamples);
  }

  /**
   * Calculate RT60 using Schroeder integration method
   */
  private calculateRT60(): void {
    if (this.audioSamples.length < this.sampleRate) {
      this.status = 'Not enough data';
      console.warn('[RT60] Not enough samples for RT60 calculation');
      return;
    }

    this.status = 'Calculating...';

    const n = this.audioSamples.length;
    const samples = this.audioSamples;

    // Calculate energy decay curve using Schroeder backward integration
    this.decayCurve = new Array(n);
    let sum = 0;

    // Backward integration: E(t) = integral from t to end of p^2(tau) dtau
    for (let i = n - 1; i >= 0; i--) {
      sum += samples[i] * samples[i];
      this.decayCurve[i] = sum;
    }

    // Normalize and convert to dB
    const maxEnergy = this.decayCurve[0];
    if (maxEnergy <= 0) {
      this.status = 'Calculation error: zero energy';
      return;
    }

    for (let i = 0; i < n; i++) {
      if (this.decayCurve[i] > 0) {
        this.decayCurve[i] = 10 * Math.log10(this.decayCurve[i] / maxEnergy);
      } else {
        this.decayCurve[i] = -100; // Floor at -100 dB
      }
    }

    // Calculate RT20, RT30 by linear regression and extrapolate to RT60
    const rt20_measured = this.calculateRTFromDecay(this.decayCurve, -5, -25);
    const rt30_measured = this.calculateRTFromDecay(this.decayCurve, -5, -35);

    // Store RT20 and RT30 values (not extrapolated)
    this.rt20 = rt20_measured;
    this.rt30 = rt30_measured;

    // Extrapolate to 60 dB
    const rt60_from_rt20 = rt20_measured * 3.0;
    const rt60_from_rt30 = rt30_measured * 2.0;

    // Average RT60 from both methods for more accurate result
    if (rt60_from_rt20 > 0 && rt60_from_rt30 > 0) {
      this.rt60 = (rt60_from_rt20 + rt60_from_rt30) / 2.0;
    } else if (rt60_from_rt20 > 0) {
      this.rt60 = rt60_from_rt20;
    } else if (rt60_from_rt30 > 0) {
      this.rt60 = rt60_from_rt30;
    } else {
      this.rt60 = 0;
      this.status = 'Calculation failed';
      return;
    }

    this.status = `RT60: ${this.rt60.toFixed(2)} s`;
    console.log(
      `[RT60] RT60 calculated: RT20=${this.rt20.toFixed(2)}s, RT30=${this.rt30.toFixed(2)}s, ` +
      `RT60=${this.rt60.toFixed(2)}s (from RT20: ${rt60_from_rt20.toFixed(2)}s, from RT30: ${rt60_from_rt30.toFixed(2)}s)`
    );
  }

  /**
   * Calculate reverberation time from decay curve using linear regression
   */
  private calculateRTFromDecay(decay: number[], startDB: number, endDB: number): number {
    if (!decay || decay.length === 0) {
      console.warn('[RT60] Decay curve is null or empty');
      return 0;
    }

    // Find indices corresponding to start and end dB levels
    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < decay.length; i++) {
      if (startIdx === -1 && decay[i] <= startDB) {
        startIdx = i;
      }
      if (startIdx !== -1 && decay[i] <= endDB) {
        endIdx = i;
        break;
      }
    }

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
      console.warn(`[RT60] Could not find valid decay range (startIdx=${startIdx}, endIdx=${endIdx})`);
      return 0;
    }

    // Safety check for array bounds
    if (startIdx >= decay.length || endIdx >= decay.length) {
      console.warn('[RT60] Index out of bounds in decay curve');
      return 0;
    }

    // Perform linear regression on the decay curve
    const numPoints = endIdx - startIdx + 1;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = startIdx; i <= endIdx; i++) {
      const x = (i - startIdx) / this.sampleRate; // Time in seconds
      const y = decay[i]; // dB

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    // Calculate slope (dB/second)
    const denominator = numPoints * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) {
      console.warn('[RT60] Division by zero in linear regression');
      return 0;
    }

    const slope = (numPoints * sumXY - sumX * sumY) / denominator;

    if (slope >= 0) {
      console.warn('[RT60] Positive slope detected - invalid decay');
      return 0;
    }

    // Calculate time for the measured dB range
    const dbRange = Math.abs(endDB - startDB);
    const time = dbRange / Math.abs(slope);

    return time;
  }

  // Getters
  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getImpulseDetected(): boolean {
    return this.impulseDetected;
  }

  public getResult(): RT60Result {
    return {
      rt60: this.rt60,
      rt30: this.rt30,
      rt20: this.rt20,
      decayCurve: this.decayCurve ? [...this.decayCurve] : null, // Return copy
      status: this.status,
      numSamples: this.audioSamples.length,
      duration: this.audioSamples.length / this.sampleRate
    };
  }

  public getStatus(): string {
    return this.status;
  }

  // Setters for configuration
  public setImpulseThreshold(threshold: number): void {
    if (threshold < 0.0 || threshold > 1.0) {
      throw new Error(`Impulse threshold must be between 0 and 1, got: ${threshold}`);
    }
    this.impulseThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  public setNoiseFloor(noiseFloor: number): void {
    if (noiseFloor < 0.0 || noiseFloor > 1.0) {
      throw new Error(`Noise floor must be between 0 and 1, got: ${noiseFloor}`);
    }
    this.noiseFloor = Math.max(0.001, Math.min(0.1, noiseFloor));
  }

  public getSampleRate(): number {
    return this.sampleRate;
  }
}
