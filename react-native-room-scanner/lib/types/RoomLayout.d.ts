/**
 * RoomLayout.ts
 * TypeScript type definitions for Room Scanning
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */
/**
 * 2D Vector (X, Z coordinates - floor plan)
 */
export interface Vector2D {
    x: number;
    z: number;
}
/**
 * 3D Vector (X, Y, Z coordinates - world space)
 */
export interface Vector3D {
    x: number;
    y: number;
    z: number;
}
/**
 * Wall in the room
 */
export interface Wall {
    /** Unique identifier */
    id: string;
    /** Start point in meters (floor plan coordinates) */
    start: Vector2D;
    /** End point in meters (floor plan coordinates) */
    end: Vector2D;
    /** Wall height in meters */
    height: number;
    /** Wall thickness in meters (iOS only, Android = 0.15) */
    thickness: number;
    /** Detection confidence 0-1 */
    confidence: number;
}
/**
 * Door or Window opening
 */
export interface RoomOpening {
    /** Unique identifier */
    id: string;
    /** Type of opening */
    type: 'door' | 'window';
    /** Position in 3D space (meters) */
    position: Vector3D;
    /** Opening width in meters */
    width: number;
    /** Opening height in meters */
    height: number;
    /** ID of wall this opening is in (iOS only) */
    wallId?: string;
    /** Detection confidence 0-1 */
    confidence: number;
}
/**
 * Complete room layout
 */
export interface RoomLayout {
    /** Unique identifier */
    id: string;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Room width in meters (X dimension) */
    width: number;
    /** Room length in meters (Z dimension) */
    length: number;
    /** Room height in meters (ceiling height) */
    height: number;
    /** Floor area in square meters */
    floorArea: number;
    /** Room volume in cubic meters */
    volume: number;
    /** All detected walls */
    walls: Wall[];
    /** All detected openings (doors + windows) */
    openings: RoomOpening[];
    /** Metadata about the scan */
    metadata: {
        /** Platform that performed the scan */
        platform: 'ios' | 'android';
        /** Scan duration in seconds */
        scanDuration: number;
        /** Whether device has LiDAR */
        hasLiDAR: boolean;
    };
}
/**
 * Room scanning error
 */
export declare class RoomScanError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
/**
 * Platform capabilities
 */
export interface ScanCapabilities {
    /** Is room scanning supported on this device/platform */
    isSupported: boolean;
    /** Platform name */
    platform: 'ios' | 'android' | 'unknown';
    /** Does device have LiDAR */
    hasLiDAR: boolean;
    /** Expected accuracy (0-1) */
    expectedAccuracy: number;
    /** Typical scan duration in seconds */
    typicalScanDuration: number;
}
//# sourceMappingURL=RoomLayout.d.ts.map