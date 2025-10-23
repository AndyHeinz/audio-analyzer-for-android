/**
 * RoomLayout.ts
 * TypeScript type definitions for Room Scanning
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */
/**
 * Room scanning error
 */
export class RoomScanError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'RoomScanError';
    }
}
