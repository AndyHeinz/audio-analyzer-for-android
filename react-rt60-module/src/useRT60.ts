/**
 * React Hook for RT60 Measurement using Web Audio API
 *
 * This hook provides easy integration of RT60 measurement into React apps.
 * It handles microphone access, audio processing, and RT60 calculation.
 *
 * @author React integration
 * @license Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { RT60Calculator, RT60Result } from './RT60Calculator';

export interface UseRT60Options {
  sampleRate?: number;
  minRecordingTime?: number;
  maxRecordingTime?: number;
  impulseThreshold?: number;
  noiseFloor?: number;
  autoStart?: boolean;
}

export interface UseRT60Return {
  // State
  isRecording: boolean;
  result: RT60Result | null;
  error: string | null;

  // Actions
  startMeasurement: () => Promise<void>;
  stopMeasurement: () => void;
  reset: () => void;

  // Audio context info
  isSupported: boolean;
  hasPermission: boolean;
}

export function useRT60(options: UseRT60Options = {}): UseRT60Return {
  const {
    sampleRate = 48000,
    minRecordingTime = 2.0,
    maxRecordingTime = 10.0,
    impulseThreshold = 0.3,
    noiseFloor = 0.01,
    autoStart = false
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<RT60Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rt60CalculatorRef = useRef<RT60Calculator | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Check Web Audio API support
  const isSupported = typeof window !== 'undefined' &&
                      (window.AudioContext !== undefined ||
                       (window as any).webkitAudioContext !== undefined);

  /**
   * Initialize RT60 Calculator
   */
  const initCalculator = useCallback(() => {
    rt60CalculatorRef.current = new RT60Calculator({
      sampleRate,
      minRecordingTime,
      maxRecordingTime,
      impulseThreshold,
      noiseFloor
    });
  }, [sampleRate, minRecordingTime, maxRecordingTime, impulseThreshold, noiseFloor]);

  /**
   * Start RT60 measurement
   */
  const startMeasurement = useCallback(async () => {
    if (!isSupported) {
      setError('Web Audio API is not supported in this browser');
      return;
    }

    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Create Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate });
      audioContextRef.current = audioContext;

      // Create nodes
      const microphone = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      microphoneRef.current = microphone;
      analyserRef.current = analyser;
      processorRef.current = processor;

      // Configure analyser
      analyser.fftSize = 2048;

      // Initialize RT60 calculator
      initCalculator();
      rt60CalculatorRef.current?.startMeasurement();

      // Process audio
      processor.onaudioprocess = (e) => {
        const inputBuffer = e.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);

        // Feed data to RT60 calculator
        rt60CalculatorRef.current?.feedData(inputData);

        // Update result
        const currentResult = rt60CalculatorRef.current?.getResult();
        if (currentResult) {
          setResult(currentResult);

          // Auto-stop if measurement is complete
          if (!rt60CalculatorRef.current?.getIsRecording()) {
            stopMeasurement();
          }
        }
      };

      // Connect nodes
      microphone.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(errorMessage);
      console.error('[useRT60] Error starting measurement:', err);
    }
  }, [isSupported, sampleRate, initCalculator]);

  /**
   * Stop RT60 measurement
   */
  const stopMeasurement = useCallback(() => {
    // Stop RT60 calculator
    rt60CalculatorRef.current?.stopMeasurement();

    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);

    // Get final result
    const finalResult = rt60CalculatorRef.current?.getResult();
    if (finalResult) {
      setResult(finalResult);
    }
  }, []);

  /**
   * Reset measurement
   */
  const reset = useCallback(() => {
    if (isRecording) {
      stopMeasurement();
    }
    rt60CalculatorRef.current?.reset();
    setResult(null);
    setError(null);
  }, [isRecording, stopMeasurement]);

  /**
   * Auto-start if enabled
   */
  useEffect(() => {
    if (autoStart && !isRecording && !error) {
      startMeasurement();
    }
  }, [autoStart, isRecording, error, startMeasurement]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopMeasurement();
      }
    };
  }, [isRecording, stopMeasurement]);

  return {
    isRecording,
    result,
    error,
    startMeasurement,
    stopMeasurement,
    reset,
    isSupported,
    hasPermission
  };
}
