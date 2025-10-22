/*
 * RoomScannerPackage.kt
 * React Native Package for Room Scanner Module
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

package com.roomscanner

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class RoomScannerPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(RoomScannerModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
