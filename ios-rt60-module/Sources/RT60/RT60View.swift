/*
 * RT60View.swift
 * SwiftUI view for RT60 measurement
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

#if canImport(SwiftUI)
import SwiftUI

@available(iOS 13.0, *)
public struct RT60View: View {
    @StateObject private var viewModel: RT60ViewModel

    public init(config: RT60Config = RT60Config(sampleRate: 48000)) {
        _viewModel = StateObject(wrappedValue: RT60ViewModel(config: config))
    }

    public var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                Text("RT60 Measurement")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Reverberation Time Analysis")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top)

            // Controls
            HStack(spacing: 12) {
                Button(action: { viewModel.startMeasurement() }) {
                    HStack {
                        Image(systemName: "play.circle.fill")
                        Text("Start")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isRecording)

                Button(action: { viewModel.stopMeasurement() }) {
                    HStack {
                        Image(systemName: "stop.circle.fill")
                        Text("Stop")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .disabled(!viewModel.isRecording)

                Button(action: { viewModel.reset() }) {
                    HStack {
                        Image(systemName: "arrow.clockwise")
                        Text("Reset")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
            .padding(.horizontal)

            // Status
            if viewModel.isRecording {
                HStack {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 12, height: 12)
                    Text(viewModel.status)
                        .font(.caption)
                }
                .padding(.horizontal)
            }

            // Error
            if let error = viewModel.error {
                Text(error)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding(.horizontal)
            }

            // Visualization
            if let result = viewModel.result, result.decayCurve != nil {
                RT60ChartView(result: result)
                    .frame(height: 300)
                    .padding()
            } else {
                Text("Waiting for impulse...\n\nCreate a loud sound like a clap or balloon pop")
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .frame(height: 300)
            }

            // Results
            if let result = viewModel.result, result.rt60 > 0 {
                VStack(spacing: 16) {
                    Text("Results")
                        .font(.headline)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ResultCard(title: "RT60", value: String(format: "%.2f s", result.rt60))
                        ResultCard(title: "RT30", value: String(format: "%.2f s", result.rt30))
                        ResultCard(title: "RT20", value: String(format: "%.2f s", result.rt20))
                    }

                    ResultCard(title: "Duration", value: String(format: "%.2f s", result.duration))
                    ResultCard(title: "Samples", value: "\(result.numSamples)")
                }
                .padding()
            }

            Spacer()
        }
    }
}

@available(iOS 13.0, *)
private struct ResultCard: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)

            Text(value)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundColor(.blue)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

@available(iOS 13.0, *)
private struct RT60ChartView: View {
    let result: RT60Result

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background
                Color(.systemBackground)

                // Grid lines
                Path { path in
                    let height = geometry.size.height
                    let width = geometry.size.width

                    // Horizontal lines (dB)
                    for db in stride(from: 0, through: -70, by: -10) {
                        let y = height * CGFloat(-db / 70.0)
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: width, y: y))
                    }

                    // Vertical lines (time)
                    for i in 0...10 {
                        let x = width * CGFloat(i) / 10.0
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: height))
                    }
                }
                .stroke(Color(.systemGray5), lineWidth: 0.5)

                // Decay curve
                if let curve = result.decayCurve, !curve.isEmpty {
                    Path { path in
                        let height = geometry.size.height
                        let width = geometry.size.width

                        for (index, db) in curve.enumerated() {
                            let x = width * CGFloat(index) / CGFloat(curve.count)
                            let normalizedDB = max(-70, min(0, db))
                            let y = height * CGFloat(-normalizedDB / 70.0)

                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(Color.blue, lineWidth: 2)
                }
            }
        }
        .border(Color(.systemGray4))
    }
}

@available(iOS 13.0, *)
private class RT60ViewModel: ObservableObject {
    @Published var isRecording = false
    @Published var result: RT60Result?
    @Published var status: String = "Ready"
    @Published var error: String?

    private let recorder: RT60Recorder

    init(config: RT60Config) {
        self.recorder = RT60Recorder(config: config)

        recorder.onResult = { [weak self] result in
            DispatchQueue.main.async {
                self?.result = result
            }
        }

        recorder.onStatus = { [weak self] status in
            DispatchQueue.main.async {
                self?.status = status
            }
        }
    }

    func startMeasurement() {
        recorder.requestPermission { [weak self] granted in
            guard granted else {
                self?.error = "Microphone permission denied"
                return
            }

            do {
                try self?.recorder.startMeasurement()
                self?.isRecording = true
                self?.error = nil
            } catch {
                self?.error = error.localizedDescription
            }
        }
    }

    func stopMeasurement() {
        recorder.stopMeasurement()
        isRecording = false
    }

    func reset() {
        recorder.reset()
        result = nil
        status = "Ready"
        error = nil
    }
}

@available(iOS 13.0, *)
struct RT60View_Previews: PreviewProvider {
    static var previews: some View {
        RT60View()
    }
}
#endif
