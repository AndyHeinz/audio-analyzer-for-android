/**
 * App.tsx
 * Example React Native Room Scanner App
 *
 * Copyright 2025
 * Licensed under the Apache License, Version 2.0
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoomScanner, RoomLayout } from 'react-native-room-scanner';

export default function App() {
  const {
    startScan,
    stopScan,
    reset,
    isScanning,
    roomLayout,
    error,
    isSupported,
    progress,
    platform,
    hasLiDAR,
    capabilities
  } = useRoomScanner({
    onScanComplete: (layout) => {
      Alert.alert('Scan Complete!', `Scanned a ${layout.width.toFixed(1)}m × ${layout.length.toFixed(1)}m room`);
    },
    onError: (err) => {
      Alert.alert('Scan Failed', err.message);
    }
  });

  // Device not supported
  if (!isSupported) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>❌ Not Supported</Text>
          <Text style={styles.errorText}>
            Room scanning is not available on this device.
          </Text>
          <Text style={styles.info}>
            Platform: {platform}{'\n'}
            LiDAR: {hasLiDAR ? 'Yes' : 'No'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏠 Room Scanner</Text>
          <Text style={styles.subtitle}>
            {platform === 'ios' ? '📱 iOS · RoomPlan' : '🤖 Android · ARCore'}
          </Text>
        </View>

        {/* Device Info */}
        {capabilities && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Device Info</Text>
            <InfoRow label="Platform" value={capabilities.platform.toUpperCase()} />
            <InfoRow label="LiDAR" value={capabilities.hasLiDAR ? 'Yes ✅' : 'No'} />
            <InfoRow label="Expected Accuracy" value={`${(capabilities.expectedAccuracy * 100).toFixed(0)}%`} />
            <InfoRow label="Typical Scan Time" value={`~${capabilities.typicalScanDuration}s`} />
          </View>
        )}

        {/* Scanning Status */}
        {isScanning && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⏳ Scanning...</Text>
            <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
            {progress > 0 && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            )}
            <Text style={styles.info}>
              Walk slowly around the room.{'\n'}
              Point your device at walls, floor, and ceiling.
            </Text>
            <Button title="Stop Scan" onPress={stopScan} color="#FF3B30" />
          </View>
        )}

        {/* Error */}
        {error && !isScanning && (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.errorTitle}>⚠️ Error</Text>
            <Text style={styles.errorText}>{error.message}</Text>
            <Text style={styles.errorCode}>Code: {error.code}</Text>
            <Button title="Try Again" onPress={() => { reset(); startScan(); }} />
          </View>
        )}

        {/* Results */}
        {roomLayout && !isScanning && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📐 Room Dimensions</Text>
              <InfoRow label="Width" value={`${roomLayout.width.toFixed(2)} m`} />
              <InfoRow label="Length" value={`${roomLayout.length.toFixed(2)} m`} />
              <InfoRow label="Height" value={`${roomLayout.height.toFixed(2)} m`} />
              <InfoRow label="Floor Area" value={`${roomLayout.floorArea.toFixed(1)} m²`} />
              <InfoRow label="Volume" value={`${roomLayout.volume.toFixed(1)} m³`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🧱 Structure</Text>
              <InfoRow label="Walls" value={`${roomLayout.walls.length}`} />
              <InfoRow label="Doors" value={`${roomLayout.openings.filter(o => o.type === 'door').length}`} />
              <InfoRow label="Windows" value={`${roomLayout.openings.filter(o => o.type === 'window').length}`} />
            </View>

            {/* Walls Detail */}
            {roomLayout.walls.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Walls Detail</Text>
                {roomLayout.walls.map((wall, index) => (
                  <View key={wall.id} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Wall {index + 1}</Text>
                    <Text style={styles.detailValue}>
                      {wall.height.toFixed(2)}m tall · {(calculateWallLength(wall)).toFixed(2)}m long · {(wall.confidence * 100).toFixed(0)}% confidence
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Openings Detail */}
            {roomLayout.openings.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Openings Detail</Text>
                {roomLayout.openings.map((opening) => (
                  <View key={opening.id} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {opening.type === 'door' ? '🚪' : '🪟'} {opening.type.charAt(0).toUpperCase() + opening.type.slice(1)}
                    </Text>
                    <Text style={styles.detailValue}>
                      {opening.width.toFixed(2)}m × {opening.height.toFixed(2)}m · {(opening.confidence * 100).toFixed(0)}% confidence
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Metadata */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ℹ️ Scan Info</Text>
              <InfoRow label="Scan Duration" value={`${roomLayout.metadata.scanDuration.toFixed(1)}s`} />
              <InfoRow label="Timestamp" value={new Date(roomLayout.timestamp).toLocaleTimeString()} />
            </View>

            <View style={styles.actions}>
              <Button title="📋 Export JSON" onPress={() => handleExport(roomLayout)} />
              <Button title="🔄 New Scan" onPress={() => { reset(); startScan(); }} color="#34C759" />
            </View>
          </View>
        )}

        {/* Start Scan Button */}
        {!isScanning && !roomLayout && (
          <View style={styles.card}>
            <Button
              title="▶️ Start Room Scan"
              onPress={startScan}
              color="#007AFF"
            />
            <Text style={styles.info}>
              {platform === 'ios'
                ? 'Walk around the room to scan with LiDAR'
                : 'Point camera at walls and move slowly'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// Helper Functions

function calculateWallLength(wall: { start: { x: number; z: number }; end: { x: number; z: number } }): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function handleExport(layout: RoomLayout) {
  const json = JSON.stringify(layout, null, 2);
  console.log('Room Layout JSON:', json);
  Alert.alert('Exported', 'Room layout logged to console');
  // In production: save to file or send to server
}

// Styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    color: '#8E8E93',
  },
  spinner: {
    marginVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  info: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    gap: 12,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    marginBottom: 8,
  },
  errorCode: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
});
