/**
 * Example React App using RT60 Component
 *
 * This demonstrates how to integrate RT60 measurement into a React application.
 */

import React, { useState } from 'react';
import { RT60Component } from '../src';

function App() {
  const [measurements, setMeasurements] = useState<Array<{
    timestamp: Date;
    rt60: number;
    rt30: number;
    rt20: number;
  }>>([]);

  const handleResult = (rt60: number, rt30: number, rt20: number) => {
    console.log(`New RT60 measurement: ${rt60.toFixed(2)}s`);

    setMeasurements(prev => [...prev, {
      timestamp: new Date(),
      rt60,
      rt30,
      rt20
    }]);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f0f0',
      padding: '20px'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1>RT60 Measurement Example</h1>
        <p>Measure room reverberation time using your browser</p>
      </header>

      <main>
        <RT60Component
          width={900}
          height={600}
          options={{
            sampleRate: 48000,
            minRecordingTime: 2.0,
            maxRecordingTime: 10.0,
            impulseThreshold: 0.3,
            noiseFloor: 0.01
          }}
          onResult={handleResult}
        />

        {measurements.length > 0 && (
          <section style={{
            marginTop: '40px',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '900px',
            margin: '40px auto 0'
          }}>
            <h2>Measurement History</h2>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Time</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>RT60</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>RT30</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>RT20</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: idx % 2 === 0 ? '#f9f9f9' : 'white'
                  }}>
                    <td style={{ padding: '10px' }}>
                      {m.timestamp.toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {m.rt60.toFixed(3)} s
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {m.rt30.toFixed(3)} s
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      {m.rt20.toFixed(3)} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {measurements.length > 1 && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#e7f3ff',
                borderRadius: '6px'
              }}>
                <strong>Statistics:</strong>
                <div style={{ marginTop: '10px' }}>
                  Average RT60: {(
                    measurements.reduce((sum, m) => sum + m.rt60, 0) / measurements.length
                  ).toFixed(3)} s
                </div>
                <div>
                  Standard Deviation: {calculateStdDev(measurements.map(m => m.rt60)).toFixed(3)} s
                </div>
              </div>
            )}

            <button
              onClick={() => setMeasurements([])}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear History
            </button>
          </section>
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        marginTop: '60px',
        padding: '20px',
        color: '#666'
      }}>
        <p>RT60 React Module - Example Application</p>
        <p style={{ fontSize: '12px' }}>
          Based on Audio Analyzer for Android | Apache 2.0 License
        </p>
      </footer>
    </div>
  );
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(avgSquareDiff);
}

export default App;
