# Monitoring - Mock Data Configuration

## 📋 Ringkasan

Menu **Monitoring** sekarang menggunakan **mock data** secara default untuk menghindari error 403 (Authentication Failed) dari Azure Blob Storage. Mock data menyediakan pengalaman yang realistic tanpa memerlukan konfigurasi Azure credentials yang kompleks.

## ⚠️ Mengapa Menggunakan Mock Data?

### Error Azure Blob Storage 403
```
ERROR  [AzureBlob] Error listing blobs in processed/20251103/: [Error: Failed to list blobs: 403]
<Error><Code>AuthenticationFailed</Code><Message>...</Message></Error>
```

**Penyebab**:
1. **SAS Token Invalid** - Token yang di-generate tidak sesuai dengan format yang diharapkan Azure
2. **Storage Account Key Incorrect** - Key yang digunakan mungkin expired atau salah
3. **Permissions Insufficient** - Token tidak memiliki permission `read` dan `list`
4. **Clock Skew** - Waktu sistem tidak sync dengan Azure servers
5. **Production Storage** - Akses ke production storage memerlukan security yang ketat

### Keuntungan Mock Data
✅ **Tidak ada dependency ke Azure** - Aplikasi berjalan offline  
✅ **Realistic scenarios** - 5 skenario berbeda yang mensimulasikan kondisi real  
✅ **Rotating data** - Data berubah setiap menit untuk simulasi real-time  
✅ **Zero errors** - Tidak ada authentication errors  
✅ **Fast loading** - Tidak perlu network calls  
✅ **Development friendly** - Developer tidak perlu Azure credentials  

## 🎯 Mock Data Scenarios

Monitoring menggunakan **5 skenario berbeda** yang rotate setiap 1 menit:

### Scenario 1: Active Processing ⚙️
```javascript
{
  input: 45,
  queued: 28,
  processed: 156,
  detected: 142,
  undetected: 14
}
```
- **Status**: Processing in Progress
- **Use Case**: Normal workload, files being processed actively

### Scenario 2: Almost Complete 🔄
```javascript
{
  input: 12,
  queued: 8,
  processed: 234,
  detected: 215,
  undetected: 19
}
```
- **Status**: Processing in Progress
- **Use Case**: Tail end of processing, most files done

### Scenario 3: Idle State 💤
```javascript
{
  input: 0,
  queued: 0,
  processed: 189,
  detected: 175,
  undetected: 14
}
```
- **Status**: System Idle
- **Use Case**: All processing complete, no new files

### Scenario 4: Heavy Load 📈
```javascript
{
  input: 128,
  queued: 96,
  processed: 89,
  detected: 78,
  undetected: 11
}
```
- **Status**: Processing in Progress
- **Use Case**: Large batch upload, high queue

### Scenario 5: Low Activity 📉
```javascript
{
  input: 5,
  queued: 3,
  processed: 67,
  detected: 61,
  undetected: 6
}
```
- **Status**: Processing in Progress
- **Use Case**: Light workload, minimal activity

## 🔧 Cara Mengaktifkan Real Azure Data

### Step 1: Verifikasi Azure Credentials

Edit file: `src/services/AzureBlobService.js`

```javascript
constructor() {
  // Pastikan credentials benar
  this.storageAccountName = 'azmaisap100';
  this.storageAccountKey = 'YOUR_CORRECT_STORAGE_KEY_HERE';
  this.containerName = 'imagedetection';
}
```

### Step 2: Test Azure Connection

Buat test script untuk verify credentials:

```javascript
// test-azure.js
import azureBlobService from './src/services/AzureBlobService';

async function testAzureConnection() {
  try {
    const stats = await azureBlobService.getAllStats();
    console.log('✅ Azure connection successful:', stats);
  } catch (error) {
    console.error('❌ Azure connection failed:', error);
  }
}

testAzureConnection();
```

### Step 3: Update MonitoringMockup.js

Edit file: `src/screens/MonitoringMockup.js`

```javascript
// Line 9: Change dari true ke false
const USE_MOCK_DATA = false; // Set true untuk mock data
```

### Step 4: Restart Application

```bash
npm start
# Clear cache jika perlu
npm start -- --reset-cache
```

### Step 5: Verify Real Data

Buka menu Monitoring dan verifikasi:
- ❌ **Mock Data Notice** tidak muncul
- ✅ **Real-time Monitoring Analytics** dengan icon ☁️
- ✅ Data berubah sesuai dengan Azure Blob Storage actual
- ✅ No authentication errors

## 🔍 Troubleshooting Azure Authentication

### Error: 403 Forbidden

**Symptom**:
```
Failed to list blobs: 403
AuthenticationFailed
```

**Solutions**:

