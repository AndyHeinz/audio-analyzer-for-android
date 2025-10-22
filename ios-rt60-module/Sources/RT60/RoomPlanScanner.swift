/*
 * RoomPlanScanner.swift
 * RoomPlan Integration for RT60
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 *
 * Integrates Apple's RoomPlan API for 3D room scanning
 * Combines room geometry with RT60 acoustic measurements
 */

import Foundation
import RoomPlan
import SwiftUI

#if !targetEnvironment(simulator)

/// Room geometry data extracted from RoomPlan
@available(iOS 16.0, *)
public struct RoomGeometry {
    public let volume: Double           // m³
    public let totalSurfaceArea: Double // m²
    public let floorArea: Double        // m²
    public let ceilingHeight: Double    // m
    public let wallArea: Double         // m²

    public let walls: [Surface]
    public let floors: [Surface]
    public let ceilings: [Surface]
    public let objects: [RoomObject]

    public struct Surface {
        public let area: Double         // m²
        public let dimensions: SIMD3<Float>
        public let transform: simd_float4x4
        public let category: String
    }

    public struct RoomObject {
        public let category: String
        public let dimensions: SIMD3<Float>
        public let confidence: Float
    }
}

/// RoomPlan scanning coordinator
@available(iOS 16.0, *)
public final class RoomPlanScanner: NSObject, ObservableObject {

    // MARK: - Published Properties

    @Published public private(set) var isScanning = false
    @Published public private(set) var capturedRoom: CapturedRoom?
    @Published public private(set) var roomGeometry: RoomGeometry?
    @Published public private(set) var error: ScanError?

    // MARK: - Private Properties

    private var captureSession: RoomCaptureSession?
    private var sessionConfig = RoomCaptureSession.Configuration()

    // MARK: - Error Types

    public enum ScanError: LocalizedError {
        case lidarNotSupported
        case sessionError(String)
        case processingError(String)

        public var errorDescription: String? {
            switch self {
            case .lidarNotSupported:
                return "LiDAR scanner not available on this device"
            case .sessionError(let msg):
                return "Scan session error: \(msg)"
            case .processingError(let msg):
                return "Processing error: \(msg)"
            }
        }
    }

    // MARK: - Initialization

    public override init() {
        super.init()
        setupSession()
    }

    // MARK: - Public API

    /// Check if device supports RoomPlan
    public static var isSupported: Bool {
        return RoomCaptureSession.isSupported
    }

    /// Start room scanning
    public func startScanning() {
        guard RoomCaptureSession.isSupported else {
            error = .lidarNotSupported
            return
        }

        guard let session = captureSession else {
            setupSession()
            guard let session = captureSession else {
                error = .sessionError("Failed to create session")
                return
            }
            session.run(configuration: sessionConfig)
            isScanning = true
            return
        }

        session.run(configuration: sessionConfig)
        isScanning = true
        error = nil

        print("[RoomPlan] Scanning started")
    }

    /// Stop room scanning
    public func stopScanning() {
        captureSession?.stop()
        isScanning = false

        print("[RoomPlan] Scanning stopped")
    }

    /// Process the captured room data
    public func processCapturedRoom() {
        guard let room = capturedRoom else {
            error = .processingError("No captured room data")
            return
        }

        do {
            let geometry = try extractGeometry(from: room)
            self.roomGeometry = geometry

            print("[RoomPlan] Room processed - Volume: \(geometry.volume)m³, Floor area: \(geometry.floorArea)m²")
        } catch {
            self.error = .processingError(error.localizedDescription)
        }
    }

    /// Reset all data
    public func reset() {
        capturedRoom = nil
        roomGeometry = nil
        error = nil
        isScanning = false

        captureSession?.stop()
        setupSession()
    }

    // MARK: - Private Methods

    private func setupSession() {
        guard RoomCaptureSession.isSupported else { return }

        let session = RoomCaptureSession()
        session.delegate = self
        self.captureSession = session
    }

