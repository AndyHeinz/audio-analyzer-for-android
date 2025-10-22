/*
 * AcousticAnalyzerView.swift
 * Combined RT60 + RoomPlan Analysis View
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 *
 * SwiftUI view combining RT60 measurement with RoomPlan scanning
 * for complete acoustic room analysis
 */

import SwiftUI
import RoomPlan

#if !targetEnvironment(simulator)

/// Complete acoustic analyzer with RT60 and RoomPlan
@available(iOS 16.0, *)
public struct AcousticAnalyzerView: View {

    // MARK: - State Objects

    @StateObject private var rt60Recorder: RT60Recorder
    @StateObject private var roomScanner = RoomPlanScanner()

    // MARK: - State

    @State private var currentStep: AnalysisStep = .intro
    @State private var rt60Result: RT60Result?
    @State private var analysis: AcousticRoomAnalysis?
    @State private var showingRoomCaptureView = false

    // MARK: - Analysis Steps

    enum AnalysisStep {
        case intro
        case scanningRoom
        case measuringRT60
        case analyzing
        case results
    }

    // MARK: - Initialization

    public init(sampleRate: Double = 48000) {
        let config = RT60Config(sampleRate: sampleRate)
        let calculator = RT60Calculator(config: config)
        _rt60Recorder = StateObject(wrappedValue: RT60Recorder(calculator: calculator))
    }

    // MARK: - Body

    public var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Progress indicator
                StepProgressView(currentStep: currentStep)
                    .padding()

