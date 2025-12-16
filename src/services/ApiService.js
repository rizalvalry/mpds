import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * API Service
 * Handles all API communication with authentication
 * Exact match with Flutter implementation (main_api.dart & helper_api.dart)
 * NO ENVIRONMENT VARIABLES - all endpoints hardcoded for APK build
 */

const PROD_BASE_URL = 'droneark.bsi.co.id';

export class ApiService {
  constructor(useProd = true) {
    this.baseUrl = PROD_BASE_URL;
    this.basePath = '/api';
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
      weather: '/weather/current',
      uploadDetails: '/cases/api/UploadDetails',
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
        console.error('[API] Response status:', response.status);
        console.error('[API] Response text (first 500 chars):', responseText.substring(0, 500));

        // Non-JSON response (HTML, plain text, etc.)
        const lowerText = responseText.toLowerCase();
        const looksLikeHtml = responseText.includes('<html') || responseText.includes('<!DOCTYPE');
        const hintsSessionMessage = (lowerText.includes('invalid') && lowerText.includes('session')) ||
                                     (lowerText.includes('expired') && lowerText.includes('session')) ||
                                     lowerText.includes('unauthorized');

        // Generate user-friendly error message based on status code
        let userMessage = 'Invalid response from server';

        if (looksLikeHtml) {
          // HTML response - likely a gateway/proxy error
          if (response.status === 502) {
            userMessage = 'Bad Gateway: The server is temporarily unavailable. Please try again in a few moments.';
          } else if (response.status === 503) {
            userMessage = 'Service Unavailable: The server is under maintenance. Please try again later.';
          } else if (response.status === 504) {
            userMessage = 'Gateway Timeout: The server took too long to respond. Please check your connection.';
          } else if (response.status === 500) {
            userMessage = 'Internal Server Error: Something went wrong on the server. Please contact support.';
          } else {
            userMessage = 'Server returned HTML instead of JSON. Please check your connection and endpoint configuration.';
          }
        } else if (hintsSessionMessage) {
          userMessage = 'Session invalid or expired. Please login again.';
        } else if (responseText.length > 0) {
          userMessage = responseText.length > 200 ? `${responseText.substring(0, 200)}...` : responseText;
        }

        // Return formatted error response
        return {
          success: false,
          status_code: response.status,
          message: userMessage,
          data: null,
        };
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

      // Check if it's a network error
      if (error.message === 'Network request failed' || error.message.includes('fetch')) {
        console.error('[API] Network error detected');
        return {
          success: false,
          status_code: 0,
          message: 'Network connection failed. Please check your internet connection and try again.',
          data: null,
        };
      }

      // Check if it's a timeout error
      if (error.message && error.message.toLowerCase().includes('timeout')) {
        console.error('[API] Timeout error detected');
        return {
          success: false,
          status_code: 408,
          message: 'Request timed out. The server is taking too long to respond.',
          data: null,
        };
      }

      // For other errors, re-throw
      throw error;
    }
  }

  // Clear session and trigger logout
  async clearSessionAndLogout() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      // Clear ALL session-related keys
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'drone_data',
        'session_data',
        'logged_in_time'
      ]);
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
  async login(username, password) {
    const url = this.buildUrl(this.endpoints.authLogin);
    const data = await this.fetchData({
      method: 'POST',
      url,
      body: { username, password },
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

      // Store user_id as area_id for filtering cases (filters[areaId] in API)
      if (data.user_id) {
        await AsyncStorage.setItem('area_id', data.user_id.toString());
        console.log(`[API] Login successful - user_id: ${data.user_id} stored as area_id for filtering`);
      } else {
        console.warn(`[API] Login response missing user_id!`);
      }

      // Store upload_method and max_images_per_batch for dynamic upload configuration
      if (data.upload_method) {
        await AsyncStorage.setItem('upload_method', data.upload_method);
        console.log(`[API] Upload method: ${data.upload_method}`);
      } else {
        // Default to chunking if not specified
        await AsyncStorage.setItem('upload_method', 'chunking');
        console.log(`[API] Upload method not specified, defaulting to: chunking`);
      }

      if (data.max_images_per_batch) {
        await AsyncStorage.setItem('max_images_per_batch', data.max_images_per_batch.toString());
        console.log(`[API] Max images per batch: ${data.max_images_per_batch}`);
      } else {
        // Default to 8 if not specified
        await AsyncStorage.setItem('max_images_per_batch', '8');
        console.log(`[API] Max images per batch not specified, defaulting to: 8`);
      }
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
      // Clear ALL session-related keys including area_id, upload_method, and max_images_per_batch
      await AsyncStorage.multiRemove([
        'access_token',
        'refresh_token',
        'drone_data',
        'session_data',
        'logged_in_time',
        'login_response',
        'area_id',
        'upload_method',
        'max_images_per_batch'
      ]);
      console.log('[API] Logout complete - all session data cleared');
    }
  }

  // Case Management APIs - removed duplicate, using comprehensive version below

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

  async bulkUpdateCases(workerId, areaCodes, statusId) {
    const url = this.buildUrl(this.endpoints.bulkUpdate);
    const areaCodeString = Array.isArray(areaCodes) ? areaCodes.join(',') : areaCodes;

    console.log('[API] bulkUpdateCases - Sending:', { assignTo: workerId, areaCode: areaCodeString, statusId });

    return this.fetchData({
      method: 'POST',
      url,
      body: {
        assignTo: workerId,
        areaCode: areaCodeString,
        statusId: statusId
      },
    });
  }

  async generateReport(areaCode = null) {
    // Match Flutter implementation - only send areaCode if provided
    // Backend /cases/case/report endpoint expects ONLY areaCode (optional)
    const body = {};

    if (areaCode && areaCode !== '') {
      body.areaCode = areaCode;
    }

    console.log('[API] generateReport - Sending body:', body);
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

  async validateArea(latitude, longitude) {
    await this.init(); // Ensure tokens are loaded
    const url = this.buildUrl('/cases/area/validate', { lat: latitude, long: longitude });
    return this.fetchData({ method: 'GET', url });
  }

  /**
   * Validate area from image file (backend extracts GPS from EXIF)
   * @param {string} imageUri - Local file URI
   * @param {string} expectedAreaBlock - Expected area block code (optional)
   * @returns {Promise<Object>} Area validation result
   */
  async validateAreaFromImage(imageUri, expectedAreaBlock = null) {
    await this.init();

    // Create FormData for multipart/form-data request
    const formData = new FormData();

    // Add image file
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: type,
    });

    // Add expected area block if provided
    if (expectedAreaBlock) {
      formData.append('expectedAreaBlock', expectedAreaBlock);
    }

    const url = this.buildUrl('/cases/area/validate/image');

    // Use fetch directly for FormData
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        // Don't set Content-Type - let browser set it with boundary
        // 'Content-Type': 'multipart/form-data' is auto-added by fetch
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  // Dashboard APIs - exact match with Flutter main_api.dart
  async getDashboardData(type, startDate = null, endDate = null) {
    await this.init(); // Ensure tokens are loaded

    // For month filter, add startDate and endDate parameters
    const params = { type };
    if (type === 'month' && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const url = this.buildUrl(this.endpoints.dashboardData, params);
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

  async getWeather(latitude, longitude) {
    try {
      // Use Open-Meteo API for accurate real-time weather with hourly forecast
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,rain,weather_code&hourly=temperature_2m,weather_code&timezone=Asia/Jakarta&forecast_days=1`;

      console.log('[ApiService] 🌤️ Fetching Open-Meteo data:', {
        lat: latitude,
        lon: longitude,
        url: url,
      });

      const response = await fetch(url);
      const data = await response.json();

      console.log('[ApiService] 🌤️ Open-Meteo response:', data);

      if (response.ok && data.current) {
        // Map WMO weather codes to condition descriptions
        const getWeatherCondition = (code) => {
          if (code === 0) return { main: 'Clear', description: 'Cerah' };
          if (code === 1 || code === 2) return { main: 'Clouds', description: 'Berawan Sebagian' };
          if (code === 3) return { main: 'Clouds', description: 'Berawan' };
          if (code === 45 || code === 48) return { main: 'Fog', description: 'Berkabut' };
          if (code === 51 || code === 53 || code === 55) return { main: 'Drizzle', description: 'Gerimis' };
          if (code === 61 || code === 63 || code === 65) return { main: 'Rain', description: 'Hujan' };
          if (code === 71 || code === 73 || code === 75) return { main: 'Snow', description: 'Salju' };
          if (code === 80 || code === 81 || code === 82) return { main: 'Rain', description: 'Hujan Deras' };
          if (code === 95 || code === 96 || code === 99) return { main: 'Thunderstorm', description: 'Petir' };
          return { main: 'Unknown', description: 'Tidak Diketahui' };
        };

        const currentCondition = getWeatherCondition(data.current.weather_code);

        // Extract forecast for 3 periods based on Indonesian time division:
        // Pagi: 00:00 - 10:00 (representative hour: 08:00)
        // Siang: 10:00 - 15:00 (representative hour: 12:00)
        // Sore: 15:00 - 18:00 (representative hour: 16:00)
        const hourlyTime = data.hourly?.time || [];
        const hourlyTemp = data.hourly?.temperature_2m || [];
        const hourlyCode = data.hourly?.weather_code || [];

        const getForecastForHour = (targetHour) => {
          const today = new Date();
          const targetTime = new Date(today);
          targetTime.setHours(targetHour, 0, 0, 0);

          // Find closest hour in forecast data
          const targetISO = targetTime.toISOString().split('T')[0] + `T${targetHour.toString().padStart(2, '0')}:00`;
          const index = hourlyTime.findIndex(t => t.startsWith(targetISO.substring(0, 13)));

          if (index !== -1) {
            const temp = Math.round(hourlyTemp[index]);
            let condition = getWeatherCondition(hourlyCode[index]);

            // Override: if temperature < 30°C, force cloudy/rainy weather
            if (temp < 30) {
              if (temp < 25) {
                condition = { main: 'Rain', description: 'Hujan' };
              } else {
                condition = { main: 'Clouds', description: 'Berawan' };
              }
            }

            return {
              temperature: temp,
              weatherCode: hourlyCode[index],
              condition: condition,
            };
          }
          return null;
        };

        const morning = getForecastForHour(8);   // 08:00 - Pagi (00:00-10:00)
        const afternoon = getForecastForHour(12); // 12:00 - Siang (10:00-15:00)
        const evening = getForecastForHour(16);   // 16:00 - Sore (15:00-18:00)

        // Apply temperature-based weather override for current weather too
        let finalCurrentCondition = currentCondition;
        const currentTemp = data.current.temperature_2m;
        if (currentTemp < 30) {
          if (currentTemp < 25) {
            finalCurrentCondition = { main: 'Rain', description: 'Hujan' };
          } else {
            finalCurrentCondition = { main: 'Clouds', description: 'Berawan' };
          }
        }

        return {
          success: true,
          data: {
            temperature: currentTemp,
            condition: finalCurrentCondition.description,
            main: finalCurrentCondition.main,
            humidity: data.current.relative_humidity_2m,
            rain: data.current.rain,
            weatherCode: data.current.weather_code,
            // 3-period forecast - only from API, no assumptions
            forecast: {
              morning: morning ? {
                temperature: morning.temperature,
                condition: morning.condition.description,
                main: morning.condition.main,
                weatherCode: morning.weatherCode,
              } : null,
              afternoon: afternoon ? {
                temperature: afternoon.temperature,
                condition: afternoon.condition.description,
                main: afternoon.condition.main,
                weatherCode: afternoon.weatherCode,
              } : null,
              evening: evening ? {
                temperature: evening.temperature,
                condition: evening.condition.description,
                main: evening.condition.main,
                weatherCode: evening.weatherCode,
              } : null,
            },
          },
        };
      } else {
        console.error('[ApiService] ❌ Open-Meteo error:', data);
        return {
          success: false,
          error: data.reason || 'Failed to fetch weather data',
        };
      }
    } catch (error) {
      console.error('[ApiService] ❌ Weather API error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Case List APIs - exact match with Flutter main_api.dart
  async getCaseList({
    pageSize = 100,
    page = 1,
    filterAreaCode = null,
    filterIsConfirmed = null,
    filterStatusIds = null,
    adminAreaId = null,
  } = {}) {
    await this.init(); // Ensure tokens are loaded

    // Get today's date in YYYY-MM-DD format for filtering
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // Format: 2025-11-21

    const query = {
      'paging[limit]': pageSize.toString(),
      'paging[page]': page.toString(),
      'orders[area]': 'desc', // Order by area descending
      'orders[date]': 'desc', // Order by date descending (newest first)
      'filters[date]': todayStr, // Filter only today's cases
    };

    // CRITICAL: filters[areaId] MUST ALWAYS be present (from user_id at login)
    // This is the user's ID that backend uses to get accessible area_codes from users table
    const areaId = await AsyncStorage.getItem('area_id');
    if (adminAreaId) {
      // Use explicit admin area ID if provided
      query['filters[areaId]'] = adminAreaId.toString();
      console.log(`[API] getCaseList: Using explicit adminAreaId: ${adminAreaId}`);
    } else if (areaId) {
      // Use user_id from login as areaId (this is ALWAYS required)
      query['filters[areaId]'] = areaId;
      console.log(`[API] getCaseList: Using user_id as areaId from session: ${areaId}`);
    } else {
      console.error(`[API] getCaseList: ERROR - No area_id found in session! User must login again.`);
    }

    // Add specific area code filter if provided (for filtering to specific area like "L")
    // This is OPTIONAL and works together with filters[areaId]
    if (filterAreaCode) {
      query['filters[areaCode]'] = filterAreaCode;
      console.log(`[API] getCaseList: Filtering by specific areaCode: ${filterAreaCode}`);
    } else {
      console.log(`[API] getCaseList: Showing all areas accessible by user (no specific areaCode filter)`);
    }

    // Add isConfirmed filter if provided (true/false)
    if (filterIsConfirmed !== null && filterIsConfirmed !== undefined) {
      query['filters[isConfirmed]'] = filterIsConfirmed.toString();
    }

    // Add statusIds filter if provided (comma-separated IDs or single ID)
    if (filterStatusIds) {
      query['filters[statusIds]'] = filterStatusIds.toString();
    }

    const url = this.buildUrl(this.endpoints.caseList, query);
    console.log('[API] getCaseList - Full URL:', url);
    console.log('[API] getCaseList - All Filters:', {
      date: todayStr, // Today's date filter
      areaId: query['filters[areaId]'] || 'MISSING!',
      areaCode: filterAreaCode || 'all areas',
      isConfirmed: filterIsConfirmed !== null ? filterIsConfirmed : 'none',
      statusIds: filterStatusIds || 'none',
      orders: 'area=desc, date=desc',
    });

    const response = await this.fetchData({ method: 'GET', url });

    console.log('[API] getCaseList - Response success:', response.success);
    console.log('[API] getCaseList - Data count:', response.data?.length || 0);
    console.log('[API] getCaseList - Pagination:', response.pagination);

    return response;
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

  /**
   * GET Upload Details by date
   * @param {string} createdAt - Date in YYYY-MM-DD format
   * @returns {Promise<Object>} Upload details response
   */
  async getUploadDetails(createdAt) {
    const url = `https://${this.baseUrl}/services${this.endpoints.uploadDetails}?createdAt=${createdAt}`;

    console.log(`[API] GET ${url}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();
      console.log(`[API] Response:`, data);

      if (data.success) {
        return {
          success: true,
          data: data.data || [],
          message: data.message,
        };
      } else {
        return {
          success: false,
          data: [],
          message: data.message || 'Failed to fetch upload details',
        };
      }
    } catch (error) {
      console.error(`[API] GET Upload Details error:`, error);
      return {
        success: false,
        data: [],
        message: error.message,
      };
    }
  }

  /**
   * POST Upload Details - Start upload session
   * @param {Object} uploadData - Upload session data
   * @param {string} uploadData.operator - Operator name (drone_code)
   * @param {string} uploadData.status - Upload status ('active')
   * @param {number} uploadData.startUploads - Total files to upload
   * @param {number} uploadData.endUploads - Files completed (0 at start)
   * @param {Array<string>} uploadData.areaHandle - Area codes array
   * @returns {Promise<Object>} Upload details response
   */
  async createUploadDetails(uploadData) {
    const url = `https://${this.baseUrl}/services${this.endpoints.uploadDetails}`;

    console.log(`[API] POST ${url}`);
    console.log(`[API] Payload:`, uploadData);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(uploadData),
      });

      const data = await response.json();
      console.log(`[API] Response:`, data);

      if (response.ok && data.success) {
        return {
          success: true,
          data: data.data || {},
          message: data.message || 'Upload session created successfully',
        };
      } else {
        return {
          success: false,
          data: null,
          message: data.message || 'Failed to create upload session',
        };
      }
    } catch (error) {
      console.error(`[API] POST Upload Details error:`, error);
      return {
        success: false,
        data: null,
        message: error.message,
      };
    }
  }
}

// Singleton instance - production environment
export default new ApiService(true);
