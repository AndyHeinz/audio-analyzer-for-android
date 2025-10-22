/*
 * RT60Recorder.swift
 * AVAudioEngine integration for RT60 measurement
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

import Foundation
import AVFoundation

/// RT60 Recorder using AVAudioEngine
public final class RT60Recorder {
    // MARK: - Properties

    private let calculator: RT60Calculator
    private let audioEngine = AVAudioEngine()
    private var isRecording = false

    public var onResult: ((RT60Result) -> Void)?
    public var onStatus: ((String) -> Void)?

    // MARK: - Initialization

    public init(config: RT60Config) {
        self.calculator = RT60Calculator(config: config)
    }

    // MARK: - Public API

    /// Request microphone permission
    public func requestPermission(completion: @escaping (Bool) -> Void) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                completion(granted)
            }
        }
    }

    /// Start RT60 measurement
    public func startMeasurement() throws {
        guard !isRecording else {
            throw RT60Error.alreadyRecording
        }

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: [])
        try audioSession.setActive(true, options: [])

        // Get input node
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        // Validate format
        guard recordingFormat.sampleRate > 0 else {
            throw RT60Error.invalidAudioFormat
        }

        // Install tap
        let bufferSize: AVAudioFrameCount = 4096
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: recordingFormat) { [weak self] buffer, _ in
            self?.processAudioBuffer(buffer)
        }

        // Start audio engine
        audioEngine.prepare()
        try audioEngine.start()

        // Start calculator
        calculator.startMeasurement()
        isRecording = true

        print("[RT60Recorder] Started recording at \(recordingFormat.sampleRate) Hz")
    }

    /// Stop RT60 measurement
    public func stopMeasurement() {
        guard isRecording else { return }

        // Stop calculator first
        calculator.stopMeasurement()

        // Stop audio engine
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        // Deactivate audio session
        try? AVAudioSession.sharedInstance().setActive(false, options: [])

        isRecording = false

        // Notify result
        let result = calculator.getResult()
        onResult?(result)

        print("[RT60Recorder] Stopped recording")
    }

    /// Reset measurement
    public func reset() {
        if isRecording {
            stopMeasurement()
        }
        calculator.reset()
    }

    /// Get current result
    public func getCurrentResult() -> RT60Result {
        return calculator.getResult()
    }

    /// Check if recording
    public var recording: Bool {
        return isRecording
    }

    // MARK: - Private Methods

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let frameLength = Int(buffer.frameLength)
        let samples = Array(UnsafeBufferPointer(start: channelData[0], count: frameLength))

        // Feed to calculator
        calculator.feedData(samples)

        // Check status
        let status = calculator.currentStatus
        onStatus?(status)

        // Auto-stop if done
        if !calculator.recording && isRecording {
            DispatchQueue.main.async { [weak self] in
                self?.stopMeasurement()
            }
        }
    }
}

// MARK: - Errors

public enum RT60Error: Error {
    case alreadyRecording
    case invalidAudioFormat
    case permissionDenied

    public var localizedDescription: String {
        switch self {
        case .alreadyRecording:
            return "RT60 measurement is already in progress"
        case .invalidAudioFormat:
            return "Invalid audio format"
        case .permissionDenied:
            return "Microphone permission denied"
        }
    }
}
