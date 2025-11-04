import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Service
 * Handles all API communication with authentication
 * Exact match with Flutter implementation (main_api.dart & helper_api.dart)
 * NO ENVIRONMENT VARIABLES - all endpoints hardcoded for APK build
 */

const DEV_BASE_URL = 'rnd-dev.bsi.co.id';
const PROD_BASE_URL = 'droneark.bsi.co.id';

export class ApiService {
  constructor(useProd = true) {
    this.baseUrl = useProd ? PROD_BASE_URL : DEV_BASE_URL;
    this.basePath = useProd ? '/api' : '/drone';
    this.accessToken = null;
    this.refreshToken = null;

    // API Endpoints - exact match with Flutter main_api.dart
    this.endpoints = {
      authLogin: '/users/user/login',
      authLogout: '/users/user/logout',
      authRefresh: '/api/users/user/login/refresh',
      caseList: '/cases/case/list',
      assignWorker: '/cases/case/assign',
      validateCase: '/cases/case/validate',
      generateReport: '/cases/case/report',
      bulkUpdate: '/cases/case/bulk_update',
      areaList: '/cases/area/list',
      worker: '/users/user/getworker',
      createWorker: '/users/user/create',
      updateWorker: '/users/user/edit',
      deleteWorker: '/users/user/delete',
      dashboardBirdDrops: '/cases/case/dashboard/bird_drops',
      dashboardData: '/cases/case/dashboard/bird_drops',
      dashboardStatus: '/cases/case/dashboard/status',
      dashboardWorker: '/cases/case/dashboard/worker',
      dashboardOverview: '/cases/case/dashboard/overview',
      dashboardBDPerBlock: '/cases/case/dashboard/bird_drops_by_block',
      mailReport: '/cases/case/mail/notifications',
      exportDashboard: '/cases/case/dashboard/export',
    };
  }

  // Initialize tokens from storage
  async init() {
    this.accessToken = await AsyncStorage.getItem('access_token');
    this.refreshToken = await AsyncStorage.getItem('refresh_token');
  }

  // Get headers with authentication
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  // Build full URL
  buildUrl(path, query = {}) {
    const protocol = 'https';
    let url = `${protocol}://${this.baseUrl}${this.basePath}${path}`;

    const queryString = Object.keys(query)
      .filter((key) => query[key] !== null && query[key] !== undefined)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');

    if (queryString) {
      url += `?${queryString}`;
    }

    return url;
  }

  // Generic fetch with error handling and token refresh
  async fetchData({ method = 'GET', url, body = null, includeAuth = true, isRetry = false }) {
    try {
      const options = {
        method,
        headers: this.getHeaders(includeAuth),
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      console.log(`[API] ${method} ${url}`);
      if (body) console.log('[API] Body:', body);

      const response = await fetch(url, options);

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('[API] JSON Parse Error:', jsonError);
        console.error('[API] Response text:', responseText.substring(0, 200));

        // If response is HTML (session expired/invalid), clear session
        if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
          console.error('[API] Received HTML response - session likely invalid');
          await this.clearSessionAndLogout();
          throw new Error('SESSION_INVALID');
        }

        throw new Error(`Invalid JSON response: ${jsonError.message}`);
      }

      // Add status_code to result (match Flutter response format)
      data.status_code = response.status;

      // Handle session expiration (419)
      if (response.status === 419) {
        console.log('[API] Session expired (419) - clearing session');
        await this.clearSessionAndLogout();
        throw new Error('SESSION_EXPIRED');
      }

      // Handle unauthorized (401) - try to refresh token
      if (response.status === 401 && !isRetry) {
        console.log('[API] Unauthorized (401), attempting token refresh...');
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.fetchData({ method, url, body, includeAuth, isRetry: true });
        }
        // If refresh failed, clear session
        console.log('[API] Token refresh failed - clearing session');
        await this.clearSessionAndLogout();
        throw new Error('SESSION_EXPIRED');
      }

