/* Copyright 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package github.bewantbe.audio_analyzer_for_android;

import android.util.Log;
import java.util.ArrayList;
import java.util.List;

/**
 * RT60 (Reverberation Time) Calculator
 *
 * RT60 is the time required for reflections of a direct sound to decay by 60 dB.
 * This class implements the Schroeder integration method for RT60 calculation.
 *
 * The measurement process:
 * 1. Detect an impulse (loud sound like a clap or balloon pop)
 * 2. Capture the decay of sound energy
 * 3. Calculate the energy decay curve using backward integration (Schroeder method)
 * 4. Perform linear regression on the decay curve
 * 5. Extract RT60, RT30, RT20 values
 */
public class RT60Calculator {
    private static final String TAG = "RT60Calculator";

    // Configuration parameters
    private final int sampleRate;
    private final double minRecordingTime = 2.0;  // Minimum recording time in seconds
    private final double maxRecordingTime = 10.0; // Maximum recording time in seconds

    // Detection thresholds
    private double impulseThreshold = 0.3;  // Threshold for impulse detection (0-1 scale)
    private double noiseFloor = 0.01;       // Background noise level

    // Measurement state
    private boolean isRecording = false;
    private boolean impulseDetected = false;
    private List<Double> audioSamples = new ArrayList<>();
    private long recordingStartTime = 0;
    private long impulseDetectedTime = 0;
    private double maxAmplitude = 0;

    // Results
    private double rt60 = 0;
    private double rt30 = 0;
    private double rt20 = 0;
    private double[] decayCurve = null;
    private String status = "Ready";

    public RT60Calculator(int sampleRate) {
        this.sampleRate = sampleRate;
    }

    /**
     * Start RT60 measurement
     */
    public void startMeasurement() {
        reset();
        isRecording = true;
        impulseDetected = false;
        recordingStartTime = System.currentTimeMillis();
        status = "Waiting for impulse...";
        Log.i(TAG, "RT60 measurement started. Waiting for impulse.");
    }

    /**
     * Stop RT60 measurement
     */
    public void stopMeasurement() {
        isRecording = false;
        if (impulseDetected && audioSamples.size() > 0) {
            calculateRT60();
        } else {
            status = "No impulse detected";
        }
    }

    /**
     * Reset all measurements
     */
    public void reset() {
        audioSamples.clear();
        impulseDetected = false;
        maxAmplitude = 0;
        rt60 = 0;
        rt30 = 0;
        rt20 = 0;
        decayCurve = null;
        status = "Ready";
    }

    /**
     * Feed audio samples to the RT60 calculator
     * @param samples Audio samples (normalized to -1.0 to 1.0)
     */
    public void feedData(short[] samples) {
        if (!isRecording) return;

        long currentTime = System.currentTimeMillis();
        double elapsedTime = (currentTime - recordingStartTime) / 1000.0;

        // Check if maximum recording time exceeded
        if (elapsedTime > maxRecordingTime) {
            stopMeasurement();
            return;
        }

        for (short sample : samples) {
            double normalizedSample = sample / 32768.0;

            // Impulse detection
            if (!impulseDetected) {
                double amplitude = Math.abs(normalizedSample);
                if (amplitude > maxAmplitude) {
                    maxAmplitude = amplitude;
                }

                // Detect impulse when amplitude exceeds threshold
                if (amplitude > impulseThreshold) {
                    impulseDetected = true;
                    impulseDetectedTime = System.currentTimeMillis();
                    audioSamples.clear(); // Start fresh from impulse
                    status = "Recording decay...";
                    Log.i(TAG, "Impulse detected! Recording decay...");
                }
            }

            // Record samples after impulse detection
            if (impulseDetected) {
                audioSamples.add(normalizedSample);
            }
        }

        // Auto-stop after minimum recording time if impulse was detected
        if (impulseDetected) {
            double timeSinceImpulse = (currentTime - impulseDetectedTime) / 1000.0;
            if (timeSinceImpulse > minRecordingTime) {
                // Check if signal has decayed sufficiently
                double recentEnergy = calculateRecentEnergy(100);
                if (recentEnergy < noiseFloor) {
                    stopMeasurement();
                }
            }
        }
    }

    /**
     * Calculate energy of the most recent samples
     */
    private double calculateRecentEnergy(int numSamples) {
        if (audioSamples.isEmpty()) {
            return 0.0;
        }

        if (audioSamples.size() < numSamples) {
            numSamples = audioSamples.size();
        }

        double sum = 0;
        for (int i = audioSamples.size() - numSamples; i < audioSamples.size(); i++) {
            double sample = audioSamples.get(i);
            sum += sample * sample;
        }
        return Math.sqrt(sum / numSamples);
    }