#### 1. Verify Storage Account Key
- Login ke [Azure Portal](https://portal.azure.com)
- Navigate ke Storage Account `azmaisap100`
- Settings → Access Keys
- Copy primary atau secondary key
- Update di `AzureBlobService.js`

#### 2. Check SAS Token Permissions
File: `src/services/AzureBlobService.js`, line 50

```javascript
generateSasToken(permissions = 'rl', expiryMinutes = 60) {
  // Ensure 'rl' = read + list permissions
}
```

#### 3. Fix Clock Skew
```javascript
// Increase clock skew tolerance
const start = new Date(now.getTime() - 10 * 60000); // 10 minutes
```

#### 4. Update API Version
```javascript
// Try newer API version
'sv=2023-01-03' // instead of '2021-06-08'
```

### Error: Container Not Found

**Symptom**:
```
The specified container does not exist
```

**Solution**:
Verify container name di Azure Portal:
```javascript
this.containerName = 'imagedetection'; // Must match exactly
```

### Error: Invalid Storage Account

**Symptom**:
```
The specified account does not exist
```

**Solution**:
Verify storage account name:
```javascript
this.storageAccountName = 'azmaisap100'; // Must match exactly
```

## 📊 Mock Data Implementation Details

### How It Works

#### 1. Scenario Rotation
```javascript
// Changes every 60 seconds
const scenarioIndex = Math.floor(Date.now() / 60000) % scenarios.length;
```

#### 2. Network Simulation
```javascript
// Simulate 500ms network delay
await new Promise(resolve => setTimeout(resolve, 500));
```

#### 3. Data Structure
```javascript
{
  input: number,        // Files in input folder
  queued: number,       // Files in queue
  processed: number,    // Files processed today
  detected: number,     // Files with bird drops
  undetected: number,   // Files without bird drops
  total: number,        // Total files (calculated)
  timestamp: string     // ISO timestamp
}
```

### Customizing Mock Data

Edit scenarios di `MonitoringMockup.js`:

```javascript
const scenarios = [
  // Add your custom scenario
  { 
    input: 50, 
    queued: 30, 
    processed: 200, 
    detected: 180, 
    undetected: 20 
  },
  // ... more scenarios
];
```

### Random vs Rotating

**Current**: Rotating (predictable)
```javascript
const scenarioIndex = Math.floor(Date.now() / 60000) % scenarios.length;
```

**Alternative**: Random (unpredictable)
```javascript
const scenarioIndex = Math.floor(Math.random() * scenarios.length);
```

## 🎨 Visual Indicators

### Demo Mode Notice (Yellow Banner)
- **Icon**: ⚠️
- **Background**: `#FEF3C7` (Yellow)
- **Border**: 4px left, `#F59E0B` (Orange)
- **Text**: "Demo Mode - Using Mock Data"

### Monitor Card Icon Change
- **Mock Data**: 📊 (Chart icon), Orange background
- **Real Data**: ☁️ (Cloud icon), Blue background

### Status Banner
- **Idle**: 💤 Gray
- **Processing**: ⚙️ Yellow
- **Complete**: ✅ Green

## 📝 Configuration File

Create `.env` untuk easy toggle:

```bash
# .env
USE_MOCK_MONITORING_DATA=true
AZURE_STORAGE_ACCOUNT=azmaisap100
AZURE_STORAGE_KEY=your_key_here
AZURE_CONTAINER_NAME=imagedetection
```

Then update `MonitoringMockup.js`:

```javascript
import { USE_MOCK_MONITORING_DATA } from '@env';

const USE_MOCK_DATA = USE_MOCK_MONITORING_DATA === 'true';
```

## 🚀 Future Enhancements

### 1. API Endpoint Alternative
Instead of direct Azure access, create backend API:

```javascript
// Backend API endpoint
GET /api/monitoring/stats
Response: {
  input: number,
  queued: number,
  processed: number,
  detected: number,
  undetected: number
}
```

Benefits:
- ✅ No client-side Azure credentials
- ✅ Better security
- ✅ Easier authentication
- ✅ Can add caching

### 2. Hybrid Mode
Use mock data as fallback:

```javascript
const loadStats = async () => {
  try {
    // Try real data first
    return await azureBlobService.getAllStats();
  } catch (error) {
    // Fallback to mock data
    console.warn('Azure failed, using mock data');
    return generateMockStats();
  }
};
```

### 3. Real-time Updates
Use WebSocket or Server-Sent Events:

```javascript
// Connect to real-time stream
const ws = new WebSocket('wss://api.example.com/monitoring');
ws.onmessage = (event) => {
  const stats = JSON.parse(event.data);
  setStats(stats);
};
```

## 📖 Quick Reference

| Feature | Mock Data | Real Azure Data |
|---------|-----------|-----------------|
| **Setup Required** | None | Azure credentials |
| **Authentication** | None | SAS Token |
| **Network Calls** | Simulated | Real |
| **Data Accuracy** | Simulated | Real-time |
| **Offline Support** | ✅ Yes | ❌ No |
| **Development** | ✅ Easy | ⚠️ Complex |
| **Production** | ⚠️ Demo only | ✅ Required |

## ✅ Checklist: Switching to Real Data

- [ ] Verify Azure Storage Account name
- [ ] Get correct Storage Account Key from Azure Portal
- [ ] Test connection with test script
- [ ] Set `USE_MOCK_DATA = false`
- [ ] Restart application
- [ ] Verify no 403 errors in console
- [ ] Check data updates match Azure Blob Storage
- [ ] Remove mock data notice from UI
- [ ] Document Azure credentials securely
- [ ] Add error handling for network failures

---

**Last Updated**: November 3, 2025  
**Version**: 2.0.0 (Mock Data)  
**Status**: ✅ Working with Mock Data


