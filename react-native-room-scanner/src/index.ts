/**
 * react-native-room-scanner
 * Cross-Platform Room Scanning Module
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

// Types
export type {
  Vector2D,
  Vector3D,
  Wall,
  RoomOpening,
  RoomLayout,
  ScanCapabilities
} from './types/RoomLayout';

export { RoomScanError } from './types/RoomLayout';

// Hooks
export { useRoomScanner } from './hooks/useRoomScanner';
export type {
  UseRoomScannerOptions,
  UseRoomScannerReturn
} from './hooks/useRoomScanner';

// Native Modules (for advanced usage)
import { NativeModules } from 'react-native';
const { RoomPlanModule, ARCoreModule } = NativeModules;

export { RoomPlanModule, ARCoreModule };