      console.log('[API] Response:', data);
      return data;
    } catch (error) {
      console.error('[API] Error:', error);
      throw error;
    }
  }

  // Clear session and trigger logout
  async clearSessionAndLogout() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'drone_data', 'logged_in_time']);
      console.log('[API] Session cleared - user needs to login again');
    } catch (error) {
      console.error('[API] Error clearing session:', error);
    }
  }

  // Refresh access token - exact match with Flutter helper_api.dart
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        return false;
      }

      // Use direct URL without basePath for refresh (matches Flutter)
      const url = `https://${this.baseUrl}${this.endpoints.authRefresh}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.refreshToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.status_code === 200 && data.session_token) {
        this.accessToken = data.session_token;
        await AsyncStorage.setItem('access_token', data.session_token);
        console.log('[API] Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      return false;
    }
  }

  // Authentication APIs - exact match with Flutter main_api.dart
  async login(email, password) {
    const url = this.buildUrl(this.endpoints.authLogin);
    const data = await this.fetchData({
      method: 'POST',
      url,
      body: { email, password },
      includeAuth: false,
    });

    if (data.session_token && data.refresh_token) {
      this.accessToken = data.session_token;
      this.refreshToken = data.refresh_token;
      await AsyncStorage.setItem('access_token', data.session_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      await AsyncStorage.setItem('logged_in_time', new Date().toISOString());

      // Store full login response for accessing userId later (needed for chunked upload)
      await AsyncStorage.setItem('login_response', JSON.stringify(data));
      console.log(`[API] Login response stored, user_id: ${data.user_id}`);
    }

    return data;
  }

  async logout() {
    try {
      const sessionToken = await AsyncStorage.getItem('refresh_token');
      const url = this.buildUrl(this.endpoints.authLogout);
      await this.fetchData({
        method: 'POST',
        url,
        body: { session_token: sessionToken }
      });
    } catch (error) {
      console.error('[API] Logout error:', error);
    } finally {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'logged_in_time']);
    }
  }

  // Case Management APIs - exact match with Flutter main_api.dart
  async getCaseList({ pageSize = 10, page = 1, filterAreaCode = null } = {}) {
    await this.init(); // Ensure tokens are loaded
    const query = {
      'paging[limit]': pageSize.toString(),
      'paging[page]': page.toString(),
      'orders[area]': 'asc',
    };

    if (filterAreaCode) {
      query['filters[areaCode]'] = filterAreaCode;
    }

    const url = this.buildUrl(this.endpoints.caseList, query);
    return this.fetchData({ method: 'GET', url });
  }

  async assignWorker(caseId, workerId) {
    const url = this.buildUrl(this.endpoints.assignWorker);
    return this.fetchData({
      method: 'POST',
      url,
      body: { id: caseId, assignTo: workerId },
    });
  }

  async validateCase(caseId, statusId) {
    const url = this.buildUrl(this.endpoints.validateCase);
    return this.fetchData({
      method: 'POST',
      url,
      body: { id: caseId, statusId },
    });
  }

  async bulkAssign(workerId) {
    const url = this.buildUrl(this.endpoints.bulkUpdate);
    return this.fetchData({
      method: 'POST',
      url,
      body: { assignTo: workerId },
    });
  }

  async generateReport(areaCode = null) {
    const body = {};
    if (areaCode && areaCode !== '') {
      body.areaCode = areaCode;
    }

    const url = this.buildUrl(this.endpoints.generateReport);
    return this.fetchData({ method: 'POST', url, body });
  }

  async sendReportViaEmail(reportUrl) {
    const url = this.buildUrl(this.endpoints.mailReport);
    return this.fetchData({
      method: 'POST',
      url,
      body: { report_url: reportUrl },
    });
  }

  // Worker Management APIs - exact match with Flutter main_api.dart
  async getWorkers() {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.worker);
    return this.fetchData({ method: 'GET', url });
  }

  async createWorker(workerData) {
    const url = this.buildUrl(this.endpoints.createWorker);
    // Match Flutter format with "data" wrapper
    return this.fetchData({
      method: 'POST',
      url,
      body: { data: workerData },
    });
  }

  async updateWorker(workerId, workerData) {
    const url = this.buildUrl(`${this.endpoints.updateWorker}/${workerId}`);
    // Match Flutter format with "data" wrapper
    return this.fetchData({
      method: 'PATCH',
      url,
      body: {
        data: {
          username: workerData.username,
          fullname: workerData.fullname,
        }
      },
    });
  }

  async deleteWorker(workerId) {
    const url = this.buildUrl(`${this.endpoints.deleteWorker}/${workerId}`);
    return this.fetchData({
      method: 'DELETE',
      url,
    });
  }

  // Area APIs
  async getAreas() {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.areaList);
    return this.fetchData({ method: 'GET', url });
  }

  // Dashboard APIs - exact match with Flutter main_api.dart
  async getDashboardData(type) {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.dashboardData, { type });
    return this.fetchData({ method: 'GET', url });
  }

  async getDashboardStatus(type) {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.dashboardStatus, { type });
    return this.fetchData({ method: 'GET', url });
  }

  async getDashboardWorker(type) {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.dashboardWorker, { type });
    return this.fetchData({ method: 'GET', url });
  }

  async getDashboardOverview() {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.dashboardOverview);
    return this.fetchData({ method: 'GET', url });
  }

  async getDashboardBDPerBlock(type) {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl(this.endpoints.dashboardBDPerBlock, { type });
    return this.fetchData({ method: 'GET', url });
  }

  async exportDashboard(type) {
    const url = this.buildUrl(this.endpoints.exportDashboard);
    return this.fetchData({
      method: 'POST',
      url,
      body: { type },
    });
  }

  // Case List APIs - exact match with Flutter main_api.dart
  async getCaseList({ pageSize = 10, page = 1, filterAreaCode = null }) {
    const query = {
      'paging[limit]': pageSize.toString(),
      'paging[page]': page.toString(),
      'orders[area]': 'asc',
    };

    if (filterAreaCode) {
      query['filters[areaCode]'] = filterAreaCode;
    }

    const url = this.buildUrl(this.endpoints.caseList, query);
    return this.fetchData({ method: 'GET', url });
  }

  async assignWorker(caseId, assignTo) {
    const url = this.buildUrl(this.endpoints.assignWorker);
    return this.fetchData({
      method: 'POST',
      url,
      body: {
        id: caseId,
        assignTo: assignTo,
      },
    });
  }

  async validateCase(caseId, statusId) {
    const url = this.buildUrl(this.endpoints.validateCase);
    return this.fetchData({
      method: 'POST',
      url,
      body: {
        id: caseId,
        statusId: statusId,
      },
    });
  }

  async bulkAssign(workerId) {
    const url = this.buildUrl(this.endpoints.bulkUpdate);
    return this.fetchData({
      method: 'POST',
      url,
      body: {
        assignTo: workerId,
      },
    });
  }

  // Image Upload API
  async uploadImage(formData, onProgress) {
    await this.init();
    const url = `https://${this.baseUrl}${this.basePath}/cases/image/upload`;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

      xhr.send(formData);
    });
  }

  // Batch Upload Images
  async uploadImageBatch(images, batchSize = 5, onBatchProgress, onImageProgress) {
    const results = [];
    const batches = [];

    // Split images into batches
    for (let i = 0; i < images.length; i += batchSize) {
      batches.push(images.slice(i, i + batchSize));
    }

    console.log(`[Upload] Starting batch upload: ${images.length} images in ${batches.length} batches`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      if (onBatchProgress) {
        onBatchProgress({
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          imagesInBatch: batch.length,
        });
      }

      // Upload images in current batch concurrently
      const batchPromises = batch.map(async (image, index) => {
        try {
          const formData = new FormData();
          formData.append('file', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.fileName || `image_${Date.now()}_${index}.jpg`,
          });

          // Add metadata if available
          if (image.areaCode) {
            formData.append('area_code', image.areaCode);
          }

          const result = await this.uploadImage(formData, (progress) => {
            if (onImageProgress) {
              onImageProgress(image.id, progress, image.fileName);
            }
          });

          console.log(`[Upload] Success: ${image.fileName}`);
          return { success: true, image, result };
        } catch (error) {
          console.error(`[Upload] Error: ${image.fileName}`, error);
          return { success: false, image, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid overwhelming the server
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`[Upload] Batch upload complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      results,
      summary: {
        total: images.length,
        success: successCount,
        error: errorCount,
      },
    };
  }
}

// Singleton instance - Use PRODUCTION by default for APK build
export default new ApiService(true);
