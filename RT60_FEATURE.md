# RT60 Measurement Feature

This document describes the RT60 (Reverberation Time) measurement feature added to the Audio Analyzer for Android application.

## Overview

RT60 is the time required for sound to decay by 60 dB after the sound source has stopped. This measurement is important for:
- Acoustic analysis of rooms and spaces
- Audio engineering and studio design
- Architectural acoustics
- Concert hall and auditorium analysis

## How to Use

1. Open the Audio Analyzer for Android app
2. Tap the **Menu** button (three dots or hardware menu button)
3. Select **"RT60 Measurement"** from the menu
4. The app will display a message: "RT60 Mode: Make a loud impulse (clap, balloon pop, etc.)"
5. Create a loud impulse sound:
   - Clap your hands loudly
   - Pop a balloon
   - Any other short, loud sound
6. The app will automatically:
   - Detect the impulse
   - Record the sound decay
   - Calculate RT60, RT30, and RT20 values
   - Display the energy decay curve

## Technical Details

### Implementation

The RT60 feature consists of the following components:

#### 1. **RT60Calculator.java**
- Implements the Schroeder integration method for RT60 calculation
- Automatic impulse detection
- Calculates RT60, RT30, and RT20 values
- Real-time audio processing from Android microphone

**Key Features:**
- Impulse threshold: 30% of maximum amplitude (configurable)
- Recording duration: 2-10 seconds
- Schroeder backward integration for energy decay curve
- Linear regression on decay curve (-5 to -25 dB for RT20, -5 to -35 dB for RT30)
- Extrapolation to 60 dB decay

#### 2. **RT60Plot.java**
- Visualizes the energy decay curve
- Displays RT60, RT30, and RT20 values
- Shows reference lines at -5, -25, -35, -65 dB
- Time vs. dB plotting

#### 3. **AnalyzerGraphic.java**
- Added RT60 plot mode to existing SPECTRUM and SPECTROGRAM modes
- Integrated RT60Plot into the view system
- Added `switch2RT60()` method for mode switching
- Added `saveRT60Data()` method for receiving RT60 results

#### 4. **SamplingLoop.java**
- Integrated RT60Calculator into the audio recording loop
- Feeds real-time audio data from Android microphone to RT60Calculator
- Provides control methods: `startRT60Measurement()`, `stopRT60Measurement()`, `resetRT60Measurement()`

#### 5. **AnalyzerActivity.java**
- Added menu item handler for RT60 mode
- Added `switchToRT60Mode()` method
- Displays toast notification when entering RT60 mode

## Measurement Process

1. **Impulse Detection**:
   - Monitors incoming audio for amplitude exceeding threshold (30% by default)
   - When impulse is detected, starts recording the decay

2. **Data Collection**:
   - Records audio samples after impulse detection
   - Minimum recording time: 2 seconds
   - Maximum recording time: 10 seconds
   - Auto-stops when signal decays below noise floor

3. **Schroeder Integration**:
   - Calculates backward integration: E(t) = ∫[t to end] p²(τ) dτ
   - Converts to dB scale: dB(t) = 10 * log10(E(t) / E_max)

4. **Linear Regression**:
   - Fits linear regression to decay curve
   - RT20: Uses -5 to -25 dB range (extrapolates × 3 = 60 dB)
   - RT30: Uses -5 to -35 dB range (extrapolates × 2 = 60 dB)
   - RT60: Average of RT20 and RT30 calculations

5. **Display Results**:
   - Shows decay curve plot
   - Displays RT60, RT30, RT20 values
   - Shows reference lines for key dB levels

## Configuration

The RT60Calculator can be configured with:

```java
rt60Calculator.setImpulseThreshold(0.3);  // 30% threshold
rt60Calculator.setNoiseFloor(0.01);        // 1% noise floor
```

## Files Modified/Created

### Created:
- `RT60Calculator.java` - Core RT60 calculation engine
- `RT60Plot.java` - RT60 visualization
- `RT60_FEATURE.md` - This documentation

### Modified:
- `AnalyzerGraphic.java` - Added RT60 plot mode
- `SamplingLoop.java` - Integrated RT60 data collection
- `AnalyzerActivity.java` - Added RT60 menu handler
- `res/menu/info.xml` - Added RT60 menu item

## Switching Back to Spectrum/Spectrogram Mode

To return to normal spectrum or spectrogram mode:
1. Use the existing view mode buttons in the UI
2. Or use the menu to select other analysis modes

## Accuracy Considerations

For best results:
- Use in a quiet environment
- Create a sharp, loud impulse (balloon pop works best)
- Ensure room has sufficient reverberation (RT60 > 0.3s)
- Avoid very small rooms (may have RT60 < 0.2s)
- Multiple measurements recommended for averaging

## Sample Results

Typical RT60 values:
- Small bedroom: 0.2 - 0.4 seconds
- Living room: 0.4 - 0.6 seconds
- Large hall: 1.0 - 2.0 seconds
- Cathedral: 2.0 - 10.0 seconds
- Recording studio: 0.2 - 0.5 seconds (controlled)

## Future Enhancements

Potential improvements:
- Band-limited RT60 (RT60 per frequency band: 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz)
- EDT (Early Decay Time) measurement
- Multiple measurement averaging
- Export RT60 results to file
- Real-time display during measurement
- Manual impulse trigger
- Sweep signal generation for RT60 measurement

## References

- Schroeder, M. R. (1965). "New Method of Measuring Reverberation Time"
- ISO 3382-2:2008 - Measurement of room acoustic parameters
- IEC 61672-1 - Electroacoustics - Sound level meters
