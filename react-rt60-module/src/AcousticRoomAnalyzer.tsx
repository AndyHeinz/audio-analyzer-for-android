/**
 * AcousticRoomAnalyzer.tsx
 * React Component for Complete Acoustic Room Analysis
 *
 * Combines RT60 measurement with room dimensions
 * to calculate acoustic properties (no LiDAR needed)
 *
 * @license Apache-2.0
 */

import React, { useState } from 'react';
import { RT60Result } from './RT60Calculator';
import { useRT60 } from './useRT60';

// Room geometry from manual input
export interface RoomDimensions {
  length: number;      // meters
  width: number;       // meters
  height: number;      // meters
}

// Room type classification
export enum RoomType {
  Small = 'Small Room',
  Medium = 'Medium Room',
  Large = 'Large Room',
  Hall = 'Hall/Auditorium',
}

// Acoustic quality assessment
export enum AcousticQuality {
  Excellent = 'Excellent',
  Good = 'Good',
  Acceptable = 'Acceptable',
  Poor = 'Poor',
  VeryPoor = 'Very Poor',
}

// Complete acoustic analysis result
export interface AcousticAnalysis {
  // Input data
  rt60Result: RT60Result;
  roomDimensions: RoomDimensions;

  // Calculated metrics
  volume: number;                      // m³
  floorArea: number;                   // m²
  totalSurfaceArea: number;            // m²
  meanAbsorptionCoefficient: number;   // 0-1
  totalAbsorption: number;             // Sabins (m²)
  theoreticalRT60Sabine: number;       // seconds
  theoreticalRT60Eyring: number;       // seconds
  rt60Deviation: number;               // percentage

  // Assessment
  roomType: RoomType;
  acousticQuality: AcousticQuality;
  qualityEmoji: string;

  // Recommendations
  recommendations: string[];
}

// Acoustic analysis logic
export class AcousticAnalyzer {

  static analyze(rt60Result: RT60Result, dimensions: RoomDimensions): AcousticAnalysis {
    // Calculate room metrics
    const volume = dimensions.length * dimensions.width * dimensions.height;
    const floorArea = dimensions.length * dimensions.width;
    const wallArea = 2 * (dimensions.length + dimensions.width) * dimensions.height;
    const ceilingArea = floorArea;
    const totalSurfaceArea = wallArea + floorArea + ceilingArea;

    // Classify room type
    const roomType = this.classifyRoomType(volume);

    // Calculate acoustic properties using Sabine formula
    // Sabine: RT60 = 0.161 × V / A
    // Where: V = volume (m³), A = total absorption (m²)
    const measuredRT60 = rt60Result.rt60;

    let meanAbsorptionCoefficient = 0;
    let totalAbsorption = 0;
    let theoreticalRT60Sabine = 0;
    let theoreticalRT60Eyring = 0;
    let rt60Deviation = 0;

    if (measuredRT60 > 0.01) {
      // Calculate total absorption from measured RT60
      totalAbsorption = 0.161 * volume / measuredRT60;

      // Calculate mean absorption coefficient: α_mean = A / S
      meanAbsorptionCoefficient = Math.min(1.0, totalAbsorption / totalSurfaceArea);

      // Theoretical RT60 using Sabine
      theoreticalRT60Sabine = 0.161 * volume / totalAbsorption;

      // Theoretical RT60 using Eyring: RT60 = 0.161 × V / (-S × ln(1 - α))
      const eyringDenominator = -totalSurfaceArea * Math.log(1.0 - meanAbsorptionCoefficient);
      theoreticalRT60Eyring = eyringDenominator > 0.001
        ? 0.161 * volume / eyringDenominator
        : measuredRT60;

      // Calculate deviation
      rt60Deviation = Math.abs(measuredRT60 - theoreticalRT60Sabine) / measuredRT60;
    }

    // Assess acoustic quality
    const acousticQuality = this.assessAcousticQuality(measuredRT60, volume, roomType);
    const qualityEmoji = this.getQualityEmoji(acousticQuality);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      measuredRT60,
      meanAbsorptionCoefficient,
      acousticQuality,
      roomType,
      dimensions
    );

