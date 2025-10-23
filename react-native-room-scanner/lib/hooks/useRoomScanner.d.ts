/**
 * useRoomScanner.ts
 * React Hook for Room Scanning
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */
import { RoomLayout, RoomScanError, ScanCapabilities } from '../types/RoomLayout';
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
    /** Start room scanning */
    startScan: () => Promise<void>;
    /** Stop current scan */
    stopScan: () => void;
    /** Reset state (clear layout and error) */
    reset: () => void;
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
export declare function useRoomScanner(options?: UseRoomScannerOptions): UseRoomScannerReturn;
//# sourceMappingURL=useRoomScanner.d.ts.map