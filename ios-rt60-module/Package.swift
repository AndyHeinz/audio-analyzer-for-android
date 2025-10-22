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
        .iOS(.v13),
        .macOS(.v10_15)
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
            path: "Sources/RT60"
        ),
        .testTarget(
            name: "RT60Tests",
            dependencies: ["RT60"]
        ),
    ]
)
