# RT60 React Module

React components and hooks for RT60 (Reverberation Time) measurement using the Web Audio API.

## Features

- 🎤 **Microphone Access**: Uses Web Audio API to capture audio from the user's microphone
- 📊 **Real-time Visualization**: Displays energy decay curve in real-time
- 🧮 **Accurate Calculation**: Implements Schroeder integration method
- ⚛️ **React Hooks**: Easy integration with custom React hooks
- 🎨 **Ready-to-use Components**: Complete UI components included
- 📱 **Responsive**: Works on desktop and mobile browsers

## Installation

```bash
npm install rt60-react
# or
yarn add rt60-react
```

## Quick Start

### Option 1: Use the Complete Component

```tsx
import React from 'react';
import { RT60Component } from 'rt60-react';

function App() {
  return (
    <RT60Component
      width={800}
      height={600}
      options={{
        sampleRate: 48000,
        impulseThreshold: 0.3
      }}
      onResult={(rt60, rt30, rt20) => {
        console.log(`RT60: ${rt60.toFixed(2)}s`);
      }}
    />
  );
}
```

### Option 2: Use the Hook (Custom UI)

```tsx
import React from 'react';
import { useRT60, RT60Visualizer } from 'rt60-react';

function CustomRT60() {
  const {
    isRecording,
    result,
    error,
    startMeasurement,
    stopMeasurement,
    reset
  } = useRT60({
    sampleRate: 48000,
    minRecordingTime: 2.0,
    maxRecordingTime: 10.0,
    impulseThreshold: 0.3,
    noiseFloor: 0.01
  });

  return (
    <div>
      <button onClick={startMeasurement} disabled={isRecording}>
        Start Measurement
      </button>
      <button onClick={stopMeasurement} disabled={!isRecording}>
        Stop
      </button>
      <button onClick={reset}>Reset</button>

      {error && <div>Error: {error}</div>}

      <RT60Visualizer result={result} width={800} height={600} />

      {result && result.rt60 > 0 && (
        <div>
          <p>RT60: {result.rt60.toFixed(2)} s</p>
          <p>RT30: {result.rt30.toFixed(2)} s</p>
          <p>RT20: {result.rt20.toFixed(2)} s</p>
        </div>
      )}
    </div>
  );
}
```

### Option 3: Use the Calculator Directly (No React)

```typescript
import { RT60Calculator } from 'rt60-react';

// Create calculator
const calculator = new RT60Calculator({
  sampleRate: 48000,
  minRecordingTime: 2.0,
  maxRecordingTime: 10.0,
  impulseThreshold: 0.3,
  noiseFloor: 0.01
});

// Start measurement
calculator.startMeasurement();

// Feed audio data (from Web Audio API or other source)
const audioData = new Float32Array(4096); // Your audio samples
calculator.feedData(audioData);

// Get result
const result = calculator.getResult();
console.log(`RT60: ${result.rt60.toFixed(2)}s`);

// Stop measurement
calculator.stopMeasurement();
```

## API Reference

### `useRT60(options: UseRT60Options): UseRT60Return`

React hook for RT60 measurement.

#### Options

```typescript
interface UseRT60Options {
  sampleRate?: number;           // Default: 48000
  minRecordingTime?: number;     // Default: 2.0 (seconds)
  maxRecordingTime?: number;     // Default: 10.0 (seconds)
  impulseThreshold?: number;     // Default: 0.3 (0-1 scale)
  noiseFloor?: number;           // Default: 0.01
  autoStart?: boolean;           // Default: false
}
```

#### Return Value

```typescript
interface UseRT60Return {
  isRecording: boolean;
  result: RT60Result | null;
  error: string | null;
  startMeasurement: () => Promise<void>;
  stopMeasurement: () => void;
  reset: () => void;
  isSupported: boolean;
  hasPermission: boolean;
}
```

### `RT60Component` Props

