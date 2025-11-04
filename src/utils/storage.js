// src/utils/storage.js (Used for native platforms - iOS/Android)
import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  async setItem(key, value) {
    await AsyncStorage.setItem(key, value);
  },
  async getItem(key) {
    return await AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
  },
  async clear() {
    await AsyncStorage.clear();
  },
};