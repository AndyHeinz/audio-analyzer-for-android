# RoomPlan + RT60 Integration
## Acoustic Room Analysis with 3D Scanning

Complete acoustic analysis combining RT60 measurements with room geometry.

---

## 🎯 Two Implementations

### 1. **iOS (Swift) - Premium Version** 🚀

Uses Apple's RoomPlan API for automated 3D room scanning with LiDAR.

**Features:**
- ✅ Automatic 3D room scanning with LiDAR
- ✅ RT60 measurement with microphone
- ✅ Complete acoustic analysis
- ✅ Real-time room geometry capture
- ✅ Advanced acoustic calculations

**Requirements:**
- iOS 16.0+
- LiDAR-equipped device (iPhone 12 Pro+, iPad Pro)
- Camera and microphone permissions

**Installation:**

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/yourrepo/rt60-module", from: "1.0.0")
]
```

**Usage:**

```swift
import SwiftUI
import RT60

// Full acoustic analyzer with RoomPlan
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            AcousticAnalyzerView()
        }
    }
}

// Or use individual components
struct CustomView: View {
    @StateObject private var roomScanner = RoomPlanScanner()
    @StateObject private var rt60Recorder: RT60Recorder

    init() {
        let config = RT60Config(sampleRate: 48000)
        let calculator = RT60Calculator(config: config)
        _rt60Recorder = StateObject(wrappedValue: RT60Recorder(calculator: calculator))
    }

    var body: some View {
        VStack {
            // 1. Scan room
            Button("Start Room Scan") {
                roomScanner.startScanning()
            }

            // 2. Measure RT60
            Button("Measure RT60") {
                try? rt60Recorder.startMeasurement()
            }

            // 3. Analyze
            if let geometry = roomScanner.roomGeometry,
               let rt60Result = rt60Recorder.currentResult {
                let analysis = AcousticRoomAnalysis(
                    rt60Result: rt60Result,
                    roomGeometry: geometry
                )

                Text("Quality: \(analysis.acousticQuality.rawValue)")
                Text("RT60: \(analysis.rt60Result.rt60, specifier: "%.2f") s")
                Text("Volume: \(analysis.roomGeometry.volume, specifier: "%.1f") m³")
            }
        }
    }
}
```

**API Reference:**

```swift
// Room geometry from LiDAR scan
public struct RoomGeometry {
    public let volume: Double              // m³
    public let totalSurfaceArea: Double    // m²
    public let floorArea: Double           // m²
    public let ceilingHeight: Double       // m
    public let wallArea: Double            // m²
    public let walls: [Surface]
    public let floors: [Surface]
    public let ceilings: [Surface]
    public let objects: [RoomObject]
}

// Complete acoustic analysis
public struct AcousticRoomAnalysis {
    public let rt60Result: RT60Result
    public let roomGeometry: RoomGeometry

    // Calculated properties
    public let meanAbsorptionCoefficient: Double
    public let totalAbsorption: Double
    public let theoreticalRT60Sabine: Double
    public let theoreticalRT60Eyring: Double
    public let rt60Deviation: Double

    // Assessment
    public let acousticQuality: AcousticQuality
    public let roomType: RoomType
    public let recommendations: [String]
}

// Room scanner
public final class RoomPlanScanner: ObservableObject {
    @Published public private(set) var isScanning: Bool
    @Published public private(set) var roomGeometry: RoomGeometry?

    public static var isSupported: Bool  // Check LiDAR availability
    public func startScanning()
    public func stopScanning()
    public func reset()
}
```

---

### 2. **React/Web - Universal Version** 🌐

Manual room dimensions input combined with RT60 measurement.

**Features:**
- ✅ Works on ANY device (no LiDAR needed)
- ✅ Manual room dimension input
- ✅ RT60 measurement with Web Audio API
- ✅ Same acoustic calculations as iOS
- ✅ Cross-platform (Chrome, Firefox, Safari)

**Requirements:**
- Modern browser with Web Audio API
- Microphone permission

**Installation:**

```bash
npm install react-rt60-module
```

**Usage:**

```tsx
import React from 'react';
import { AcousticRoomAnalyzer } from 'react-rt60-module';