    private func extractGeometry(from room: CapturedRoom) throws -> RoomGeometry {
        // Extract surfaces
        var walls: [RoomGeometry.Surface] = []
        var floors: [RoomGeometry.Surface] = []
        var ceilings: [RoomGeometry.Surface] = []

        var totalWallArea: Double = 0
        var totalFloorArea: Double = 0
        var totalCeilingArea: Double = 0

        for surface in room.surfaces {
            let area = Double(surface.dimensions.x * surface.dimensions.y)

            let geometrySurface = RoomGeometry.Surface(
                area: area,
                dimensions: surface.dimensions,
                transform: surface.transform,
                category: surface.category.rawValue
            )

            switch surface.category {
            case .wall:
                walls.append(geometrySurface)
                totalWallArea += area
            case .floor:
                floors.append(geometrySurface)
                totalFloorArea += area
            case .ceiling:
                ceilings.append(geometrySurface)
                totalCeilingArea += area
            default:
                break
            }
        }

        // Extract objects
        var objects: [RoomGeometry.RoomObject] = []
        for object in room.objects {
            let roomObject = RoomGeometry.RoomObject(
                category: object.category.rawValue,
                dimensions: object.dimensions,
                confidence: object.confidence
            )
            objects.append(roomObject)
        }

        // Calculate room metrics
        let floorArea = totalFloorArea

        // Estimate ceiling height from wall areas and floor area
        let ceilingHeight: Double
        if totalWallArea > 0 && floorArea > 0 {
            // Approximate: wall area ≈ perimeter × height
            // Assume roughly square room: perimeter ≈ 4 × sqrt(area)
            let approxPerimeter = 4.0 * sqrt(floorArea)
            ceilingHeight = totalWallArea / approxPerimeter
        } else {
            ceilingHeight = 2.5 // Default fallback
        }

        let volume = floorArea * ceilingHeight
        let totalSurfaceArea = totalWallArea + totalFloorArea + totalCeilingArea

        return RoomGeometry(
            volume: volume,
            totalSurfaceArea: totalSurfaceArea,
            floorArea: floorArea,
            ceilingHeight: ceilingHeight,
            wallArea: totalWallArea,
            walls: walls,
            floors: floors,
            ceilings: ceilings,
            objects: objects
        )
    }
}

// MARK: - RoomCaptureSessionDelegate

@available(iOS 16.0, *)
extension RoomPlanScanner: RoomCaptureSessionDelegate {

    public func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        DispatchQueue.main.async {
            self.capturedRoom = room
        }
    }

    public func captureSession(_ session: RoomCaptureSession, didEndWith data: CapturedRoomData, error: Error?) {
        DispatchQueue.main.async {
            self.isScanning = false

            if let error = error {
                self.error = .sessionError(error.localizedDescription)
                print("[RoomPlan] Session ended with error: \(error)")
            } else {
                print("[RoomPlan] Session completed successfully")

                // Finalize the room
                Task {
                    do {
                        let finalRoom = try await data.export()
                        DispatchQueue.main.async {
                            self.capturedRoom = finalRoom
                            self.processCapturedRoom()
                        }
                    } catch {
                        DispatchQueue.main.async {
                            self.error = .processingError(error.localizedDescription)
                        }
                    }
                }
            }
        }
    }
}

#else

// Simulator stub
@available(iOS 16.0, *)
public struct RoomGeometry {
    public let volume: Double = 0
    public let totalSurfaceArea: Double = 0
    public let floorArea: Double = 0
    public let ceilingHeight: Double = 0
    public let wallArea: Double = 0
    public let walls: [Surface] = []
    public let floors: [Surface] = []
    public let ceilings: [Surface] = []
    public let objects: [RoomObject] = []

    public struct Surface {
        public let area: Double = 0
        public let dimensions: SIMD3<Float> = SIMD3<Float>(0, 0, 0)
        public let transform: simd_float4x4 = matrix_identity_float4x4
        public let category: String = ""
    }

    public struct RoomObject {
        public let category: String = ""
        public let dimensions: SIMD3<Float> = SIMD3<Float>(0, 0, 0)
        public let confidence: Float = 0
    }
}

@available(iOS 16.0, *)
public final class RoomPlanScanner: ObservableObject {
    @Published public private(set) var isScanning = false
    @Published public private(set) var roomGeometry: RoomGeometry?
    @Published public private(set) var error: ScanError?

    public enum ScanError: LocalizedError {
        case lidarNotSupported
        case sessionError(String)
        case processingError(String)

        public var errorDescription: String? {
            switch self {
            case .lidarNotSupported: return "LiDAR not supported in simulator"
            case .sessionError(let msg): return msg
            case .processingError(let msg): return msg
            }
        }
    }

    public static var isSupported: Bool { false }
    public func startScanning() { error = .lidarNotSupported }
    public func stopScanning() {}
    public func reset() {}
}

#endif