    return {
      rt60Result,
      roomDimensions: dimensions,
      volume,
      floorArea,
      totalSurfaceArea,
      meanAbsorptionCoefficient,
      totalAbsorption,
      theoreticalRT60Sabine,
      theoreticalRT60Eyring,
      rt60Deviation,
      roomType,
      acousticQuality,
      qualityEmoji,
      recommendations,
    };
  }

  private static classifyRoomType(volume: number): RoomType {
    if (volume < 50) return RoomType.Small;
    if (volume < 200) return RoomType.Medium;
    if (volume < 500) return RoomType.Large;
    return RoomType.Hall;
  }

  private static assessAcousticQuality(
    rt60: number,
    volume: number,
    roomType: RoomType
  ): AcousticQuality {
    // Optimal RT60 ranges for speech
    let optimalMin: number, optimalMax: number;
    let acceptableMin: number, acceptableMax: number;

    switch (roomType) {
      case RoomType.Small:
        optimalMin = 0.3; optimalMax = 0.5;
        acceptableMin = 0.2; acceptableMax = 0.7;
        break;
      case RoomType.Medium:
        optimalMin = 0.4; optimalMax = 0.7;
        acceptableMin = 0.3; acceptableMax = 1.0;
        break;
      case RoomType.Large:
        optimalMin = 0.6; optimalMax = 1.0;
        acceptableMin = 0.4; acceptableMax = 1.5;
        break;
      case RoomType.Hall:
        optimalMin = 0.8; optimalMax = 1.5;
        acceptableMin = 0.6; acceptableMax = 2.0;
        break;
    }

    if (rt60 >= optimalMin && rt60 <= optimalMax) {
      return AcousticQuality.Excellent;
    } else if (rt60 >= acceptableMin && rt60 <= acceptableMax) {
      const distanceToOptimal = Math.min(
        Math.abs(rt60 - optimalMin),
        Math.abs(rt60 - optimalMax)
      );
      return distanceToOptimal < 0.1 ? AcousticQuality.Good : AcousticQuality.Acceptable;
    } else if (rt60 < acceptableMin - 0.2 || rt60 > acceptableMax + 0.5) {
      return AcousticQuality.VeryPoor;
    } else {
      return AcousticQuality.Poor;
    }
  }

  private static getQualityEmoji(quality: AcousticQuality): string {
    switch (quality) {
      case AcousticQuality.Excellent: return '🟢';
      case AcousticQuality.Good: return '🟡';
      case AcousticQuality.Acceptable: return '🟠';
      case AcousticQuality.Poor: return '🔴';
      case AcousticQuality.VeryPoor: return '⛔';
    }
  }

  private static generateRecommendations(
    rt60: number,
    absorption: number,
    quality: AcousticQuality,
    roomType: RoomType,
    dimensions: RoomDimensions
  ): string[] {
    const recommendations: string[] = [];

    // Get optimal RT60
    const optimalRT60 = roomType === RoomType.Small ? 0.4
      : roomType === RoomType.Medium ? 0.55
      : roomType === RoomType.Large ? 0.8
      : 1.2;

    // RT60 too long
    if (rt60 > optimalRT60 * 1.3) {
      recommendations.push('⚠️ Room is too reverberant (RT60 too long)');
      recommendations.push('Add acoustic panels or sound-absorbing materials');
      recommendations.push('Consider carpets, curtains, or acoustic ceiling tiles');

      if (dimensions.length * dimensions.width > 10) {
        recommendations.push('Large floor area detected - add rugs or carpet');
      }

      if (absorption < 0.15) {
        recommendations.push('Very low absorption - add soft furnishings (sofas, cushions)');
      }
    }

    // RT60 too short
    if (rt60 < optimalRT60 * 0.7) {
      recommendations.push('⚠️ Room is too acoustically dead (RT60 too short)');
      recommendations.push('Add reflective surfaces to increase reverberation');
      recommendations.push('Consider hard flooring or reducing soft materials');

      if (absorption > 0.4) {
        recommendations.push('Very high absorption detected - remove some absorbers');
      }
    }

    // Optimal quality
    if (quality === AcousticQuality.Excellent) {
      recommendations.push('✅ Acoustic quality is excellent for this room type');
      recommendations.push('RT60 is in the optimal range for speech clarity');
    } else if (quality === AcousticQuality.Good) {
      recommendations.push('✅ Acoustic quality is good');
      recommendations.push('Minor adjustments could optimize further');
    }

    // Room-specific
    if (roomType === RoomType.Small && rt60 > 0.6) {
      recommendations.push('Small rooms benefit from more absorption');
    }

    if (roomType === RoomType.Hall && rt60 < 0.8) {
      recommendations.push('Halls typically need more reverberation for music');
    }

    if (recommendations.length === 0) {
      recommendations.push('No specific recommendations - room acoustics are acceptable');
    }

    return recommendations;
  }
}

// React Component
export interface AcousticRoomAnalyzerProps {
  sampleRate?: number;
}

