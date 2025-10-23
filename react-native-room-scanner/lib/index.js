/**
 * react-native-room-scanner
 * Cross-Platform Room Scanning Module
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */
export { RoomScanError } from './types/RoomLayout';
// Hooks
export { useRoomScanner } from './hooks/useRoomScanner';
// Native Modules (for advanced usage)
import { NativeModules } from 'react-native';
const { RoomPlanModule, ARCoreModule } = NativeModules;
export { RoomPlanModule, ARCoreModule };