    /**
     * Calculate RT60 using Schroeder integration method
     */
    private void calculateRT60() {
        if (audioSamples.size() < sampleRate) {
            status = "Not enough data";
            Log.w(TAG, "Not enough samples for RT60 calculation");
            return;
        }

        status = "Calculating...";

        // Convert samples to array for processing
        int n = audioSamples.size();
        double[] samples = new double[n];
        for (int i = 0; i < n; i++) {
            samples[i] = audioSamples.get(i);
        }

        // Calculate energy decay curve using Schroeder backward integration
        decayCurve = new double[n];
        double sum = 0;

        // Backward integration: E(t) = integral from t to end of p^2(tau) dtau
        for (int i = n - 1; i >= 0; i--) {
            sum += samples[i] * samples[i];
            decayCurve[i] = sum;
        }

        // Normalize and convert to dB
        double maxEnergy = decayCurve[0];
        if (maxEnergy <= 0) {
            status = "Calculation error: zero energy";
            return;
        }

        for (int i = 0; i < n; i++) {
            if (decayCurve[i] > 0) {
                decayCurve[i] = 10 * Math.log10(decayCurve[i] / maxEnergy);
            } else {
                decayCurve[i] = -100; // Floor at -100 dB
            }
        }

        // Calculate RT20, RT30 by linear regression and extrapolate to RT60
        double rt20_measured = calculateRTFromDecay(decayCurve, -5, -25); // Use -5 to -25 dB range (20 dB range)
        double rt30_measured = calculateRTFromDecay(decayCurve, -5, -35); // Use -5 to -35 dB range (30 dB range)

        // Store RT20 and RT30 values (not extrapolated)
        rt20 = rt20_measured;
        rt30 = rt30_measured;

        // Extrapolate to 60 dB
        double rt60_from_rt20 = rt20_measured * 3.0; // RT60 = RT20 * 3 (20dB * 3 = 60dB)
        double rt60_from_rt30 = rt30_measured * 2.0; // RT60 = RT30 * 2 (30dB * 2 = 60dB)

        // Average RT60 from both methods for more accurate result
        if (rt60_from_rt20 > 0 && rt60_from_rt30 > 0) {
            rt60 = (rt60_from_rt20 + rt60_from_rt30) / 2.0;
        } else if (rt60_from_rt20 > 0) {
            rt60 = rt60_from_rt20;
        } else if (rt60_from_rt30 > 0) {
            rt60 = rt60_from_rt30;
        } else {
            rt60 = 0;
            status = "Calculation failed";
            return;
        }

        status = String.format("RT60: %.2f s", rt60);
        Log.i(TAG, String.format("RT60 calculated: RT20=%.2fs, RT30=%.2fs, RT60=%.2fs (from RT20: %.2fs, from RT30: %.2fs)",
                                  rt20, rt30, rt60, rt60_from_rt20, rt60_from_rt30));
    }

    /**
     * Calculate reverberation time from decay curve using linear regression
     * @param decay The decay curve in dB
     * @param startDB Start dB level (e.g., -5)
     * @param endDB End dB level (e.g., -25)
     * @return Reverberation time in seconds
     */
    private double calculateRTFromDecay(double[] decay, double startDB, double endDB) {
        // Find indices corresponding to start and end dB levels
        int startIdx = -1;
        int endIdx = -1;

        for (int i = 0; i < decay.length; i++) {
            if (startIdx == -1 && decay[i] <= startDB) {
                startIdx = i;
            }
            if (decay[i] <= endDB) {
                endIdx = i;
                break;
            }
        }

        if (startIdx == -1 || endIdx == -1 || endIdx <= startIdx) {
            Log.w(TAG, "Could not find valid decay range");
            return 0;
        }

        // Perform linear regression on the decay curve
        int numPoints = endIdx - startIdx + 1;
        double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (int i = startIdx; i <= endIdx; i++) {
            double x = (double)(i - startIdx) / sampleRate; // Time in seconds
            double y = decay[i]; // dB

            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
        }

        // Calculate slope (dB/second)
        double denominator = numPoints * sumX2 - sumX * sumX;
        if (Math.abs(denominator) < 1e-10) {
            Log.w(TAG, "Division by zero in linear regression");
            return 0;
        }

        double slope = (numPoints * sumXY - sumX * sumY) / denominator;

        if (slope >= 0) {
            Log.w(TAG, "Positive slope detected - invalid decay");
            return 0;
        }

        // Calculate time for the measured dB range
        double dbRange = Math.abs(endDB - startDB);
        double time = dbRange / Math.abs(slope);

        return time;
    }

    // Getters
    public boolean isRecording() {
        return isRecording;
    }

    public boolean isImpulseDetected() {
        return impulseDetected;
    }

    public double getRT60() {
        return rt60;
    }

    public double getRT30() {
        return rt30; // Return actual RT30 (not divided by 2)
    }

    public double getRT20() {
        return rt20;
    }

    public double[] getDecayCurve() {
        return decayCurve;
    }

    public String getStatus() {
        return status;
    }

    public int getNumSamples() {
        return audioSamples.size();
    }

    public double getRecordingDuration() {
        return (double)audioSamples.size() / sampleRate;
    }

    // Setters for configuration
    public void setImpulseThreshold(double threshold) {
        this.impulseThreshold = Math.max(0.1, Math.min(1.0, threshold));
    }

    public void setNoiseFloor(double noiseFloor) {
        this.noiseFloor = Math.max(0.001, Math.min(0.1, noiseFloor));
    }
}
