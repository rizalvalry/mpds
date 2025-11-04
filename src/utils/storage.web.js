// src/utils/storage.web.js (Used for web platform)
// No need to import AsyncStorage
export const storage = {
  async setItem(key, value) {
    localStorage.setItem(key, value);
  },
  async getItem(key) {
    return localStorage.getItem(key);
  },
  async removeItem(key) {
    localStorage.removeItem(key);
  },
  async clear() {
    localStorage.clear();
  },
};