export const AcousticRoomAnalyzer: React.FC<AcousticRoomAnalyzerProps> = ({
  sampleRate = 48000,
}) => {
  // State
  const [step, setStep] = useState<'intro' | 'dimensions' | 'measuring' | 'results'>('intro');
  const [dimensions, setDimensions] = useState<RoomDimensions>({ length: 5, width: 4, height: 2.5 });
  const [analysis, setAnalysis] = useState<AcousticAnalysis | null>(null);

  // RT60 hook
  const { isRecording, result, startMeasurement, stopMeasurement } = useRT60({ sampleRate });

  // Handlers
  const handleStartAnalysis = () => {
    setStep('dimensions');
  };

  const handleDimensionsSubmit = () => {
    setStep('measuring');
  };

  const handleRT60Complete = () => {
    if (result && result.rt60 > 0) {
      const analysisResult = AcousticAnalyzer.analyze(result, dimensions);
      setAnalysis(analysisResult);
      setStep('results');
    }
  };

  const handleReset = () => {
    setStep('intro');
    setAnalysis(null);
  };

  // Render
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* Intro */}
      {step === 'intro' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎵</div>
          <h1>Acoustic Room Analyzer</h1>
          <p style={{ color: '#666', marginBottom: '30px' }}>
            Combines room dimensions with RT60 measurement for complete acoustic analysis
          </p>

          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
            <FeatureRow icon="📐" title="Room Dimensions" description="Enter length, width, height" />
            <FeatureRow icon="📊" title="RT60 Measurement" description="Measure reverberation time" />
            <FeatureRow icon="📈" title="Acoustic Analysis" description="Calculate absorption & quality" />
          </div>

          <button
            onClick={handleStartAnalysis}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            Start Analysis
          </button>
        </div>
      )}

      {/* Dimensions Input */}
      {step === 'dimensions' && (
        <div>
          <h2>Room Dimensions</h2>
          <p style={{ color: '#666' }}>Enter the dimensions of your room in meters</p>

          <div style={{ marginTop: '30px' }}>
            <DimensionInput
              label="Length (m)"
              value={dimensions.length}
              onChange={(v) => setDimensions({ ...dimensions, length: v })}
            />
            <DimensionInput
              label="Width (m)"
              value={dimensions.width}
              onChange={(v) => setDimensions({ ...dimensions, width: v })}
            />
            <DimensionInput
              label="Height (m)"
              value={dimensions.height}
              onChange={(v) => setDimensions({ ...dimensions, height: v })}
            />

            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
              <InfoRow label="Volume" value={`${(dimensions.length * dimensions.width * dimensions.height).toFixed(1)} m³`} />
              <InfoRow label="Floor Area" value={`${(dimensions.length * dimensions.width).toFixed(1)} m²`} />
            </div>

            <button
              onClick={handleDimensionsSubmit}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginTop: '30px',
              }}
            >
              Continue to RT60 Measurement
            </button>
          </div>
        </div>
      )}

      {/* RT60 Measurement */}
      {step === 'measuring' && (
        <div>
          <h2>RT60 Measurement</h2>
          <p style={{ color: '#666' }}>{result?.status || 'Click Start to begin measurement'}</p>

          {result && result.rt60 > 0 && (
            <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
              <InfoRow label="RT60" value={`${result.rt60.toFixed(2)} s`} />
              <InfoRow label="RT30" value={`${result.rt30.toFixed(2)} s`} />
              <InfoRow label="RT20" value={`${result.rt20.toFixed(2)} s`} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button
              onClick={startMeasurement}
              disabled={isRecording}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: isRecording ? '#ccc' : '#34C759',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isRecording ? 'not-allowed' : 'pointer',
              }}
            >
              ▶️ Start
            </button>
            <button
              onClick={() => {
                stopMeasurement();
                handleRT60Complete();
              }}
              disabled={!isRecording && !result}
              style={{
                flex: 1,
                padding: '15px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: (!isRecording && !result) ? '#ccc' : '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: (!isRecording && !result) ? 'not-allowed' : 'pointer',
              }}
            >
              ✓ Done
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {step === 'results' && analysis && (
        <div>
          <div style={{
            textAlign: 'center',
            padding: '30px',
            background: '#E3F2FD',
            borderRadius: '16px',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '60px', marginBottom: '10px' }}>{analysis.qualityEmoji}</div>
            <h2 style={{ margin: '10px 0' }}>{analysis.acousticQuality}</h2>
            <p style={{ color: '#666' }}>{analysis.roomType}</p>
          </div>

          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3>Key Metrics</h3>
            <InfoRow label="Measured RT60" value={`${analysis.rt60Result.rt60.toFixed(2)} s`} />
            <InfoRow label="Theoretical RT60" value={`${analysis.theoreticalRT60Sabine.toFixed(2)} s`} />
            <InfoRow label="Room Volume" value={`${analysis.volume.toFixed(1)} m³`} />
            <InfoRow label="Absorption Coeff." value={analysis.meanAbsorptionCoefficient.toFixed(3)} />
          </div>

          <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3>Recommendations</h3>
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} style={{ marginBottom: '10px', lineHeight: '1.5' }}>
                ➤ {rec}
              </div>
            ))}
          </div>

          <button
            onClick={handleReset}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            New Analysis
          </button>
        </div>
      )}
    </div>
  );
};

// Helper Components
const FeatureRow: React.FC<{ icon: string; title: string; description: string }> = ({
  icon, title, description
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
    <div style={{ fontSize: '30px' }}>{icon}</div>
    <div>
      <div style={{ fontWeight: 'bold' }}>{title}</div>
      <div style={{ fontSize: '14px', color: '#666' }}>{description}</div>
    </div>
  </div>
);

const DimensionInput: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label, value, onChange
}) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>{label}</label>
    <input
      type="number"
      step="0.1"
      min="0.5"
      max="100"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width: '100%',
        padding: '12px',
        fontSize: '16px',
        border: '2px solid #ddd',
        borderRadius: '8px',
      }}
    />
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
    <span style={{ color: '#666' }}>{label}</span>
    <span style={{ fontWeight: 'bold' }}>{value}</span>
  </div>
);
