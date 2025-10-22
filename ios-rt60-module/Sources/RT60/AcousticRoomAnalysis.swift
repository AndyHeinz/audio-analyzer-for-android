/*
 * AcousticRoomAnalysis.swift
 * Acoustic Room Analysis - Combines RT60 with Room Geometry
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 *
 * Combines RT60 measurements with RoomPlan geometry data
 * to calculate acoustic properties and analyze room acoustics
 */

import Foundation

/// Complete acoustic analysis of a room
@available(iOS 16.0, *)
public struct AcousticRoomAnalysis {

    // MARK: - Measured Data

    public let rt60Result: RT60Result
    public let roomGeometry: RoomGeometry

    // MARK: - Calculated Acoustic Properties

    /// Mean absorption coefficient (Sabine formula)
    public let meanAbsorptionCoefficient: Double

    /// Total absorption in the room (Sabins)
    public let totalAbsorption: Double

    /// Theoretical RT60 based on Sabine formula
    public let theoreticalRT60Sabine: Double

    /// Theoretical RT60 based on Eyring formula
    public let theoreticalRT60Eyring: Double

    /// Difference between measured and theoretical RT60
    public let rt60Deviation: Double

    /// Room acoustic quality assessment
    public let acousticQuality: AcousticQuality

    // MARK: - Room Classification

    public let roomType: RoomType

    public enum RoomType: String {
        case small = "Small Room"       // < 50 m³
        case medium = "Medium Room"     // 50-200 m³
        case large = "Large Room"       // 200-500 m³
        case hall = "Hall/Auditorium"   // > 500 m³
    }

    public enum AcousticQuality: String {
        case excellent = "Excellent"    // RT60 in optimal range
        case good = "Good"              // RT60 acceptable
        case acceptable = "Acceptable"  // RT60 slightly off
        case poor = "Poor"              // RT60 too short/long
        case veryPoor = "Very Poor"     // RT60 far from optimal

        public var emoji: String {
            switch self {
            case .excellent: return "🟢"
            case .good: return "🟡"
            case .acceptable: return "🟠"
            case .poor: return "🔴"
            case .veryPoor: return "⛔"
            }
        }
    }

    // MARK: - Recommendations

    public let recommendations: [String]

    // MARK: - Initialization

    public init(rt60Result: RT60Result, roomGeometry: RoomGeometry) {
        self.rt60Result = rt60Result
        self.roomGeometry = roomGeometry

        // Classify room type
        self.roomType = Self.classifyRoomType(volume: roomGeometry.volume)

        // Calculate mean absorption coefficient using Sabine formula
        // Sabine: RT60 = 0.161 × V / A
        // Where: V = volume (m³), A = total absorption (m²)
        // Rearranged: A = 0.161 × V / RT60
        let measuredRT60 = rt60Result.rt60

        if measuredRT60 > 0.01 {
            // Calculate total absorption from measured RT60
            self.totalAbsorption = 0.161 * roomGeometry.volume / measuredRT60

            // Calculate mean absorption coefficient
            // α_mean = A / S (where S = total surface area)
            self.meanAbsorptionCoefficient = min(1.0, totalAbsorption / roomGeometry.totalSurfaceArea)

            // Calculate theoretical RT60 using Sabine formula
            self.theoreticalRT60Sabine = 0.161 * roomGeometry.volume / totalAbsorption

            // Calculate theoretical RT60 using Eyring formula
            // Eyring: RT60 = 0.161 × V / (-S × ln(1 - α))
            let eyringDenominator = -roomGeometry.totalSurfaceArea * log(1.0 - meanAbsorptionCoefficient)
            self.theoreticalRT60Eyring = eyringDenominator > 0.001
                ? 0.161 * roomGeometry.volume / eyringDenominator
                : measuredRT60

            // Calculate deviation
            self.rt60Deviation = abs(measuredRT60 - theoreticalRT60Sabine) / measuredRT60

        } else {
            // Invalid measurement
            self.totalAbsorption = 0
            self.meanAbsorptionCoefficient = 0
            self.theoreticalRT60Sabine = 0
            self.theoreticalRT60Eyring = 0
            self.rt60Deviation = 0
        }

        // Assess acoustic quality
        self.acousticQuality = Self.assessAcousticQuality(
            rt60: measuredRT60,
            volume: roomGeometry.volume,
            roomType: roomType
        )

        // Generate recommendations
        self.recommendations = Self.generateRecommendations(
            rt60: measuredRT60,
            absorption: meanAbsorptionCoefficient,
            quality: acousticQuality,
            roomType: roomType,
            geometry: roomGeometry
        )
    }

    // MARK: - Helper Methods

    private static func classifyRoomType(volume: Double) -> RoomType {
        switch volume {
        case 0..<50:
            return .small
        case 50..<200:
            return .medium
        case 200..<500:
            return .large
        default:
            return .hall
        }
    }

