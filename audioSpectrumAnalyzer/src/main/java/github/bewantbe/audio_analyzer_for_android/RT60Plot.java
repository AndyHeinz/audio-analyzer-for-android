/* Copyright 2025
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package github.bewantbe.audio_analyzer_for_android;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.util.Log;

/**
 * RT60 Plot visualization
 * Displays the energy decay curve for reverberation time measurement
 */
class RT60Plot {
    private static final String TAG = "RT60Plot";

    private Paint decayCurvePaint;
    private Paint gridPaint;
    private Paint labelPaint;
    private Paint titlePaint;
    private Paint regressionLinePaint;

    private int canvasHeight = 0;
    private int canvasWidth = 0;
    private float DPRatio;

    private Plot2D plot2D;
    private ScreenPhysicalMapping axisX, axisY;

    RT60Plot(Context context) {
        DPRatio = context.getResources().getDisplayMetrics().density;

        // Decay curve paint (blue line)
        decayCurvePaint = new Paint();
        decayCurvePaint.setColor(Color.parseColor("#3AB3E2"));
        decayCurvePaint.setStyle(Paint.Style.STROKE);
        decayCurvePaint.setStrokeWidth(2.0f * DPRatio);
        decayCurvePaint.setAntiAlias(true);

        // Regression line paint (yellow dashed line)
        regressionLinePaint = new Paint();
        regressionLinePaint.setColor(Color.YELLOW);
        regressionLinePaint.setStyle(Paint.Style.STROKE);
        regressionLinePaint.setStrokeWidth(1.5f * DPRatio);
        regressionLinePaint.setAntiAlias(true);

        // Grid paint
        gridPaint = new Paint();
        gridPaint.setColor(Color.DKGRAY);
        gridPaint.setStyle(Paint.Style.STROKE);
        gridPaint.setStrokeWidth(0.6f * DPRatio);

        // Label paint
        labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setColor(Color.GRAY);
        labelPaint.setTextSize(14.0f * DPRatio);
        labelPaint.setTypeface(Typeface.MONOSPACE);

        // Title paint
        titlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        titlePaint.setColor(Color.WHITE);
        titlePaint.setTextSize(18.0f * DPRatio);
        titlePaint.setTypeface(Typeface.DEFAULT_BOLD);

        // Initialize Plot2D for time vs. dB plotting
        plot2D = new Plot2D(
                ScreenPhysicalMapping.Type.LINEAR, GridLabel.Type.FREQ,  // Use FREQ type for time axis
                ScreenPhysicalMapping.Type.LINEAR, GridLabel.Type.DB,
                canvasWidth, canvasHeight, DPRatio);
        axisX = plot2D.axisX;
        axisY = plot2D.axisY;
    }

    void setCanvas(int width, int height, double[] axisBounds) {
        canvasWidth = width;
        canvasHeight = height;
        plot2D.setCanvasBound(width, height, axisBounds, DPRatio);
        axisX = plot2D.axisX;
        axisY = plot2D.axisY;
    }

    /**
     * Draw the RT60 decay curve
     */
    void draw(Canvas canvas, double[] decayCurve, int sampleRate, double rt60,
              double rt30, double rt20, String status) {
        if (canvas == null) {
            Log.w(TAG, "draw(): null canvas");
            return;
        }

        // Clear background
        canvas.drawColor(Color.BLACK);

        // Draw title
        String title = "RT60 Measurement";
        canvas.drawText(title, 20 * DPRatio, 30 * DPRatio, titlePaint);

        // Draw status
        canvas.drawText("Status: " + status, 20 * DPRatio, 55 * DPRatio, labelPaint);

        // If no decay curve, just show waiting message
        if (decayCurve == null || decayCurve.length == 0) {
            String message = "Waiting for impulse...";
            canvas.drawText(message, canvasWidth / 2 - 100 * DPRatio,
                          canvasHeight / 2, titlePaint);
            return;
        }

        // Calculate axis bounds
        double maxTime = (double) decayCurve.length / sampleRate;
        double[] axisBounds = new double[]{0, maxTime, -70, 0}; // Time: 0 to max, dB: -70 to 0
        setCanvas(canvasWidth, canvasHeight, axisBounds);

        // Draw grid
        plot2D.drawGridLines(canvas, gridPaint);

        // Draw axis labels
        drawAxisLabels(canvas);

        // Draw decay curve
        drawDecayCurve(canvas, decayCurve, sampleRate);

        // Draw results text
        drawResults(canvas, rt60, rt30, rt20);

        // Draw reference lines at -5, -25, -35, -65 dB
        drawReferenceLines(canvas);
    }

