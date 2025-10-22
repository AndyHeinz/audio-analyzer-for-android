// swift-tools-version: 5.7
/*
 * Package.swift
 * RT60 Module for iOS
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

import PackageDescription

let package = Package(
    name: "RT60",
    platforms: [
        .iOS(.v16),      // Updated for RoomPlan support
        .macOS(.v13)     // Updated for RoomPlan support
    ],
    products: [
        .library(
            name: "RT60",
            targets: ["RT60"]
        ),
    ],
    targets: [
        .target(
            name: "RT60",
            dependencies: [],
            path: "Sources/RT60",
            linkerSettings: [
                .linkedFramework("RoomPlan", .when(platforms: [.iOS, .macOS]))
            ]
        ),
        .testTarget(
            name: "RT60Tests",
            dependencies: ["RT60"]
        ),
    ]
)
