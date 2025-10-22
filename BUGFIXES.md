# RT60 Bug Fixes

This document describes the bugs found and fixed in the RT60 implementation.

## Bugs Fixed in RT60Calculator.java

### 1. ❌ Bug: Incorrect Time Measurement for Auto-Stop (Line 145)

**Problem:**
```java
double elapsedTime = (currentTime - recordingStartTime) / 1000.0;
if (impulseDetected && elapsedTime > minRecordingTime) {
    // Check if signal has decayed sufficiently
    ...
}
```

The elapsed time was calculated from `recordingStartTime` instead of from when the impulse was detected (`impulseDetectedTime`). This meant that if the user waited 5 seconds before creating an impulse, the auto-stop timer would already be at 5 seconds.

**Fix:**
```java
// Added new field
private long impulseDetectedTime = 0;

// Track when impulse is detected
if (amplitude > impulseThreshold) {
    impulseDetected = true;
    impulseDetectedTime = System.currentTimeMillis();  // NEW
    ...
}

// Use correct time measurement
if (impulseDetected) {
    double timeSinceImpulse = (currentTime - impulseDetectedTime) / 1000.0;  // FIXED
    if (timeSinceImpulse > minRecordingTime) {
        ...
    }
}
```

**Impact:** High - This bug could cause premature or delayed auto-stop of measurements.

---

### 2. ❌ Bug: Missing Null/Empty Check in calculateRecentEnergy (Line 157)

**Problem:**
```java
private double calculateRecentEnergy(int numSamples) {
    if (audioSamples.size() < numSamples) {
        numSamples = audioSamples.size();
    }
    // If audioSamples is empty, this would divide by zero!
    double sum = 0;
    for (int i = audioSamples.size() - numSamples; i < audioSamples.size(); i++) {
        ...
    }
    return Math.sqrt(sum / numSamples);  // Division by zero if empty!
}
```

**Fix:**
```java
private double calculateRecentEnergy(int numSamples) {
    if (audioSamples.isEmpty()) {  // NEW
        return 0.0;
    }

    if (audioSamples.size() < numSamples) {
        numSamples = audioSamples.size();
    }
    ...
}
```

**Impact:** Medium - Could cause divide-by-zero error if called when audioSamples is empty.

---

### 3. ❌ Bug: Confusing and Incorrect RT Value Calculations (Lines 215-228)

**Problem:**
```java
// Calculate RT60, RT30, RT20 by linear regression
rt60 = calculateRTFromDecay(decayCurve, -5, -25); // This is RT20!
rt30 = calculateRTFromDecay(decayCurve, -5, -35); // This is RT30!
rt20 = rt60; // Wait, what? rt20 = rt60, but rt60 is actually RT20?

// Extrapolate to 60 dB if we used a smaller range
rt60 = rt20 * 3.0; // Now rt60 is overwritten
rt30 = rt30 * 2.0; // Now rt30 is overwritten

// Average RT60 from both methods
rt60 = (rt60 + rt30) / 2.0; // rt60 is overwritten again!
```

This code was extremely confusing and the variable naming was misleading. The variables were being reused in a confusing way.

**Fix:**
```java
// Calculate RT20, RT30 by linear regression and extrapolate to RT60
double rt20_measured = calculateRTFromDecay(decayCurve, -5, -25); // 20 dB range
double rt30_measured = calculateRTFromDecay(decayCurve, -5, -35); // 30 dB range

// Store RT20 and RT30 values (not extrapolated)
rt20 = rt20_measured;
rt30 = rt30_measured;

// Extrapolate to 60 dB
double rt60_from_rt20 = rt20_measured * 3.0; // RT60 = RT20 * 3
double rt60_from_rt30 = rt30_measured * 2.0; // RT60 = RT30 * 2

// Average RT60 from both methods for more accurate result
if (rt60_from_rt20 > 0 && rt60_from_rt30 > 0) {
    rt60 = (rt60_from_rt20 + rt60_from_rt30) / 2.0;
} else if (rt60_from_rt20 > 0) {
    rt60 = rt60_from_rt20;
} else if (rt60_from_rt30 > 0) {
    rt60 = rt60_from_rt30;
} else {
    rt60 = 0;
    status = "Calculation failed";
    return;
}
```

**Impact:** High - The original code was confusing and could lead to maintenance errors. The new code is much clearer.

---

### 4. ❌ Bug: Potential Division by Zero in Linear Regression (Line 273)

**Problem:**
```java
double slope = (numPoints * sumXY - sumX * sumY) / (numPoints * sumX2 - sumX * sumX);

if (slope >= 0) {
    Log.w(TAG, "Positive slope detected - invalid decay");
    return 0;
}
```

The denominator `(numPoints * sumX2 - sumX * sumX)` could theoretically be zero or very close to zero, causing division by zero or numerical instability.

**Fix:**
```java
double denominator = numPoints * sumX2 - sumX * sumX;
if (Math.abs(denominator) < 1e-10) {  // NEW
    Log.w(TAG, "Division by zero in linear regression");
    return 0;
}

double slope = (numPoints * sumXY - sumX * sumY) / denominator;

if (slope >= 0) {
    Log.w(TAG, "Positive slope detected - invalid decay");
    return 0;
}
```

**Impact:** Low - This is a defensive fix for numerical stability. The condition is unlikely but possible.

---

### 5. ❌ Bug: Incorrect getRT30() Return Value (Line 300)

**Problem:**
```java
public double getRT30() {
    return rt30 / 2.0; // Return actual RT30
}
```

This was dividing RT30 by 2, which is incorrect. The comment says "Return actual RT30" but the code was doing the opposite. This was a remnant from the confusing RT value calculations.

**Fix:**
```java
public double getRT30() {
    return rt30; // Return actual RT30 (not divided by 2)
}
```

**Impact:** Medium - This would return the wrong RT30 value to users.

---

## Summary

| Bug # | Severity | Description | Status |
|-------|----------|-------------|--------|
| 1 | High | Incorrect time measurement for auto-stop | ✅ Fixed |
| 2 | Medium | Missing empty check in calculateRecentEnergy | ✅ Fixed |
| 3 | High | Confusing RT value calculations | ✅ Fixed |
| 4 | Low | Potential division by zero in regression | ✅ Fixed |
| 5 | Medium | Incorrect RT30 return value | ✅ Fixed |

## Testing Recommendations

After these fixes, the following scenarios should be tested:

1. ✅ **Long wait before impulse**: Start measurement, wait 10 seconds, then create impulse. Verify it records for full 2+ seconds after impulse.

2. ✅ **Empty samples**: Test edge case where calculation is triggered with no samples.

3. ✅ **RT value consistency**: Verify RT20, RT30, RT60 values are calculated correctly and make physical sense (RT60 ≈ 3×RT20 ≈ 2×RT30).

4. ✅ **Very short decay**: Test in a highly damped room where decay is very fast.

5. ✅ **Numerical stability**: Test with edge cases that might cause division by zero.

## React Implementation

All bug fixes have been ported to the React/TypeScript implementation in the `react-rt60-module` directory. The React version includes:

- ✅ All bug fixes from Android version
- ✅ Web Audio API integration
- ✅ React hooks for easy integration
- ✅ Complete UI components
- ✅ Real-time visualization

See `react-rt60-module/README.md` for usage instructions.