    private void drawDecayCurve(Canvas canvas, double[] decayCurve, int sampleRate) {
        if (decayCurve.length < 2) return;

        float prevX = 0, prevY = 0;
        boolean firstPoint = true;

        for (int i = 0; i < decayCurve.length; i++) {
            double time = (double) i / sampleRate;
            double db = decayCurve[i];

            // Clamp dB values for display
            if (db < -70) db = -70;
            if (db > 0) db = 0;

            float x = (float) axisX.val2Pixel(time);
            float y = (float) axisY.val2Pixel(db);

            if (!firstPoint) {
                canvas.drawLine(prevX, prevY, x, y, decayCurvePaint);
            }

            prevX = x;
            prevY = y;
            firstPoint = false;
        }
    }

    private void drawReferenceLines(Canvas canvas) {
        Paint refPaint = new Paint(gridPaint);
        refPaint.setColor(Color.parseColor("#FF6666"));
        refPaint.setStrokeWidth(1.0f * DPRatio);

        double[] refLevels = {-5, -25, -35, -65};
        for (double dbLevel : refLevels) {
            float y = (float) axisY.val2Pixel(dbLevel);
            canvas.drawLine(0, y, canvasWidth, y, refPaint);

            // Draw label
            String label = String.format("%.0f dB", dbLevel);
            canvas.drawText(label, 5 * DPRatio, y - 5 * DPRatio, labelPaint);
        }
    }

    private void drawResults(Canvas canvas, double rt60, double rt30, double rt20) {
        float startY = canvasHeight - 120 * DPRatio;
        float lineHeight = 25 * DPRatio;

        Paint resultPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        resultPaint.setColor(Color.parseColor("#00FF00"));
        resultPaint.setTextSize(16.0f * DPRatio);
        resultPaint.setTypeface(Typeface.MONOSPACE);

        if (rt60 > 0) {
            String rt60Text = String.format("RT60: %.2f s", rt60);
            canvas.drawText(rt60Text, 20 * DPRatio, startY, resultPaint);

            String rt30Text = String.format("RT30: %.2f s", rt30);
            canvas.drawText(rt30Text, 20 * DPRatio, startY + lineHeight, resultPaint);

            String rt20Text = String.format("RT20: %.2f s", rt20);
            canvas.drawText(rt20Text, 20 * DPRatio, startY + lineHeight * 2, resultPaint);
        }
    }

    private void drawAxisLabels(Canvas canvas) {
        // X-axis label (Time)
        String xLabel = "Time (s)";
        float xLabelX = canvasWidth / 2 - 40 * DPRatio;
        float xLabelY = canvasHeight - 10 * DPRatio;
        canvas.drawText(xLabel, xLabelX, xLabelY, labelPaint);

        // Y-axis label (dB)
        String yLabel = "Level (dB)";
        canvas.save();
        canvas.rotate(-90, 15 * DPRatio, canvasHeight / 2);
        canvas.drawText(yLabel, 15 * DPRatio, canvasHeight / 2, labelPaint);
        canvas.restore();

        // Draw tick labels
        plot2D.drawTickLabels(canvas, labelPaint);
    }

    void setZooming(boolean isZooming) {
        // Future: implement zoom functionality if needed
    }
}