function App() {
  return (
    <div>
      <h1>Acoustic Room Analyzer</h1>
      <AcousticRoomAnalyzer sampleRate={48000} />
    </div>
  );
}

export default App;
```

**Custom Implementation:**

```tsx
import React, { useState } from 'react';
import {
  useRT60,
  AcousticAnalyzer,
  RoomDimensions,
  AcousticAnalysis
} from 'react-rt60-module';

function CustomAnalyzer() {
  const [dimensions, setDimensions] = useState<RoomDimensions>({
    length: 5,
    width: 4,
    height: 2.5
  });

  const { isRecording, result, startMeasurement, stopMeasurement } = useRT60({
    sampleRate: 48000
  });

  const [analysis, setAnalysis] = useState<AcousticAnalysis | null>(null);

  const handleAnalyze = () => {
    if (result && result.rt60 > 0) {
      const analysisResult = AcousticAnalyzer.analyze(result, dimensions);
      setAnalysis(analysisResult);
    }
  };

  return (
    <div>
      {/* 1. Enter room dimensions */}
      <div>
        <h3>Room Dimensions</h3>
        <input
          type="number"
          placeholder="Length (m)"
          value={dimensions.length}
          onChange={(e) => setDimensions({
            ...dimensions,
            length: parseFloat(e.target.value)
          })}
        />
        <input
          type="number"
          placeholder="Width (m)"
          value={dimensions.width}
          onChange={(e) => setDimensions({
            ...dimensions,
            width: parseFloat(e.target.value)
          })}
        />
        <input
          type="number"
          placeholder="Height (m)"
          value={dimensions.height}
          onChange={(e) => setDimensions({
            ...dimensions,
            height: parseFloat(e.target.value)
          })}
        />
      </div>

      {/* 2. Measure RT60 */}
      <div>
        <h3>RT60 Measurement</h3>
        <button onClick={startMeasurement} disabled={isRecording}>
          Start Recording
        </button>
        <button onClick={stopMeasurement} disabled={!isRecording}>
          Stop Recording
        </button>

        {result && (
          <div>
            <p>RT60: {result.rt60.toFixed(2)} s</p>
            <p>Status: {result.status}</p>
          </div>
        )}
      </div>

      {/* 3. Analyze */}
      <button onClick={handleAnalyze}>Analyze Room</button>

      {/* 4. Results */}
      {analysis && (
        <div>
          <h3>Analysis Results</h3>
          <p>Quality: {analysis.qualityEmoji} {analysis.acousticQuality}</p>
          <p>Room Type: {analysis.roomType}</p>
          <p>Volume: {analysis.volume.toFixed(1)} m³</p>
          <p>RT60: {analysis.rt60Result.rt60.toFixed(2)} s</p>
          <p>Absorption: {analysis.meanAbsorptionCoefficient.toFixed(3)}</p>

          <h4>Recommendations:</h4>
          <ul>
            {analysis.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

**API Reference:**

```typescript
// Room dimensions (manual input)
export interface RoomDimensions {
  length: number;      // meters
  width: number;       // meters
  height: number;      // meters
}

// Acoustic analysis result
export interface AcousticAnalysis {
  rt60Result: RT60Result;
  roomDimensions: RoomDimensions;
  volume: number;                      // m³
  floorArea: number;                   // m²
  totalSurfaceArea: number;            // m²
  meanAbsorptionCoefficient: number;   // 0-1
  totalAbsorption: number;             // Sabins
  theoreticalRT60Sabine: number;       // seconds
  theoreticalRT60Eyring: number;       // seconds
  rt60Deviation: number;               // percentage
  roomType: RoomType;
  acousticQuality: AcousticQuality;
  qualityEmoji: string;
  recommendations: string[];
}

// Acoustic analyzer
export class AcousticAnalyzer {
  static analyze(
    rt60Result: RT60Result,
    dimensions: RoomDimensions
  ): AcousticAnalysis;
}

// Room type classification
export enum RoomType {
  Small = 'Small Room',       // < 50 m³
  Medium = 'Medium Room',     // 50-200 m³
  Large = 'Large Room',       // 200-500 m³
  Hall = 'Hall/Auditorium',   // > 500 m³
}

// Acoustic quality
export enum AcousticQuality {
  Excellent = 'Excellent',
  Good = 'Good',
  Acceptable = 'Acceptable',
  Poor = 'Poor',
  VeryPoor = 'Very Poor',
}

// Ready-to-use component
export const AcousticRoomAnalyzer: React.FC<{
  sampleRate?: number;
}>;
```

---

## 📊 Acoustic Calculations

Both implementations use the same acoustic formulas:

### Sabine Formula
```
RT60 = 0.161 × V / A

Where:
- V = room volume (m³)
- A = total absorption (m²) = α × S
- α = mean absorption coefficient (0-1)
- S = total surface area (m²)
```

### Eyring Formula (more accurate for high absorption)
```
RT60 = 0.161 × V / (-S × ln(1 - α))
```

### Calculated Metrics

1. **Room Volume**
   - iOS: Calculated from LiDAR mesh
   - React: `length × width × height`

2. **Total Surface Area**
   - Walls + Floor + Ceiling

3. **Mean Absorption Coefficient**
   - Derived from measured RT60: `α = 0.161 × V / (RT60 × S)`
   - Range: 0 (perfect reflection) to 1 (perfect absorption)

4. **Total Absorption (Sabins)**
   - `A = α × S`
   - Unit: m² of perfect absorption

5. **Theoretical RT60**
   - Sabine: For low/medium absorption
   - Eyring: For high absorption (>0.3)

---

## 🎯 Quality Assessment

### Optimal RT60 Ranges (for speech)

| Room Type | Optimal Range | Acceptable Range |
|-----------|--------------|------------------|
| Small (<50m³) | 0.3 - 0.5 s | 0.2 - 0.7 s |
| Medium (50-200m³) | 0.4 - 0.7 s | 0.3 - 1.0 s |
| Large (200-500m³) | 0.6 - 1.0 s | 0.4 - 1.5 s |
| Hall (>500m³) | 0.8 - 1.5 s | 0.6 - 2.0 s |

*Note: For music, optimal RT60 is typically 20-30% longer*

### Quality Levels

- **🟢 Excellent**: RT60 in optimal range
- **🟡 Good**: RT60 near optimal range
- **🟠 Acceptable**: RT60 in acceptable range
- **🔴 Poor**: RT60 outside acceptable range
- **⛔ Very Poor**: RT60 far from acceptable

---

## 💡 Recommendations Engine

The system provides intelligent recommendations based on:

1. **RT60 Analysis**
   - Too long → Add absorption (carpets, panels, curtains)
   - Too short → Add reflection (hard surfaces)

2. **Room Characteristics**
   - Size → Room type classification
   - Absorption → Material suggestions
   - Surface area → Treatment area estimates

3. **Use Case**
   - Speech clarity → Lower RT60
   - Music performance → Higher RT60
   - Recording → Balanced RT60

### Example Recommendations

**RT60 too long (> 1.5s in medium room):**
- ⚠️ Room is too reverberant (RT60 too long)
- Add acoustic panels or sound-absorbing materials
- Consider carpets, curtains, or acoustic ceiling tiles
- Large floor area detected - add rugs or carpet

**RT60 too short (< 0.3s in medium room):**
- ⚠️ Room is too acoustically dead (RT60 too short)
- Add reflective surfaces to increase reverberation
- Consider hard flooring or reducing soft materials

---

## 🚀 Comparison

| Feature | iOS (RoomPlan) | React (Manual) |
|---------|----------------|----------------|
| **3D Scanning** | ✅ Automatic | ❌ Manual input |
| **Room Geometry** | ✅ LiDAR mesh | ✅ Basic dimensions |
| **RT60 Measurement** | ✅ Native audio | ✅ Web Audio API |
| **Acoustic Analysis** | ✅ Full | ✅ Full |
| **Device Support** | iPhone 12 Pro+ | Any device |
| **Platform** | iOS 16+ only | Cross-platform |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Availability** | Limited | Universal |

---

## 📝 Files Added

### iOS (Swift)
```
ios-rt60-module/Sources/RT60/
├── RoomPlanScanner.swift          # RoomPlan integration
├── AcousticRoomAnalysis.swift     # Acoustic calculations
├── AcousticAnalyzerView.swift     # SwiftUI combined view
├── RT60Calculator.swift           # RT60 calculator (existing)
├── RT60Recorder.swift             # Audio recorder (existing)
└── RT60View.swift                 # RT60 view (existing)

ios-rt60-module/Package.swift      # Updated with RoomPlan framework
```

### React/Web (TypeScript)
```
react-rt60-module/src/
├── AcousticRoomAnalyzer.tsx       # Complete analyzer component
├── RT60Calculator.ts              # RT60 calculator (existing)
├── useRT60.ts                     # React hook (existing)
├── RT60Component.tsx              # RT60 component (existing)
├── RT60Visualizer.tsx             # Visualization (existing)
└── index.ts                       # Updated exports
```

---

## 🎓 Theory: RT60 and Room Acoustics

### What is RT60?

**RT60** (Reverberation Time 60) is the time required for sound to decay by **60 decibels** after the source stops.

**Physical meaning:**
- Short RT60 (< 0.5s): "Dry" or "dead" room (bedrooms, studios)
- Medium RT60 (0.5-1.0s): Balanced (offices, classrooms)
- Long RT60 (> 1.0s): "Live" or reverberant (churches, concert halls)

### Measurement Method

1. **Impulse Generation**: Loud sound (clap, balloon pop)
2. **Decay Capture**: Record sound decay
3. **Schroeder Integration**: Backward integration of energy
4. **Linear Regression**: Fit line to decay curve
5. **Extrapolation**: RT20 → RT60, RT30 → RT60

### Absorption Coefficient (α)

Material property indicating sound absorption:
- **α = 0**: Perfect reflection (concrete, glass)
- **α = 0.5**: Moderate absorption (wood, curtains)
- **α = 1**: Perfect absorption (professional acoustic foam)

Common materials:
- Concrete wall: α ≈ 0.02
- Carpet: α ≈ 0.3-0.5
- Acoustic panel: α ≈ 0.8-0.95
- Open window: α = 1.0

---

## 📱 Screenshots & Demo

### iOS RoomPlan Version

```
[ Intro Screen ]
   ↓ (Start Analysis)
[ 3D Room Scanning ] ← LiDAR visualization
   ↓ (Scan complete)
[ RT60 Measurement ] ← Microphone recording
   ↓ (Clap detected)
[ Analysis ] ← Processing
   ↓
[ Results ] ← Quality + Recommendations
```

### React Manual Version

```
[ Intro Screen ]
   ↓ (Start Analysis)
[ Room Dimensions ] ← Length/Width/Height input
   ↓ (Continue)
[ RT60 Measurement ] ← Microphone recording
   ↓ (Done)
[ Results ] ← Quality + Recommendations
```

---

## 🔧 Troubleshooting

### iOS
- **"LiDAR not supported"**: Device must have LiDAR (iPhone 12 Pro+)
- **App crashes during scan**: Ensure iOS 16+
- **No room captured**: Walk slowly, scan all surfaces

### React/Web
- **No microphone access**: Grant permissions in browser
- **RT60 always 0**: Make louder impulse sound
- **Analysis inaccurate**: Double-check room dimensions

---

## 📄 License

Apache License 2.0 - See LICENSE file

---

## 🎯 Summary

**Use iOS version if:**
- You have LiDAR-equipped device
- You want automatic room capture
- Highest accuracy needed

**Use React version if:**
- Any device/platform support needed
- Manual input acceptable
- Web deployment required

Both provide **complete acoustic analysis** with professional-grade calculations!
