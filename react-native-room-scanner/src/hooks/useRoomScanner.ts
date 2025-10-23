/**
 * useRoomScanner.ts
 * React Hook for Room Scanning
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { RoomLayout, RoomScanError, ScanCapabilities } from '../types/RoomLayout';

const { RoomPlanModule, ARCoreModule } = NativeModules;

// Event emitter for progress updates
const roomPlanEmitter = RoomPlanModule ? new NativeEventEmitter(RoomPlanModule) : null;

/**
 * Options for useRoomScanner hook
 */
export interface UseRoomScannerOptions {
  /** Callback when scan completes successfully */
  onScanComplete?: (layout: RoomLayout) => void;

  /** Callback when scan fails */
  onError?: (error: RoomScanError) => void;

  /** Callback for scan progress updates (iOS only) */
  onProgress?: (progress: number) => void;
}

/**
 * Return value from useRoomScanner hook
 */
export interface UseRoomScannerReturn {
  // State
  /** Is a scan currently in progress */
  isScanning: boolean;

  /** Latest room layout (null if no scan completed) */
  roomLayout: RoomLayout | null;

  /** Latest error (null if no error) */
  error: RoomScanError | null;

  /** Is room scanning supported on this device */
  isSupported: boolean;

  /** Scan progress 0-1 (iOS only) */
  progress: number;

  // Actions
  /** Start room scanning */
  startScan: () => Promise<void>;

  /** Stop current scan */
  stopScan: () => void;

  /** Reset state (clear layout and error) */
  reset: () => void;

  // Platform info
  /** Current platform */
  platform: 'ios' | 'android' | 'unknown';

  /** Does device have LiDAR */
  hasLiDAR: boolean;

  /** Platform capabilities */
  capabilities: ScanCapabilities | null;
}

/**
 * React Hook for Room Scanning
 *
 * Provides cross-platform room scanning with RoomPlan (iOS) and ARCore (Android)
 *
 * @example
 * ```tsx
 * const { startScan, isScanning, roomLayout, error, isSupported } = useRoomScanner({
 *   onScanComplete: (layout) => console.log('Scan done!', layout),
 *   onError: (error) => console.error('Scan failed:', error)
 * });
 *
 * if (!isSupported) {
 *   return <Text>Room scanning not supported</Text>;
 * }
 *
 * return (
 *   <Button
 *     title={isScanning ? "Scanning..." : "Start Scan"}
 *     onPress={startScan}
 *     disabled={isScanning}
 *   />
 * );
 * ```
 */
export function useRoomScanner(options: UseRoomScannerOptions = {}): UseRoomScannerReturn {
  const { onScanComplete, onError, onProgress } = options;

  // State
  const [isScanning, setIsScanning] = useState(false);
  const [roomLayout, setRoomLayout] = useState<RoomLayout | null>(null);
  const [error, setError] = useState<RoomScanError | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [progress, setProgress] = useState(0);
  const [capabilities, setCapabilities] = useState<ScanCapabilities | null>(null);

  // Platform detection
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';
  const hasLiDAR = platform === 'ios'; // Only iOS devices with LiDAR support RoomPlan

  /**
   * Check if room scanning is supported
   * FIXED CRITICAL BUG: Moved before useEffect to avoid "used before declaration" error
   */
  const checkSupport = useCallback(async () => {
    try {
      let supported = false;
      let accuracy = 0;
      let scanDuration = 0;

      if (platform === 'ios' && RoomPlanModule) {
        supported = await RoomPlanModule.isSupported();
        accuracy = 0.95; // LiDAR accuracy
        scanDuration = 45; // typical iOS scan
      } else if (platform === 'android' && ARCoreModule) {
        supported = await ARCoreModule.isSupported();
        accuracy = 0.75; // Camera-based accuracy
        scanDuration = 90; // typical Android scan
      }

      setIsSupported(supported);
      setCapabilities({
        isSupported: supported,
        platform,
        hasLiDAR,
        expectedAccuracy: accuracy,
        typicalScanDuration: scanDuration
      });
    } catch (err) {
      console.error('[useRoomScanner] Error checking support:', err);
      setIsSupported(false);
    }
  }, [platform, hasLiDAR]);

  // Check if supported on mount
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  // Listen to progress events (iOS only)
  useEffect(() => {
    if (!roomPlanEmitter) return;

    const progressSub = roomPlanEmitter.addListener('onScanProgress', (data: { progress: number }) => {
      setProgress(data.progress);
      onProgress?.(data.progress);
    });

    const completeSub = roomPlanEmitter.addListener('onScanComplete', (layout: RoomLayout) => {
      setIsScanning(false);
      setRoomLayout(layout);
      setProgress(1);
      onScanComplete?.(layout);
    });

    const errorSub = roomPlanEmitter.addListener('onScanError', (errorData: { code: string; message: string }) => {
      const scanError = new RoomScanError(errorData.message, errorData.code);
      setIsScanning(false);
      setError(scanError);
      onError?.(scanError);
    });

    return () => {
      progressSub.remove();
      completeSub.remove();
      errorSub.remove();
    };
  }, [onScanComplete, onError, onProgress]);

  /**
   * Start room scanning
   */
  const startScan = useCallback(async () => {
    if (!isSupported) {
      const err = new RoomScanError(
        'Room scanning not supported on this device',
        'UNSUPPORTED'
      );
      setError(err);
      onError?.(err);
      return;
    }

    if (isScanning) {
      console.warn('[useRoomScanner] Scan already in progress');
      return;
    }

    try {
      setIsScanning(true);
      setError(null);
      setProgress(0);

      let layout: RoomLayout;

      if (platform === 'ios') {
        // iOS: RoomPlan API
        layout = await RoomPlanModule.startRoomScan();
      } else if (platform === 'android') {
        // Android: ARCore
        layout = await ARCoreModule.startRoomScan();
      } else {
        throw new RoomScanError('Unknown platform', 'UNKNOWN_PLATFORM');
      }

      setIsScanning(false);
      setRoomLayout(layout);
      setProgress(1);
      onScanComplete?.(layout);

    } catch (err: any) {
      const scanError = new RoomScanError(
        err.message || 'Scan failed',
        err.code || 'SCAN_ERROR',
        err
      );

      setIsScanning(false);
      setError(scanError);
      onError?.(scanError);
    }
  }, [isSupported, isScanning, platform, onScanComplete, onError]);

  /**
   * Stop current scan
   */
  const stopScan = useCallback(() => {
    if (!isScanning) {
      console.warn('[useRoomScanner] No scan in progress');
      return;
    }

    try {
      if (platform === 'ios' && RoomPlanModule) {
        RoomPlanModule.stopRoomScan();
      } else if (platform === 'android' && ARCoreModule) {
        ARCoreModule.stopRoomScan();
      }

      setIsScanning(false);
      setProgress(0);
    } catch (err) {
      console.error('[useRoomScanner] Error stopping scan:', err);
    }
  }, [isScanning, platform]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setRoomLayout(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    // State
    isScanning,
    roomLayout,
    error,
    isSupported,
    progress,

    // Actions
    startScan,
    stopScan,
    reset,

    // Platform info
    platform,
    hasLiDAR,
    capabilities
  };
}
