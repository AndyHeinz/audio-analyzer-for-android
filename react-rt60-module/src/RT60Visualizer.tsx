/**
 * React Component for RT60 Visualization
 *
 * Displays the energy decay curve and RT60 measurement results
 *
 * @author React component
 * @license Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { RT60Result } from './RT60Calculator';

export interface RT60VisualizerProps {
  result: RT60Result | null;
  width?: number;
  height?: number;
  className?: string;
}

export const RT60Visualizer: React.FC<RT60VisualizerProps> = ({
  result,
  width = 800,
  height = 600,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('RT60 Measurement', 20, 30);

    // Draw status
    if (result) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '14px monospace';
      ctx.fillText(`Status: ${result.status}`, 20, 55);
    }

    // If no decay curve, show waiting message
    if (!result?.decayCurve || result.decayCurve.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      const message = result?.status || 'Waiting for impulse...';
      ctx.fillText(message, width / 2 - 100, height / 2);
      return;
    }

    const decayCurve = result.decayCurve;
    const sampleRate = result.numSamples / result.duration;

    // Calculate axis bounds
    const maxTime = decayCurve.length / sampleRate;
    const minDB = -70;
    const maxDB = 0;

    const padding = { left: 60, right: 40, top: 80, bottom: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Helper functions for coordinate transformation
    const timeToX = (time: number) => padding.left + (time / maxTime) * plotWidth;
    const dbToY = (db: number) => padding.top + ((maxDB - db) / (maxDB - minDB)) * plotHeight;

    // Draw grid
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    for (let t = 0; t <= maxTime; t += 0.5) {
      const x = timeToX(t);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    // Horizontal grid lines (dB)
    for (let db = minDB; db <= maxDB; db += 10) {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Draw reference lines
    ctx.strokeStyle = '#FF6666';
    ctx.lineWidth = 1;
    const refLevels = [-5, -25, -35, -65];
    refLevels.forEach(dbLevel => {
      const y = dbToY(dbLevel);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '12px monospace';
      ctx.fillText(`${dbLevel} dB`, 5, y - 5);
    });

    // Draw decay curve
    ctx.strokeStyle = '#3AB3E2';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < decayCurve.length; i++) {
      const time = i / sampleRate;
      let db = decayCurve[i];

      // Clamp dB values
      if (db < minDB) db = minDB;
      if (db > maxDB) db = maxDB;

      const x = timeToX(time);
      const y = dbToY(db);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '14px monospace';

    // X-axis label
    ctx.fillText('Time (s)', width / 2 - 40, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Level (dB)', 0, 0);
    ctx.restore();

    // Draw tick labels
    ctx.font = '12px monospace';

    // X-axis ticks
    for (let t = 0; t <= maxTime; t += 1) {
      const x = timeToX(t);
      ctx.fillText(t.toFixed(1), x - 10, height - padding.bottom + 20);
    }

    // Draw results
    if (result.rt60 > 0) {
      const startY = height - 120;
      const lineHeight = 25;

      ctx.fillStyle = '#00FF00';
      ctx.font = '16px monospace';

      ctx.fillText(`RT60: ${result.rt60.toFixed(2)} s`, 20, startY);
      ctx.fillText(`RT30: ${result.rt30.toFixed(2)} s`, 20, startY + lineHeight);
      ctx.fillText(`RT20: ${result.rt20.toFixed(2)} s`, 20, startY + lineHeight * 2);
    }

  }, [result, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ border: '1px solid #333' }}
    />
  );
};
