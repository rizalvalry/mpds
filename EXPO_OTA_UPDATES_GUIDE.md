# Expo OTA Updates Guide - Panduan Update Aplikasi Tanpa Install Ulang

## Konsep Expo Updates (OTA - Over-The-Air)

Expo Updates memungkinkan Anda:
- Build APK sekali saja
- Install APK ke semua devices
- Push update JavaScript/UI tanpa rebuild APK
- Users auto-download update saat buka app

## Batasan Expo Updates

### ✅ Yang BISA di-update via OTA:
- JavaScript code (logic, functions)
- React Native UI components
- Assets (images, fonts) - dengan syarat tertentu
- Configuration (app.json) - beberapa field saja

### ❌ Yang TIDAK BISA di-update via OTA (butuh rebuild APK):
- Native modules baru (install package native)
- Perubahan permissions (AndroidManifest.xml)
- Perubahan app version/build number
- Perubahan package name
- Upgrade Expo SDK version

## Setup Langkah-demi-Langkah

### Step 1: Pastikan expo-updates sudah terinstall

✅ Sudah dilakukan! Package `expo-updates` sudah terinstall.

### Step 2: Configure app.json untuk Updates

Edit `app.json` dan tambahkan konfigurasi updates:

```json
{
  "expo": {
    "name": "DroneArk Mobile",
    "slug": "droneark-mobile",
    "version": "1.0.0",
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/[project-id]"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "android": {
      "package": "com.droneark.mobile",
      "versionCode": 1
    }
  }
}
```

**Penjelasan:**
- `enabled: true` - Aktifkan OTA updates
- `checkAutomatically: "ON_LOAD"` - Check update setiap app dibuka
- `runtimeVersion` - Menentukan compatibility update dengan APK

### Step 3: Initialize EAS Project

```bash
cd d:/MPDS/mobile_project/frontend.appdrone-expo
eas init --id [project-id]
```

Jika belum punya project ID, buat dengan:
```bash
eas build:configure
```

### Step 4: Build APK Pertama Kali dengan EAS

```bash
# Build APK untuk production
eas build --platform android --profile production

# Atau build APK untuk preview/testing
eas build --platform android --profile preview
```

**File `eas.json` akan dibuat otomatis:**
```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "distribution": "internal"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Step 5: Download dan Install APK ke Devices

1. Setelah build selesai, EAS akan memberikan link download APK
2. Download APK dari link tersebut
3. Share APK file via:
   - Google Drive / Dropbox
   - WhatsApp / Telegram
   - USB transfer
4. Install APK di semua devices

**PENTING:** APK ini akan support OTA updates!

### Step 6: Push Update via OTA (Tanpa Rebuild APK)

Setelah Anda ubah code JavaScript/UI, push update dengan:

```bash
# Publish update ke EAS
eas update --branch production --message "Fixed bird drops chart"

# Atau untuk preview channel
eas update --branch preview --message "Testing new features"
```

**Cara kerja:**
1. Command ini upload JavaScript bundle ke Expo servers
2. Ketika user buka app, expo-updates akan check update
3. Download update baru di background
4. Restart app → update langsung aktif!

### Step 7: Monitor Updates

```bash
# Lihat daftar updates
eas update:list

# Lihat detail update tertentu
eas update:view [update-id]

# Rollback ke update sebelumnya
eas update:rollback --branch production
```

## Workflow Development Sehari-hari

### Skenario 1: Update UI/Logic (Tanpa Native Changes)

```bash
# 1. Edit code (misal: fix dashboard chart)
# 2. Test di development
npm start

# 3. Jika sudah OK, push update
eas update --branch production --message "Fix dashboard bird drops chart"

# 4. User akan auto-download update saat buka app
```

### Skenario 2: Install Package Baru (Butuh Rebuild)

```bash
# 1. Install package native (misal: react-native-maps)
npx expo install react-native-maps

# 2. Rebuild APK
eas build --platform android --profile production