    private static func assessAcousticQuality(rt60: Double, volume: Double, roomType: RoomType) -> AcousticQuality {
        // Optimal RT60 ranges based on room type (for speech)
        let optimalRange: ClosedRange<Double>
        let acceptableRange: ClosedRange<Double>

        switch roomType {
        case .small:
            optimalRange = 0.3...0.5
            acceptableRange = 0.2...0.7
        case .medium:
            optimalRange = 0.4...0.7
            acceptableRange = 0.3...1.0
        case .large:
            optimalRange = 0.6...1.0
            acceptableRange = 0.4...1.5
        case .hall:
            optimalRange = 0.8...1.5
            acceptableRange = 0.6...2.0
        }

        if optimalRange.contains(rt60) {
            return .excellent
        } else if acceptableRange.contains(rt60) {
            if abs(rt60 - optimalRange.lowerBound) < 0.1 || abs(rt60 - optimalRange.upperBound) < 0.1 {
                return .good
            } else {
                return .acceptable
            }
        } else if rt60 < acceptableRange.lowerBound - 0.2 || rt60 > acceptableRange.upperBound + 0.5 {
            return .veryPoor
        } else {
            return .poor
        }
    }

    private static func generateRecommendations(
        rt60: Double,
        absorption: Double,
        quality: AcousticQuality,
        roomType: RoomType,
        geometry: RoomGeometry
    ) -> [String] {

        var recommendations: [String] = []

        // Get optimal RT60 for room type
        let optimalRT60: Double
        switch roomType {
        case .small: optimalRT60 = 0.4
        case .medium: optimalRT60 = 0.55
        case .large: optimalRT60 = 0.8
        case .hall: optimalRT60 = 1.2
        }

        // RT60 too long (too reverberant)
        if rt60 > optimalRT60 * 1.3 {
            recommendations.append("⚠️ Room is too reverberant (RT60 too long)")
            recommendations.append("Add acoustic panels or sound-absorbing materials")
            recommendations.append("Consider carpets, curtains, or acoustic ceiling tiles")

            if geometry.floorArea > 10 {
                recommendations.append("Large floor area detected - add rugs or carpet")
            }

            if absorption < 0.15 {
                recommendations.append("Very low absorption - add soft furnishings (sofas, cushions)")
            }
        }

        // RT60 too short (too dead)
        if rt60 < optimalRT60 * 0.7 {
            recommendations.append("⚠️ Room is too acoustically dead (RT60 too short)")
            recommendations.append("Add reflective surfaces to increase reverberation")
            recommendations.append("Consider hard flooring or reducing soft materials")

            if absorption > 0.4 {
                recommendations.append("Very high absorption detected - remove some absorbers")
            }
        }

        // Optimal quality
        if quality == .excellent {
            recommendations.append("✅ Acoustic quality is excellent for this room type")
            recommendations.append("RT60 is in the optimal range for speech clarity")
        } else if quality == .good {
            recommendations.append("✅ Acoustic quality is good")
            recommendations.append("Minor adjustments could optimize further")
        }

        // Room-specific recommendations
        if roomType == .small && rt60 > 0.6 {
            recommendations.append("Small rooms benefit from more absorption")
        }

        if roomType == .hall && rt60 < 0.8 {
            recommendations.append("Halls typically need more reverberation for music")
        }

        // Object-based recommendations
        let furnitureCount = geometry.objects.count
        if furnitureCount < 3 && rt60 > optimalRT60 {
            recommendations.append("Add furniture to increase absorption")
        }

        if recommendations.isEmpty {
            recommendations.append("No specific recommendations - room acoustics are acceptable")
        }

        return recommendations
    }

    // MARK: - Summary

    public var summary: String {
        """
        Acoustic Room Analysis Summary
        ==============================

        Room Dimensions:
        - Volume: \(String(format: "%.1f", roomGeometry.volume)) m³
        - Floor Area: \(String(format: "%.1f", roomGeometry.floorArea)) m²
        - Ceiling Height: \(String(format: "%.2f", roomGeometry.ceilingHeight)) m
        - Total Surface Area: \(String(format: "%.1f", roomGeometry.totalSurfaceArea)) m²
        - Room Type: \(roomType.rawValue)

        RT60 Measurements:
        - Measured RT60: \(String(format: "%.2f", rt60Result.rt60)) s
        - RT30: \(String(format: "%.2f", rt60Result.rt30)) s
        - RT20: \(String(format: "%.2f", rt60Result.rt20)) s

        Acoustic Properties:
        - Mean Absorption Coefficient: \(String(format: "%.3f", meanAbsorptionCoefficient))
        - Total Absorption: \(String(format: "%.1f", totalAbsorption)) m² (Sabins)
        - Theoretical RT60 (Sabine): \(String(format: "%.2f", theoreticalRT60Sabine)) s
        - Theoretical RT60 (Eyring): \(String(format: "%.2f", theoreticalRT60Eyring)) s
        - Deviation: \(String(format: "%.1f", rt60Deviation * 100))%

        Quality Assessment: \(acousticQuality.emoji) \(acousticQuality.rawValue)

        Recommendations:
        \(recommendations.map { "• \($0)" }.joined(separator: "\n"))
        """
    }
}

// MARK: - Quick Analysis Function

@available(iOS 16.0, *)
extension AcousticRoomAnalysis {

    /// Quick analysis function
    public static func analyze(rt60Result: RT60Result, roomGeometry: RoomGeometry) -> AcousticRoomAnalysis {
        return AcousticRoomAnalysis(rt60Result: rt60Result, roomGeometry: roomGeometry)
    }
}
