/*
 * RoomPlanScanner.swift
 * React Native RoomPlan Bridge - iOS Implementation
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 *
 * FIXED BUGS:
 * - Correct RoomPlan API usage (surfaces, not walls)
 * - Proper delegate memory management
 * - Correct coordinate extraction from transforms
 */

import Foundation
import RoomPlan
import React

@available(iOS 16.0, *)
@objc(RoomPlanModule)
class RoomPlanModule: RCTEventEmitter {

    private var captureSession: RoomCaptureSession?
    private var captureDelegate: RoomCaptureDelegate?
    private var scanStartTime: Date?

    // MARK: - RCTEventEmitter Override

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return ["onScanProgress", "onScanComplete", "onScanError"]
    }

    // MARK: - Public API

    @objc
    func isSupported(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(RoomCaptureSession.isSupported)
    }

    @objc
    func startRoomScan(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {

        guard RoomCaptureSession.isSupported else {
            reject("UNSUPPORTED", "RoomPlan not supported on this device", nil)
            return
        }

        // Create session
        let session = RoomCaptureSession()
        let delegate = RoomCaptureDelegate(
            onComplete: { [weak self] room in
                self?.handleScanComplete(room: room, resolve: resolve, reject: reject)
            },
            onError: { error in
                reject("SCAN_ERROR", error.localizedDescription, error)
            }
        )

        // FIXED: Store delegate to prevent deallocation!
        self.captureDelegate = delegate
        self.captureSession = session
        session.delegate = delegate

        // Start scanning
        scanStartTime = Date()
        let config = RoomCaptureSession.Configuration()
        session.run(configuration: config)

        print("[RoomPlan] Scan started")
    }

    @objc
    func stopRoomScan() {
        captureSession?.stop()
        captureSession = nil
        captureDelegate = nil
        print("[RoomPlan] Scan stopped")
    }

    // MARK: - Private Methods

    private func handleScanComplete(room: CapturedRoom,
                                   resolve: @escaping RCTPromiseResolveBlock,
                                   reject: @escaping RCTPromiseRejectBlock) {

        do {
            let layout = try convertRoomToLayout(room: room)
            resolve(layout)
            print("[RoomPlan] Scan complete - \(layout["walls"]!.count) walls")
        } catch {
            reject("CONVERSION_ERROR", "Failed to convert room data", error)
        }
    }

    // FIXED: Correct RoomPlan API usage!
    private func convertRoomToLayout(room: CapturedRoom) throws -> [String: Any] {

        var walls = [[String: Any]]()
        var openings = [[String: Any]]()

        // Extract walls from surfaces
        // FIXED: Use surfaces with category .wall, not room.walls!
        let wallSurfaces = room.surfaces.filter { $0.category == .wall }

        for (index, surface) in wallSurfaces.enumerated() {
            let wall = extractWallData(from: surface, id: "wall_\(index)")
            walls.append(wall)
        }

        // Extract doors
        for (index, door) in room.doors.enumerated() {
            let opening = extractOpeningData(from: door, type: "door", id: "door_\(index)")
            openings.append(opening)
        }

        // Extract windows
        for (index, window) in room.windows.enumerated() {
            let opening = extractOpeningData(from: window, type: "window", id: "window_\(index)")
            openings.append(opening)
        }

        // Calculate room dimensions
        let dimensions = calculateRoomDimensions(walls: wallSurfaces)

        let scanDuration = scanStartTime.map { Date().timeIntervalSince($0) } ?? 0

        return [
            "id": "room_\(Int(Date().timeIntervalSince1970 * 1000))",
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
            "width": dimensions.width,
            "length": dimensions.length,
            "height": dimensions.height,
            "floorArea": dimensions.width * dimensions.length,
            "volume": dimensions.width * dimensions.length * dimensions.height,
            "walls": walls,
            "openings": openings,
            "metadata": [
                "platform": "ios",
                "scanDuration": scanDuration,
                "hasLiDAR": true
            ]
        ]
    }

    // FIXED: Extract wall data from surface transform and dimensions
    private func extractWallData(from surface: CapturedRoom.Surface, id: String) -> [String: Any] {

        // Get transform matrix
        let transform = surface.transform

        // Extract position from transform (4th column)
        let position = SIMD3<Float>(
            transform.columns.3.x,
            transform.columns.3.y,
            transform.columns.3.z
        )

        // Get dimensions
        let width = surface.dimensions.x
        let height = surface.dimensions.y

        // Calculate start and end points
        // Wall is oriented along X axis in local space
        let halfWidth = width / 2.0

        // Transform local points to world space
        let localStart = SIMD4<Float>(-halfWidth, 0, 0, 1)
        let localEnd = SIMD4<Float>(halfWidth, 0, 0, 1)

        let worldStart = transform * localStart
        let worldEnd = transform * localEnd

        return [
            "id": id,
            "start": [
                "x": Double(worldStart.x),
                "z": Double(worldStart.z)
            ],
            "end": [
                "x": Double(worldEnd.x),
                "z": Double(worldEnd.z)
            ],
            "height": Double(height),
            "thickness": 0.15,  // Default wall thickness
            "confidence": Double(surface.confidence.rawValue) / 2.0  // Convert to 0-1
        ]
    }

    private func extractOpeningData(from object: CapturedRoom.Object,
                                   type: String,
                                   id: String) -> [String: Any] {

        let transform = object.transform
        let position = SIMD3<Float>(
            transform.columns.3.x,
            transform.columns.3.y,
            transform.columns.3.z
        )

        return [
            "id": id,
            "type": type,
            "position": [
                "x": Double(position.x),
                "y": Double(position.y),
                "z": Double(position.z)
            ],
            "width": Double(object.dimensions.x),
            "height": Double(object.dimensions.y),
            "confidence": Double(object.confidence.rawValue) / 2.0
        ]
    }

    private func calculateRoomDimensions(walls: [CapturedRoom.Surface]) -> (width: Double, length: Double, height: Double) {

        guard !walls.isEmpty else {
            return (0, 0, 0)
        }

        // Find bounding box
        var minX: Float = .infinity
        var maxX: Float = -.infinity
        var minZ: Float = .infinity
        var maxZ: Float = -.infinity
        var maxHeight: Float = 0

        for wall in walls {
            let position = wall.transform.columns.3
            let halfWidth = wall.dimensions.x / 2.0

            minX = min(minX, position.x - halfWidth)
            maxX = max(maxX, position.x + halfWidth)
            minZ = min(minZ, position.z - halfWidth)
            maxZ = max(maxZ, position.z + halfWidth)
            maxHeight = max(maxHeight, wall.dimensions.y)
        }

        let width = Double(maxX - minX)
        let length = Double(maxZ - minZ)
        let height = Double(maxHeight)

        return (width, length, height)
    }
}

// MARK: - Delegate

@available(iOS 16.0, *)
class RoomCaptureDelegate: NSObject, RoomCaptureSessionDelegate {

    let onComplete: (CapturedRoom) -> Void
    let onError: (Error) -> Void

    init(onComplete: @escaping (CapturedRoom) -> Void,
         onError: @escaping (Error) -> Void) {
        self.onComplete = onComplete
        self.onError = onError
    }

    func captureSession(_ session: RoomCaptureSession,
                       didUpdate room: CapturedRoom) {
        // Progressive updates (optional)
        print("[RoomPlan] Room updated - surfaces: \(room.surfaces.count)")
    }

    func captureSession(_ session: RoomCaptureSession,
                       didEndWith data: CapturedRoomData,
                       error: Error?) {

        if let error = error {
            print("[RoomPlan] Session ended with error: \(error)")
            onError(error)
            return
        }

        // Export final room
        Task {
            do {
                let finalRoom = try await data.export()
                DispatchQueue.main.async {
                    self.onComplete(finalRoom)
                }
            } catch {
                print("[RoomPlan] Export error: \(error)")
                DispatchQueue.main.async {
                    self.onError(error)
                }
            }
        }
    }
}