```typescript
interface RT60ComponentProps {
  options?: UseRT60Options;
  width?: number;                // Default: 800
  height?: number;               // Default: 600
  onResult?: (rt60: number, rt30: number, rt20: number) => void;
}
```

### `RT60Visualizer` Props

```typescript
interface RT60VisualizerProps {
  result: RT60Result | null;
  width?: number;                // Default: 800
  height?: number;               // Default: 600
  className?: string;
}
```

### `RT60Result` Interface

```typescript
interface RT60Result {
  rt60: number;                  // RT60 value in seconds
  rt30: number;                  // RT30 value in seconds
  rt20: number;                  // RT20 value in seconds
  decayCurve: number[] | null;   // Energy decay curve (dB)
  status: string;                // Current status message
  numSamples: number;            // Number of samples recorded
  duration: number;              // Recording duration in seconds
}
```

## How RT60 Measurement Works

1. **Impulse Detection**: The system monitors incoming audio for a loud impulse (amplitude > threshold)
2. **Decay Recording**: After detecting the impulse, it records the sound decay for 2-10 seconds
3. **Schroeder Integration**: Calculates backward integration: E(t) = ∫[t to end] p²(τ) dτ
4. **Linear Regression**: Fits a line to the decay curve in dB scale
5. **Extrapolation**:
   - RT20: Measured from -5 to -25 dB, then × 3 = 60 dB
   - RT30: Measured from -5 to -35 dB, then × 2 = 60 dB
   - RT60: Average of both methods

## Creating an Impulse

For accurate RT60 measurement, you need to create a sharp, loud impulse:

- ✅ **Best**: Balloon pop
- ✅ **Good**: Loud hand clap
- ✅ **Good**: Starter pistol (outdoor use)
- ⚠️ **Okay**: Slamming a book on a table
- ❌ **Bad**: Sustained sounds (talking, music)

## Browser Compatibility

- ✅ Chrome/Edge (Chromium): Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (macOS/iOS)
- ❌ Internet Explorer: Not supported

## Microphone Permissions

The Web Audio API requires user permission to access the microphone. The component will:
1. Request permission when `startMeasurement()` is called
2. Show an error if permission is denied
3. Remember the permission for future sessions (per browser settings)

## Typical RT60 Values

- **Small bedroom**: 0.2 - 0.4 s
- **Living room**: 0.4 - 0.6 s
- **Large hall**: 1.0 - 2.0 s
- **Cathedral**: 2.0 - 10.0 s
- **Recording studio**: 0.2 - 0.5 s (controlled)

## Advanced Configuration

### Custom Threshold

Adjust the impulse detection threshold based on your environment:

```tsx
const { startMeasurement } = useRT60({
  impulseThreshold: 0.5  // Higher = requires louder impulse
});
```

### Custom Noise Floor

Adjust the noise floor for automatic stop detection:

```tsx
const { startMeasurement } = useRT60({
  noiseFloor: 0.005  // Lower = waits for quieter decay
});
```

### Manual Control

Disable auto-stop and control measurement manually:

```tsx
const { startMeasurement, stopMeasurement } = useRT60({
  minRecordingTime: 5.0,  // Minimum time before allowing stop
  maxRecordingTime: 15.0  // Maximum time before forcing stop
});
```

## Troubleshooting

### "No impulse detected"
- Make sure you're creating a loud enough sound
- Check microphone permissions
- Try lowering the `impulseThreshold` value

### "Not enough data"
- The impulse was too quiet or decay was too fast
- Try a room with more reverberation
- Increase `minRecordingTime`

### "Calculation failed"
- The room is too dry (heavily damped)
- Background noise is too high
- Try a different room or create a louder impulse

## Examples

See the `/examples` directory for complete working examples:
- Basic usage
- Custom styling
- Multiple measurements
- Exporting results

## License

Apache-2.0

## Credits

Based on the RT60 implementation from Audio Analyzer for Android.
Ported to React/TypeScript for web applications.

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.
