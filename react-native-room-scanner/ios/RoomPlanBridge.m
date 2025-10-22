/*
 * RoomPlanBridge.m
 * React Native Bridge for RoomPlan Module
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RoomPlanModule, RCTEventEmitter)

// Check if RoomPlan is supported
RCT_EXTERN_METHOD(isSupported:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Start room scanning
RCT_EXTERN_METHOD(startRoomScan:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Stop room scanning
RCT_EXTERN_METHOD(stopRoomScan)

@end
