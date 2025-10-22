# Complete Setup Guide - React Native Room Scanner
## Step-by-Step Integration into Your App

**Status:** iOS ✅ Ready | Android ⚠️ Placeholder Only

---

## ⚠️ WICHTIG - Aktuelle Einschränkungen:

### ✅ **iOS - Funktioniert!**
- RoomPlan Integration ist **vollständig implementiert**
- Wird **sofort funktionieren** nach Setup
- Braucht iPhone 12 Pro+ oder iPad Pro mit LiDAR

### ⚠️ **Android - Nur Placeholder!**
- ARCore ist **NICHT implementiert**
- Gibt aktuell nur **Beispiel-Daten** zurück
- **KEIN echtes Room Scanning**
- Für Production: ARCore Implementation nötig (2-3 Tage Arbeit)

---

## 📦 Installation

### Schritt 1: Modul in dein Projekt kopieren

```bash
# Kopiere den react-native-room-scanner Ordner in dein Projekt
cp -r react-native-room-scanner /path/to/your/react-native-project/

# ODER als npm package installieren (wenn published)
npm install react-native-room-scanner
```

---

## 🍎 iOS Setup (Funktioniert!)

### Schritt 1: CocoaPods installieren

```bash
cd ios
pod install
cd ..
```

### Schritt 2: Info.plist Permissions hinzufügen

Öffne `ios/YourApp/Info.plist` und füge hinzu:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan your room with LiDAR</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>We need photo library access to save room scans</string>
```

### Schritt 3: Deployment Target prüfen

Öffne Xcode → Project Settings → Deployment Info

```
iOS Deployment Target: 16.0 oder höher
```

### Schritt 4: RoomPlan Framework linken (automatisch via CocoaPods)

Das Podspec linkt automatisch RoomPlan. Falls manuell nötig:

1. Xcode → Target → Build Phases → Link Binary With Libraries
2. Klicke `+` → Suche "RoomPlan.framework" → Add

### Schritt 5: Swift Bridging Header (falls nötig)

Falls du Objective-C nutzt, erstelle `YourApp-Bridging-Header.h`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

Dann in Xcode:
- Build Settings → Objective-C Bridging Header
- Setze auf: `YourApp/YourApp-Bridging-Header.h`

### ✅ iOS ist fertig! Teste es:

```tsx
import { useRoomScanner } from 'react-native-room-scanner';

function App() {
  const { startScan, roomLayout, isSupported } = useRoomScanner();

  if (!isSupported) {
    return <Text>LiDAR not supported</Text>;
  }

  return <Button title="Scan Room" onPress={startScan} />;
}
```

---

## 🤖 Android Setup (Nur Placeholder!)

⚠️ **ACHTUNG:** Android gibt aktuell nur **Dummy-Daten** zurück!

### Schritt 1: Gradle Dependencies

Sollte automatisch funktionieren via `android/build.gradle`

Falls Fehler, füge manuell in `android/app/build.gradle` hinzu:

```gradle
dependencies {
    implementation project(':react-native-room-scanner')
}
```

### Schritt 2: Package in MainApplication hinzufügen

`android/app/src/main/java/.../MainApplication.java`:

```java
import com.roomscanner.RoomScannerPackage;

@Override
protected List<ReactPackage> getPackages() {
    return Arrays.<ReactPackage>asList(
        new MainReactPackage(),
        new RoomScannerPackage()  // ← Hinzufügen
    );
}
```

### Schritt 3: Permissions in AndroidManifest.xml

`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera.ar" android:required="false"/>

<application>
    <!-- ARCore (optional) -->
    <meta-data
        android:name="com.google.ar.core"
        android:value="optional" />
</application>
```

### Schritt 4: Runtime Permission Request

```tsx
import { PermissionsAndroid } from 'react-native';

async function requestCameraPermission() {
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
            title: "Camera Permission",
            message: "We need camera access to scan your room",
            buttonPositive: "OK"
        }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Vor dem Scan aufrufen:
await requestCameraPermission();
const { startScan } = useRoomScanner();
await startScan();
```

### ⚠️ Android gibt nur Beispiel-Daten!

Die Android-Implementation ist aktuell ein **Placeholder**:

```kotlin
// In RoomScannerModule.kt - Zeile 62
Log.i(TAG, "Starting room scan (placeholder mode)")

