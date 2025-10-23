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
 *
 * PRODUCTION-READY - ALL BUGS FIXED:
 * BUG #1 (CRITICAL): Fixed unsafe ReadableMap access - added hasKey() checks
 * BUG #2 (HIGH): Removed duplicate startRoomScan() method (React Native doesn't support overloading)
 * BUG #3 (HIGH): Added onCatalystInstanceDestroy() cleanup to prevent memory leaks
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

            // FIXED: Safe ReadableMap access with hasKey() checks
            val manualWidth = if (options?.hasKey("width") == true) {
                options.getDouble("width").takeIf { !it.isNaN() }
            } else null

            val manualLength = if (options?.hasKey("length") == true) {
                options.getDouble("length").takeIf { !it.isNaN() }
            } else null

            val manualHeight = if (options?.hasKey("height") == true) {
                options.getDouble("height").takeIf { !it.isNaN() }
            } else null

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
     * Stop current scan
     */
    @ReactMethod
    fun stopRoomScan() {
        Log.i(TAG, "Stopping room scan")
        // ARCoreRoomScanner handles cleanup automatically
    }

    /**
     * FIXED: Proper cleanup to prevent memory leaks
     * Called when React Native module is destroyed
     */
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        scanner.cleanup()
        Log.i(TAG, "RoomScannerModule destroyed and cleaned up")
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
