/*
 * RoomScannerModule.kt
 * React Native ARCore Bridge - PRODUCTION-READY Android Implementation
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 *
 * HYBRID APPROACH:
 * 1. Manual input (PRIMARY - always works!)
 * 2. ARCore planes (BONUS - if available)
 * 3. Smart fallback (DEFAULT - reasonable room)
 */

package com.roomscanner

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.util.Log

class RoomScannerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "RoomScanner"
    }

    private val scanner = ARCoreRoomScanner(reactContext)

    override fun getName() = "ARCoreModule"

    /**
     * Check if ARCore is supported on this device
     */
    @ReactMethod
    fun isSupported(promise: Promise) {
        try {
            val isSupported = scanner.isARCoreAvailable()
            Log.i(TAG, "ARCore supported: $isSupported")
            promise.resolve(isSupported)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking ARCore support", e)
            promise.resolve(false)
        }
    }

    /**
     * Start room scanning - PRODUCTION-READY HYBRID APPROACH
     *
     * Options:
     * 1. With manual dimensions (RECOMMENDED for production):
     *    startRoomScan({ width: 5.2, length: 4.8, height: 2.5 })
     *
     * 2. With ARCore auto-detection (if available):
     *    startRoomScan()
     *
     * 3. Smart fallback (reasonable default):
     *    startRoomScan()
     */
    @ReactMethod
    fun startRoomScan(options: ReadableMap?, promise: Promise) {
        try {
            Log.i(TAG, "Starting room scan")

            // Extract manual dimensions if provided
            val manualWidth = options?.getDouble("width")?.takeIf { !it.isNaN() }
            val manualLength = options?.getDouble("length")?.takeIf { !it.isNaN() }
            val manualHeight = options?.getDouble("height")?.takeIf { !it.isNaN() }

            // Start hybrid scan
            scanner.startScan(
                manualWidth,
                manualLength,
                manualHeight,
                promise
            )

        } catch (e: Exception) {
            Log.e(TAG, "Error during room scan", e)
            promise.reject("SCAN_ERROR", "Room scan failed: ${e.message}", e)
        }
    }

    /**
     * Start room scanning without options (for backwards compatibility)
     */
    @ReactMethod
    fun startRoomScan(promise: Promise) {
        startRoomScan(null, promise)
    }

    /**
     * Stop current scan
     */
    @ReactMethod
    fun stopRoomScan() {
        Log.i(TAG, "Stopping room scan")
        // ARCoreRoomScanner handles cleanup automatically
    }

    /**
     * Send event to JavaScript
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