// PLACEHOLDER: Simulated room data
// In production: Replace with actual ARCore plane detection
```

**Ergebnis:** Du bekommst immer den gleichen Beispiel-Raum (5.2m × 4.8m).

---

## 🧪 Testing

### iOS Testing (Funktioniert!)

```bash
# 1. Build for iOS
cd ios
pod install
cd ..

# 2. Run on real device (LiDAR needed!)
npx react-native run-ios --device

# 3. Test Room Scan
# - Öffne App
# - Klicke "Start Scan"
# - Laufe durch den Raum
# - Warte bis Scan fertig
```

**Erwartung:** ✅ Echter 3D-Scan mit RoomPlan

### Android Testing (Nur Dummy!)

```bash
# 1. Run on Android
npx react-native run-android

# 2. Test Room Scan
# - Öffne App
# - Klicke "Start Scan"
```

**Erwartung:** ⚠️ Bekommt sofort Dummy-Daten (5.2m × 4.8m Raum)

---

## 🐛 Troubleshooting

### iOS: "RoomPlan module not found"

**Lösung:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npx react-native run-ios
```

### iOS: "RoomPlan not supported"

**Prüfe:**
- ✅ iOS 16+ Device
- ✅ LiDAR (iPhone 12 Pro+, iPad Pro)
- ✅ Deployment Target ≥ 16.0

**Test:**
```tsx
const { isSupported, capabilities } = useRoomScanner();
console.log('Supported:', isSupported);
console.log('Has LiDAR:', capabilities?.hasLiDAR);
```

### Android: "ARCore module not found"

**Lösung:**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### Android: Scan gibt komische Daten

**Das ist normal!** Android ist nur ein Placeholder:

```tsx
// Check ob Placeholder Mode
if (roomLayout.metadata.platform === 'android') {
    console.warn('⚠️ Android returns placeholder data!');
}
```

---

## 📝 Production Checklist

### Bevor du in Production gehst:

#### iOS:
- [ ] Getestet auf echtem LiDAR-Gerät
- [ ] Camera Permission Dialog geprüft
- [ ] Scan-Qualität validiert
- [ ] Error Handling getestet
- [ ] ✅ **Ready for Production!**

#### Android:
- [ ] ⚠️ **ARCore Implementation fehlt!**
- [ ] ⚠️ **Gibt nur Dummy-Daten zurück!**
- [ ] ⚠️ **NICHT production-ready!**
- [ ] **Nächste Schritte:**
  - ARCore Plane Detection implementieren
  - Opening Detection Algorithmus
  - Echte Room Geometry Berechnung
  - **Geschätzt: 2-3 Tage Arbeit**

---

## 🚀 Next Steps

### Für Production-Ready Android:

1. **ARCore Session Setup** (Tag 1)
   - Camera Permission Handling
   - ARCore Session initialisieren
   - Lifecycle Management

2. **Plane Detection** (Tag 1-2)
   - Vertikale Ebenen (Wände)
   - Horizontale Ebenen (Boden/Decke)
   - Ebenen kombinieren zu Room

3. **Opening Detection** (Tag 2-3)
   - Lücken zwischen Ebenen finden
   - Als Türen/Fenster klassifizieren
   - Dimensionen berechnen

4. **Testing & Refinement** (Tag 3)
   - Verschiedene Räume testen
   - Accuracy verbessern
   - Edge Cases handlen

**Oder:** Nutze nur iOS-Version und dokumentiere dass Android nicht supported ist.

---

## 💡 Alternative: Nur iOS nutzen

Falls Android ARCore zu aufwändig:

```tsx
import { Platform } from 'react-native';

if (Platform.OS === 'ios') {
    // RoomPlan nutzen
    const { startScan } = useRoomScanner();
    await startScan();
} else {
    // Alternative für Android: Manuelle Eingabe
    Alert.alert(
        'Room Scanning',
        'Automatic scanning only available on iOS. Please enter room dimensions manually.'
    );
}
```

---

## 📄 Summary

| Platform | Status | Works? | Next Steps |
|----------|--------|--------|------------|
| **iOS** | ✅ Complete | Yes! | Just integrate & test |
| **Android** | ⚠️ Placeholder | No | Implement ARCore (2-3 days) |

**Bottom Line:**
- **iOS:** ✅ Funktioniert sofort nach Setup
- **Android:** ⚠️ Braucht noch ARCore Implementation ODER manuelle Eingabe als Fallback

---

**Fragen? Schau in `REACT_NATIVE_ROOMPLAN.md` für API Docs!**