# 3. User harus install APK baru
```

## Update Channels (Branches)

Gunakan branches untuk manage multiple environments:

```bash
# Production updates (untuk user production)
eas update --branch production --message "Stable release"

# Staging updates (untuk internal testing)
eas update --branch staging --message "Testing features"

# Development updates (untuk development team)
eas update --branch development --message "WIP features"
```

Configure di `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[project-id]"
    },
    "extra": {
      "eas": {
        "projectId": "[project-id]"
      }
    }
  }
}
```

## Runtime Version Management

Runtime version menentukan compatibility antara native code dan JavaScript updates.

### Policy: appVersion (Recommended)

```json
{
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

- Runtime version = app version (1.0.0)
- Update hanya kompatibel dengan APK yang sama version
- Safe, tapi kurang flexible

### Policy: nativeVersion

```json
{
  "runtimeVersion": {
    "policy": "nativeVersion"
  }
}
```

- Runtime version = native build number
- Lebih granular control

### Custom Runtime Version

```json
{
  "runtimeVersion": "1.0.0"
}
```

## Monitoring Update Status di App

Tambahkan code untuk monitor update status:

```javascript
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

export default function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateAvailable(true);
          // Download update
          await Updates.fetchUpdateAsync();
          // Reload app with new update
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    }

    checkForUpdates();
  }, []);

  return (
    // Your app
  );
}
```

## Best Practices

### 1. Always Test Updates Before Production

```bash
# Build preview APK
eas build --platform android --profile preview

# Test update di preview branch
eas update --branch preview --message "Testing fix"

# Jika OK, push ke production
eas update --branch production --message "Stable fix"
```

### 2. Use Meaningful Update Messages

```bash
# ✅ GOOD
eas update --branch production --message "Fix: Bird drops chart showing 0 for today filter"

# ❌ BAD
eas update --branch production --message "update"
```

### 3. Monitor Update Adoption

Check berapa user yang sudah dapat update:
```bash
eas update:list --branch production
```

### 4. Rollback Jika Ada Masalah

```bash
# Rollback ke update sebelumnya
eas update:rollback --branch production
```

## Troubleshooting

### Update tidak terdownload

**Penyebab:**
- User tidak online saat buka app
- `checkAutomatically` diset ke `ON_ERROR_RECOVERY`
- Runtime version mismatch

**Solusi:**
```json
{
  "updates": {
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0
  }
}
```

### Error: Runtime version mismatch

**Penyebab:** APK di device punya runtime version berbeda dengan update

**Solusi:** Rebuild APK dengan runtime version yang sama

### Update terlalu lambat

**Penyebab:** Update size besar (banyak assets)

**Solusi:**
- Optimize images (compress, use WebP)
- Lazy load assets
- Split updates by feature

## Summary Commands Cheat Sheet

```bash
# Setup
eas init
eas build:configure

# Build APK pertama kali
eas build --platform android --profile production

# Push update OTA (setelah ubah code)
eas update --branch production --message "Your update message"

# Monitor updates
eas update:list
eas update:view [update-id]

# Rollback
eas update:rollback --branch production

# Check EAS status
eas whoami
eas build:list
```

## Kesimpulan

**Ya, Expo Updates memungkinkan OTA updates seperti yang Anda inginkan!**

Workflow:
1. Build APK sekali → Install ke semua devices
2. Update JavaScript/UI → Push via `eas update`
3. Users auto-download update → Tanpa install ulang APK

Batasan:
- Hanya untuk JavaScript/UI updates
- Native changes tetap butuh rebuild APK
- Perlu account Expo (gratis untuk basic usage)

## Next Steps untuk Project Anda

1. ✅ Install expo-updates (DONE)
2. Configure app.json dengan updates config
3. Run `eas build:configure` untuk setup EAS
4. Build APK pertama: `eas build --platform android`
5. Install APK ke test devices
6. Test push update: `eas update --branch production`

---

**Need help?**
- Expo Updates Docs: https://docs.expo.dev/versions/latest/sdk/updates/
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- EAS Update Docs: https://docs.expo.dev/eas-update/introduction/
