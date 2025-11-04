# Realtime Status Indicator - Technical Analysis & Implementation Guide

## Pertanyaan
**Apakah bisa dibuat indikator legend status secara realtime ketika upload berlangsung?**

Yang perhitungan jumlah images nya mengacu pada Azure Blob Storage:
- Folder **queued** - sebagai antrian
- Folder **input** - sebagai proses berlangsung
- Folder **output** - ketika file sudah berhasil di detection

**Semua harus bergerak dinamis sebagai subscriber, apakah bisa tanpa websocket?**

---

## Jawaban: YA, BISA! 🎯

Ada beberapa metode untuk implementasi realtime indicator **tanpa WebSocket**:

---

## 📊 Method 1: **HTTP Long Polling** (Recommended)
### Cara Kerja:
1. Client mengirim HTTP request ke server
2. Server **menahan** response sampai ada data baru atau timeout
3. Begitu ada update, server langsung kirim response
4. Client langsung kirim request lagi (kontinyu)

### Keunggulan:
✅ Tidak perlu WebSocket infrastructure
✅ Bekerja di semua network (termasuk strict firewall)
✅ Compatible dengan HTTP/HTTPS existing
✅ Lower server resources dibanding polling biasa

### Implementasi:
\`\`\`javascript
// ApiService.js
async startLongPolling(onStatusUpdate, intervalMs = 3000) {
  let isPolling = true;

  const poll = async () => {
    if (!isPolling) return;

    try {
      const response = await this.fetchData({
        method: 'GET',
        url: this.buildUrl('/cases/storage/status'),
        timeout: 30000, // Long timeout untuk hold connection
      });

      if (response.success && onStatusUpdate) {
        onStatusUpdate({
          queued: response.data.queued_count,
          processing: response.data.input_count,
          completed: response.data.output_count,
          timestamp: response.data.timestamp,
        });
      }

      // Immediate next poll
      setTimeout(poll, 100);
    } catch (error) {
      console.error('[Long Polling] Error:', error);
      // Retry after interval on error
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  // Return stop function
  return () => { isPolling = false; };
}
\`\`\`

### Backend Requirements:
\`\`\`python
# FastAPI / Flask example
@app.get("/api/cases/storage/status")
async def get_storage_status():
    # Check Azure Blob Storage folders
    queued = count_blobs_in_container("queued")
    input_count = count_blobs_in_container("input")
    output_count = count_blobs_in_container("output")

    return {
        "success": True,
        "data": {
            "queued_count": queued,
            "input_count": input_count,
            "output_count": output_count,
            "timestamp": datetime.now().isoformat()
        }
    }
\`\`\`

---

## 📊 Method 2: **Server-Sent Events (SSE)**
### Cara Kerja:
1. Client open HTTP connection ke SSE endpoint
2. Server push updates secara kontinyu through single connection
3. One-way communication (server → client only)

### Keunggulan:
✅ Built-in browser support (EventSource API)
✅ Automatic reconnection
✅ Lebih efficient dari polling
✅ Simpler than WebSocket

### Implementasi:
\`\`\`javascript
// ApiService.js
subscribeToStorageStatus(onStatusUpdate) {
  const url = \`https://\${this.baseUrl}\${this.basePath}/cases/storage/status/stream\`;
  const eventSource = new EventSource(url, {
    headers: {
      'Authorization': \`Bearer \${this.accessToken}\`
    }
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onStatusUpdate(data);
  };

  eventSource.onerror = (error) => {
    console.error('[SSE] Error:', error);
    eventSource.close();
  };

  // Return unsubscribe function
  return () => eventSource.close();
}
\`\`\`

### Backend Requirements:
\`\`\`python
# FastAPI SSE
from sse_starlette.sse import EventSourceResponse

@app.get("/api/cases/storage/status/stream")
async def stream_storage_status(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            # Check storage status
            status = {
                "queued": count_blobs("queued"),
                "processing": count_blobs("input"),
                "completed": count_blobs("output"),
                "timestamp": datetime.now().isoformat()
            }

            yield {
                "event": "status_update",
                "data": json.dumps(status)
            }

            await asyncio.sleep(2)  # Update every 2 seconds

    return EventSourceResponse(event_generator())
\`\`\`

---

## 📊 Method 3: **Smart HTTP Polling dengan ETag/Last-Modified**
### Cara Kerja:
1. Client polling dengan interval
2. Server return ETag atau Last-Modified header
3. Client hanya process jika ada perubahan

### Keunggulan:
✅ Paling simple untuk implement
✅ Bandwidth efficient dengan 304 Not Modified
✅ No special infrastructure needed
✅ Scalable

### Implementasi:
\`\`\`javascript
// ApiService.js
class StorageStatusPoller {
  constructor(apiService) {
    this.apiService = apiService;
    this.lastETag = null;
    this.pollingInterval = null;
  }

  start(onUpdate, intervalMs = 3000) {
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          \`https://\${this.apiService.baseUrl}\${this.apiService.basePath}/cases/storage/status\`,
          {
            headers: {
              'Authorization': \`Bearer \${this.apiService.accessToken}\`,
              'If-None-Match': this.lastETag || '',
            }
          }
        );

        if (response.status === 304) {
          // No changes, do nothing
          console.log('[Polling] No changes detected');
          return;
        }

        if (response.ok) {
          this.lastETag = response.headers.get('ETag');
          const data = await response.json();
          onUpdate(data);
        }
      } catch (error) {
        console.error('[Polling] Error:', error);
      }
    }, intervalMs);
  }

  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
\`\`\`

---

## 🎨 UI Implementation - Realtime Status Legend Component

\`\`\`javascript
// RealtimeStorageStatus.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import apiService from '../services/ApiService';

export default function RealtimeStorageStatus() {
  const [status, setStatus] = useState({
    queued: 0,
    processing: 0,
    completed: 0,
  });
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Start polling
    const stopPolling = apiService.startLongPolling((newStatus) => {
      setStatus(newStatus);

      // Pulse animation on update
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => stopPolling();
  }, []);

  return (
    <BlurView intensity={80} tint="light" style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.98)']}
        style={styles.gradient}
      >
        <Text style={styles.title}>📊 Storage Status (Live)</Text>

        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusItem, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.statusDot, { backgroundColor: '#FFB74D' }]} />
            <Text style={styles.statusLabel}>Queued</Text>
            <Text style={styles.statusValue}>{status.queued}</Text>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View style={[styles.statusItem, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.statusDot, { backgroundColor: '#1E90FF' }]} />
            <Text style={styles.statusLabel}>Processing</Text>
            <Text style={styles.statusValue}>{status.processing}</Text>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View style={[styles.statusItem, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusLabel}>Completed</Text>
            <Text style={styles.statusValue}>{status.completed}</Text>
          </Animated.View>
        </View>

        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live Updates</Text>
        </View>
      </LinearGradient>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
  },
  gradient: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0047AB',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E90FF',
  },
  divider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(30, 144, 255, 0.2)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  liveText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
  },
});
\`\`\`

---

## 🚀 Perbandingan Methods

| Method | Latency | Bandwidth | Server Load | Complexity | Scalability |
|--------|---------|-----------|-------------|------------|-------------|
| **Long Polling** | Low (instant) | Medium | Medium | Medium | Good |
| **SSE** | Very Low | Low | Low | Low | Excellent |
| **Smart Polling** | Medium (interval based) | Very Low | Low | Very Low | Excellent |
| WebSocket | Very Low | Low | High | High | Medium |

---

## 💡 Rekomendasi

Untuk use case Anda (Azure Blob Storage monitoring):

### **Best Choice: HTTP Long Polling + ETag**
Kombinasi dari Method 1 dan 3:

**Alasan:**
1. ✅ Tidak perlu WebSocket infrastructure
2. ✅ Real-time feel dengan latency rendah
3. ✅ Efficient bandwidth dengan ETag
4. ✅ Simple backend implementation
5. ✅ Works dengan existing HTTP/HTTPS setup
6. ✅ Reliable di semua network conditions

### Implementation Flow:
\`\`\`
[Mobile App]
    ↓ HTTP GET /storage/status (with ETag)
[Backend API]
    ↓ Check Azure Blob Storage
[Azure Blob Storage]
    ↓ Count files in queued/, input/, output/
[Backend API]
    ↓ Return status + new ETag
[Mobile App]
    ↓ Update UI (animate changes)
    ↓ Immediate next request (long poll)
    ↓ Loop continues...
\`\`\`

---

## 📱 Bonus: Optimasi untuk Production

### 1. **Exponential Backoff untuk Error**
\`\`\`javascript
let retryDelay = 1000;
const maxRetryDelay = 30000;

const pollWithBackoff = async () => {
  try {
    await poll();
    retryDelay = 1000; // Reset on success
  } catch (error) {
    retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
    setTimeout(pollWithBackoff, retryDelay);
  }
};
\`\`\`

### 2. **Battery Optimization**
\`\`\`javascript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      stopPolling(); // Stop saat app di background
    } else if (state === 'active') {
      startPolling(); // Resume saat app active
    }
  });

  return () => subscription.remove();
}, []);
\`\`\`

### 3. **Network-Aware Polling**
\`\`\`javascript
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  if (state.isConnected) {
    // Adjust polling interval based on connection type
    const interval = state.type === 'wifi' ? 2000 : 5000;
    startPolling(interval);
  } else {
    stopPolling();
  }
});
\`\`\`

---

## ✅ Kesimpulan

**YA, sangat bisa dibuat realtime indicator tanpa WebSocket!**

Dengan **HTTP Long Polling** atau **SSE**, Anda bisa:
- ✅ Monitor Azure Blob Storage folders secara realtime
- ✅ Update UI dinamis dengan animasi smooth
- ✅ Subscriber pattern untuk multiple listeners
- ✅ Battery dan bandwidth efficient
- ✅ Production-ready dan scalable

**Tidak perlu WebSocket sama sekali!** 🎉
