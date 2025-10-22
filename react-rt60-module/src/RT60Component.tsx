/**
 * Complete RT60 Measurement Component for React
 *
 * This component provides a full RT60 measurement interface with
 * controls, visualization, and results display.
 *
 * @author React component
 * @license Apache-2.0
 */

import React from 'react';
import { useRT60, UseRT60Options } from './useRT60';
import { RT60Visualizer } from './RT60Visualizer';

export interface RT60ComponentProps {
  options?: UseRT60Options;
  width?: number;
  height?: number;
  onResult?: (rt60: number, rt30: number, rt20: number) => void;
}

export const RT60Component: React.FC<RT60ComponentProps> = ({
  options,
  width = 800,
  height = 600,
  onResult
}) => {
  const {
    isRecording,
    result,
    error,
    startMeasurement,
    stopMeasurement,
    reset,
    isSupported,
    hasPermission
  } = useRT60(options);

  // Call onResult callback when result changes
  React.useEffect(() => {
    if (result && result.rt60 > 0 && onResult) {
      onResult(result.rt60, result.rt30, result.rt20);
    }
  }, [result, onResult]);

  if (!isSupported) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          ⚠️ Web Audio API is not supported in this browser.
          Please use a modern browser like Chrome, Firefox, or Edge.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>RT60 Reverberation Time Measurement</h2>
        <p style={styles.subtitle}>
          Measure the acoustic reverberation time of a room
        </p>
      </div>

      <div style={styles.controls}>
        <button
          onClick={startMeasurement}
          disabled={isRecording}
          style={{
            ...styles.button,
            ...(isRecording ? styles.buttonDisabled : styles.buttonPrimary)
          }}
        >
          {isRecording ? '⏺ Recording...' : '▶ Start Measurement'}
        </button>

        <button
          onClick={stopMeasurement}
          disabled={!isRecording}
          style={{
            ...styles.button,
            ...(!isRecording ? styles.buttonDisabled : styles.buttonSecondary)
          }}
        >
          ⏹ Stop
        </button>

        <button
          onClick={reset}
          style={{
            ...styles.button,
            ...styles.buttonSecondary
          }}
        >
          🔄 Reset
        </button>
      </div>

      {error && (
        <div style={styles.error}>
          ❌ Error: {error}
        </div>
      )}

      {!hasPermission && !error && (
        <div style={styles.info}>
          ℹ️ Microphone permission is required for RT60 measurement.
          Click "Start Measurement" to grant permission.
        </div>
      )}

      {isRecording && (
        <div style={styles.status}>
          <div style={styles.statusIndicator} />
          <span>
            {result?.status || 'Initializing...'}
          </span>
        </div>
      )}

      <div style={styles.visualizer}>
        <RT60Visualizer
          result={result}
          width={width}
          height={height}
        />
      </div>

      {result && result.rt60 > 0 && (
        <div style={styles.results}>
          <h3 style={styles.resultsTitle}>Measurement Results</h3>
          <div style={styles.resultGrid}>
            <div style={styles.resultItem}>
              <div style={styles.resultLabel}>RT60</div>
              <div style={styles.resultValue}>{result.rt60.toFixed(2)} s</div>
              <div style={styles.resultDescription}>
                Time for 60 dB decay (extrapolated)
              </div>
            </div>

            <div style={styles.resultItem}>
              <div style={styles.resultLabel}>RT30</div>
              <div style={styles.resultValue}>{result.rt30.toFixed(2)} s</div>
              <div style={styles.resultDescription}>
                Time for 30 dB decay (measured)
              </div>
            </div>

            <div style={styles.resultItem}>
              <div style={styles.resultLabel}>RT20</div>
              <div style={styles.resultValue}>{result.rt20.toFixed(2)} s</div>
              <div style={styles.resultDescription}>
                Time for 20 dB decay (measured)
              </div>
            </div>

            <div style={styles.resultItem}>
              <div style={styles.resultLabel}>Duration</div>
              <div style={styles.resultValue}>{result.duration.toFixed(2)} s</div>
              <div style={styles.resultDescription}>
                Recording duration
              </div>
            </div>

            <div style={styles.resultItem}>
              <div style={styles.resultLabel}>Samples</div>
              <div style={styles.resultValue}>{result.numSamples.toLocaleString()}</div>
              <div style={styles.resultDescription}>
                Number of samples recorded
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={styles.instructions}>
        <h3 style={styles.instructionsTitle}>How to Measure RT60</h3>
        <ol style={styles.instructionsList}>
          <li>Click "Start Measurement" to begin</li>
          <li>Create a loud, short impulse sound:
            <ul>
              <li>Clap your hands loudly</li>
              <li>Pop a balloon</li>
              <li>Use a starter pistol (outdoor use)</li>
              <li>Any other sharp, loud sound</li>
            </ul>
          </li>
          <li>Wait while the app records the sound decay (2-10 seconds)</li>
          <li>View the results and energy decay curve</li>
        </ol>

        <div style={styles.tip}>
          <strong>💡 Tip:</strong> For best results, use a room with some reverberation
          (RT60 &gt; 0.3s). Very small or heavily damped rooms may be difficult to measure.
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f5f5'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#333'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0'
  },
  controls: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  },
  buttonPrimary: {
    backgroundColor: '#007bff',
    color: 'white'
  },
  buttonSecondary: {
    backgroundColor: '#6c757d',
    color: 'white'
  },
  buttonDisabled: {
    backgroundColor: '#e0e0e0',
    color: '#999',
    cursor: 'not-allowed'
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  statusIndicator: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#ff0000',
    animation: 'pulse 1.5s infinite'
  },
  error: {
    padding: '15px',
    backgroundColor: '#f8d7da',
    border: '1px solid #f5c6cb',
    borderRadius: '6px',
    color: '#721c24',
    marginBottom: '20px'
  },
  info: {
    padding: '15px',
    backgroundColor: '#d1ecf1',
    border: '1px solid #bee5eb',
    borderRadius: '6px',
    color: '#0c5460',
    marginBottom: '20px'
  },
  visualizer: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'center'
  },
  results: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333'
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px'
  },
  resultItem: {
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    textAlign: 'center'
  },
  resultLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '5px',
    fontWeight: '500'
  },
  resultValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '5px'
  },
  resultDescription: {
    fontSize: '11px',
    color: '#999'
  },
  instructions: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  instructionsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333'
  },
  instructionsList: {
    color: '#555',
    lineHeight: '1.8',
    paddingLeft: '20px'
  },
  tip: {
    marginTop: '15px',
    padding: '12px',
    backgroundColor: '#e7f3ff',
    borderLeft: '4px solid #007bff',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#004085'
  }
};