                // Main content
                ScrollView {
                    VStack(spacing: 20) {
                        switch currentStep {
                        case .intro:
                            introView
                        case .scanningRoom:
                            roomScanningView
                        case .measuringRT60:
                            rt60MeasurementView
                        case .analyzing:
                            analyzingView
                        case .results:
                            resultsView
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Acoustic Analyzer")
            .sheet(isPresented: $showingRoomCaptureView) {
                #if !targetEnvironment(simulator)
                if RoomCaptureSession.isSupported {
                    RoomCaptureView(session: RoomCaptureSession())
                        .navigationTitle("Scan Room")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Cancel") {
                                    showingRoomCaptureView = false
                                    roomScanner.stopScanning()
                                }
                            }
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Done") {
                                    showingRoomCaptureView = false
                                    roomScanner.stopScanning()
                                    currentStep = .measuringRT60
                                }
                            }
                        }
                }
                #endif
            }
        }
    }

    // MARK: - View Components

    private var introView: some View {
        VStack(spacing: 20) {
            Image(systemName: "waveform.path.ecg")
                .font(.system(size: 80))
                .foregroundColor(.blue)

            Text("Acoustic Room Analyzer")
                .font(.title)
                .fontWeight(.bold)

            Text("Combines 3D room scanning with RT60 measurement for complete acoustic analysis")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 12) {
                FeatureRow(icon: "cube.fill", title: "3D Room Scan", description: "Capture room geometry with LiDAR")
                FeatureRow(icon: "waveform", title: "RT60 Measurement", description: "Measure reverberation time")
                FeatureRow(icon: "chart.bar.fill", title: "Acoustic Analysis", description: "Calculate absorption & quality")
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(12)

            if !RoomPlanScanner.isSupported {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("LiDAR scanner not available on this device")
                        .font(.caption)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }

            Button(action: {
                if RoomPlanScanner.isSupported {
                    currentStep = .scanningRoom
                    showingRoomCaptureView = true
                    roomScanner.startScanning()
                } else {
                    // Skip to RT60 only
                    currentStep = .measuringRT60
                }
            }) {
                Text(RoomPlanScanner.isSupported ? "Start Analysis" : "RT60 Only")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(12)
            }
        }
    }

    private var roomScanningView: some View {
        VStack(spacing: 20) {
            Image(systemName: "cube.transparent")
                .font(.system(size: 60))
                .foregroundColor(.blue)

            Text("Scanning Room")
                .font(.title2)
                .fontWeight(.bold)

            Text("Walk around the room slowly, pointing your device at walls, floor, and ceiling")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            if let geometry = roomScanner.roomGeometry {
                VStack(spacing: 12) {
                    GeometryInfoRow(label: "Volume", value: String(format: "%.1f m³", geometry.volume))
                    GeometryInfoRow(label: "Floor Area", value: String(format: "%.1f m²", geometry.floorArea))
                    GeometryInfoRow(label: "Height", value: String(format: "%.2f m", geometry.ceilingHeight))
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
            }

            if roomScanner.isScanning {
                ProgressView("Scanning...")
                    .padding()
            }
        }
    }

    private var rt60MeasurementView: some View {
        VStack(spacing: 20) {
            Image(systemName: "waveform.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)

            Text("RT60 Measurement")
                .font(.title2)
                .fontWeight(.bold)

            Text(rt60Recorder.calculator.currentStatus)
                .font(.body)
                .foregroundColor(.secondary)

            if let result = rt60Recorder.currentResult, result.rt60 > 0 {
                VStack(spacing: 12) {
                    RT60InfoRow(label: "RT60", value: String(format: "%.2f s", result.rt60))
                    RT60InfoRow(label: "RT30", value: String(format: "%.2f s", result.rt30))
                    RT60InfoRow(label: "RT20", value: String(format: "%.2f s", result.rt20))
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(12)
            }

            HStack(spacing: 20) {
                Button(action: {
                    do {
                        try rt60Recorder.startMeasurement()
                    } catch {
                        print("Error starting RT60: \(error)")
                    }
                }) {
                    Label("Start", systemImage: "play.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(rt60Recorder.calculator.recording)

                Button(action: {
                    rt60Recorder.stopMeasurement()

                    if let result = rt60Recorder.currentResult,
                       let geometry = roomScanner.roomGeometry {
                        performAnalysis(rt60: result, geometry: geometry)
                    }
                }) {
                    Label("Done", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .disabled(!rt60Recorder.calculator.recording && rt60Result == nil)
            }
        }
    }

    private var analyzingView: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(2)

            Text("Analyzing Acoustics...")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Calculating absorption coefficients and room quality")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(40)
    }

    private var resultsView: some View {
        VStack(spacing: 20) {
            if let analysis = analysis {
                // Quality Badge
                VStack(spacing: 8) {
                    Text(analysis.acousticQuality.emoji)
                        .font(.system(size: 60))
                    Text(analysis.acousticQuality.rawValue)
                        .font(.title)
                        .fontWeight(.bold)
                    Text(analysis.roomType.rawValue)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(16)

                // Key Metrics
                VStack(spacing: 12) {
                    ResultRow(label: "Measured RT60", value: String(format: "%.2f s", analysis.rt60Result.rt60))
                    ResultRow(label: "Theoretical RT60", value: String(format: "%.2f s", analysis.theoreticalRT60Sabine))
                    ResultRow(label: "Room Volume", value: String(format: "%.1f m³", analysis.roomGeometry.volume))
                    ResultRow(label: "Absorption Coeff.", value: String(format: "%.3f", analysis.meanAbsorptionCoefficient))
                }
                .padding()
                .background(Color.gray.opacity(0.05))
                .cornerRadius(12)

                // Recommendations
                VStack(alignment: .leading, spacing: 12) {
                    Text("Recommendations")
                        .font(.headline)

                    ForEach(analysis.recommendations, id: \.self) { recommendation in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "arrow.right.circle.fill")
                                .foregroundColor(.blue)
                                .font(.caption)
                            Text(recommendation)
                                .font(.subheadline)
                        }
                    }
                }
                .padding()
                .background(Color.gray.opacity(0.05))
                .cornerRadius(12)

                // Actions
                HStack(spacing: 12) {
                    Button(action: {
                        shareAnalysis()
                    }) {
                        Label("Share", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                    }

                    Button(action: {
                        resetAnalysis()
                    }) {
                        Label("New", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.gray.opacity(0.2))
                            .foregroundColor(.primary)
                            .cornerRadius(10)
                    }
                }
            }
        }
    }

    // MARK: - Helper Views

    private struct StepProgressView: View {
        let currentStep: AnalysisStep

        var body: some View {
            HStack(spacing: 8) {
                StepIndicator(step: 1, currentStep: currentStep, label: "Scan")
                Divider()
                StepIndicator(step: 2, currentStep: currentStep, label: "RT60")
                Divider()
                StepIndicator(step: 3, currentStep: currentStep, label: "Results")
            }
            .frame(height: 60)
        }

        private struct StepIndicator: View {
            let step: Int
            let currentStep: AnalysisStep
            let label: String

            var isActive: Bool {
                switch currentStep {
                case .intro: return false
                case .scanningRoom: return step == 1
                case .measuringRT60: return step == 2
                case .analyzing, .results: return step == 3
                }
            }

            var isCompleted: Bool {
                switch currentStep {
                case .intro, .scanningRoom: return false
                case .measuringRT60: return step < 2
                case .analyzing, .results: return step < 3
                }
            }

            var body: some View {
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(isActive ? Color.blue : (isCompleted ? Color.green : Color.gray.opacity(0.3)))
                            .frame(width: 30, height: 30)

                        if isCompleted {
                            Image(systemName: "checkmark")
                                .foregroundColor(.white)
                                .font(.caption)
                        } else {
                            Text("\(step)")
                                .foregroundColor(.white)
                                .font(.caption)
                        }
                    }
                    Text(label)
                        .font(.caption2)
                        .foregroundColor(isActive ? .primary : .secondary)
                }
            }
        }
    }

    private struct FeatureRow: View {
        let icon: String
        let title: String
        let description: String

        var body: some View {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.blue)
                    .frame(width: 30)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
        }
    }

    private struct GeometryInfoRow: View {
        let label: String
        let value: String

        var body: some View {
            HStack {
                Text(label)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }
        }
    }

    private struct RT60InfoRow: View {
        let label: String
        let value: String

        var body: some View {
            HStack {
                Text(label)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Spacer()
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
            }
        }
    }

    private struct ResultRow: View {
        let label: String
        let value: String

        var body: some View {
            HStack {
                Text(label)
                    .font(.body)
                Spacer()
                Text(value)
                    .font(.body)
                    .fontWeight(.semibold)
            }
        }
    }

    // MARK: - Actions

    private func performAnalysis(rt60: RT60Result, geometry: RoomGeometry) {
        currentStep = .analyzing
        rt60Result = rt60

        // Simulate processing time
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let analysisResult = AcousticRoomAnalysis(rt60Result: rt60, roomGeometry: geometry)
            self.analysis = analysisResult
            currentStep = .results
        }
    }

    private func shareAnalysis() {
        guard let analysis = analysis else { return }

        let activityVC = UIActivityViewController(
            activityItems: [analysis.summary],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let rootVC = windowScene.windows.first?.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }

    private func resetAnalysis() {
        currentStep = .intro
        rt60Result = nil
        analysis = nil
        roomScanner.reset()
        rt60Recorder.calculator.reset()
    }
}

#else

// Simulator stub
@available(iOS 16.0, *)
public struct AcousticAnalyzerView: View {
    public init(sampleRate: Double = 48000) {}

    public var body: some View {
        Text("Acoustic Analyzer requires LiDAR (not available in simulator)")
            .padding()
    }
}

#endif
