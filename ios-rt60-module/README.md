# RT60 Module for iOS

RT60 (Reverberation Time) measurement for iOS using AVAudioEngine and SwiftUI.

## Features

- 🎤 **Microphone Access**: Uses AVAudioEngine for high-quality audio capture
- 📊 **Real-time Visualization**: SwiftUI-based decay curve display
- 🧮 **Accurate Calculation**: Schroeder integration method
- 🔒 **Thread-Safe**: All methods are thread-safe with proper locking
- 💾 **Memory-Safe**: Hard limits prevent memory leaks
- ⚡ **Performance**: Optimized with Accelerate framework
- 📱 **SwiftUI**: Modern declarative UI

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/AndyHeinz/audio-analyzer-for-android", branch: "claude/rt60-android-mic-support-011CUNwoQ1hdCFHuD2N6Q8EG")
]
```

Or in Xcode:
1. File → Add Packages...
2. Enter repository URL
3. Select version/branch
4. Add to your target

## Quick Start

### Option 1: SwiftUI View (Complete UI)

```swift
import SwiftUI
import RT60

struct ContentView: View {
    var body: some View {
        RT60View(config: RT60Config(
            sampleRate: 48000,
            impulseThreshold: 0.3
        ))
    }
}
```

### Option 2: Custom Implementation

```swift
import RT60

class MyViewController: UIViewController {
    let recorder: RT60Recorder

    init() {
        let config = RT60Config(sampleRate: 48000)
        recorder = RT60Recorder(config: config)
        super.init(nibName: nil, bundle: nil)

        recorder.onResult = { result in
            print("RT60: \(result.rt60) seconds")
        }
    }

    func startMeasurement() {
        recorder.requestPermission { granted in
            guard granted else { return }

            try? self.recorder.startMeasurement()
        }
    }

    func stopMeasurement() {
        recorder.stopMeasurement()
    }
}
```

### Option 3: Low-Level Calculator

```swift
import RT60

let config = RT60Config(sampleRate: 48000)
let calculator = RT60Calculator(config: config)

// Start measurement
calculator.startMeasurement()

// Feed audio samples
let samples: [Float] = [...] // Your audio samples
calculator.feedData(samples)

// Get result
let result = calculator.getResult()
print("RT60: \(result.rt60)s")
print("RT30: \(result.rt30)s")
print("RT20: \(result.rt20)s")
```

## API Reference

### RT60Config

```swift
public struct RT60Config {
    public let sampleRate: Double           // Default: 48000
    public let minRecordingTime: Double     // Default: 2.0 (seconds)
    public let maxRecordingTime: Double     // Default: 10.0 (seconds)
    public let impulseThreshold: Double     // Default: 0.3 (0-1 scale)
    public let noiseFloor: Double           // Default: 0.01
}
```

### RT60Calculator

```swift
public final class RT60Calculator {
    public init(config: RT60Config)

    // Methods
    public func startMeasurement()
    public func stopMeasurement()
    public func reset()
    public func feedData(_ samples: [Float])
    public func getResult() -> RT60Result

    // Properties
    public var currentStatus: String { get }
    public var recording: Bool { get }
}
```

### RT60Recorder

```swift
public final class RT60Recorder {
    public init(config: RT60Config)

    // Methods
    public func requestPermission(completion: @escaping (Bool) -> Void)
    public func startMeasurement() throws
    public func stopMeasurement()
    public func reset()
    public func getCurrentResult() -> RT60Result

    // Callbacks
    public var onResult: ((RT60Result) -> Void)?
    public var onStatus: ((String) -> Void)?

    // Properties
    public var recording: Bool { get }
}
```

### RT60Result

```swift
public struct RT60Result {
    public let rt60: Double              // RT60 value in seconds
    public let rt30: Double              // RT30 value in seconds
    public let rt20: Double              // RT20 value in seconds
    public let decayCurve: [Double]?     // Energy decay curve (dB)
    public let status: String            // Current status
    public let numSamples: Int           // Number of samples recorded
    public let duration: Double          // Recording duration in seconds
}
```

### RT60View (SwiftUI)

```swift
@available(iOS 13.0, *)
public struct RT60View: View {
    public init(config: RT60Config = RT60Config(sampleRate: 48000))
}
```

## How RT60 Measurement Works

1. **Impulse Detection**: Monitors incoming audio for amplitude > threshold
2. **Decay Recording**: Records sound decay for 2-10 seconds after impulse
3. **Schroeder Integration**: Backward integration: E(t) = ∫[t to end] p²(τ) dτ
4. **Linear Regression**: Fits line to decay curve in dB scale
5. **Extrapolation**:
   - RT20: Measured -5 to -25 dB, then × 3 = 60 dB
   - RT30: Measured -5 to -35 dB, then × 2 = 60 dB
   - RT60: Average of both methods

## Creating an Impulse

For accurate RT60 measurement:

- ✅ **Best**: Balloon pop
- ✅ **Good**: Loud hand clap
- ✅ **Good**: Starter pistol (outdoor use)
- ⚠️ **Okay**: Book slam on table
- ❌ **Bad**: Sustained sounds (talking, music)

## Permissions

Add to your `Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>RT60 measurement requires microphone access to analyze room acoustics.</string>
```

## Typical RT60 Values

- **Small bedroom**: 0.2 - 0.4 s
- **Living room**: 0.4 - 0.6 s
- **Large hall**: 1.0 - 2.0 s
- **Cathedral**: 2.0 - 10.0 s
- **Recording studio**: 0.2 - 0.5 s (controlled)

## Thread-Safety

All public methods are thread-safe:
- Uses `NSLock` for synchronization
- Safe to call from any thread
- No race conditions
- No data corruption

## Memory Safety

- Hard limit: 500,000 samples (~10s at 48kHz)
- Auto-stop when limit reached
- Prevents OutOfMemoryError
- Proper cleanup on deallocation

## Error Handling

```swift
do {
    try recorder.startMeasurement()
} catch RT60Error.alreadyRecording {
    print("Already recording")
} catch RT60Error.invalidAudioFormat {
    print("Invalid audio format")
} catch RT60Error.permissionDenied {
    print("Microphone permission denied")
} catch {
    print("Unknown error: \(error)")
}
```

## Example App

See `Examples/RT60Example` for a complete SwiftUI app demonstrating:
- Basic usage
- Custom styling
- Multiple measurements
- Results export

## Platform Compatibility

- ✅ iOS 13.0+
- ✅ macOS 10.15+
- ✅ iPadOS 13.0+

## Requirements

- Swift 5.7+
- Xcode 14.0+
- iOS 13.0+ / macOS 10.15+

## Bugs Fixed

This implementation includes all critical bug fixes:

1. ✅ Thread-safety with NSLock
2. ✅ Memory leak prevention (MAX_SAMPLES limit)
3. ✅ Division by zero checks
4. ✅ Null safety (Swift optionals)
5. ✅ Array bounds checking
6. ✅ Complete state reset
7. ✅ Input validation
8. ✅ Defensive copying

See `CRITICAL_BUGFIXES_v2.md` in the repository root for details.

## License

Apache 2.0

## Credits

Based on the RT60 implementation from Audio Analyzer for Android.
Ported to iOS/Swift with all critical bug fixes.

## Contributing

Contributions welcome! Please open an issue or pull request on GitHub.
