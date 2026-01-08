import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Switch,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../services/ApiService';
import * as Location from 'expo-location';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function DynamicHeader({
  title,
  subtitle,
  session,
  setSession,
}) {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherInfo, setWeatherInfo] = useState({
    location: 'Memuat lokasi...',
    temperature: null,
    condition: 'Memuat cuaca...',
  });
  const [weatherForecast, setWeatherForecast] = useState({
    morning: null,
    afternoon: null,
    evening: null,
  });
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const { isDarkMode, toggleTheme } = useTheme();

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to extract forecast for specific time period (DEPRECATED - not used anymore)
  const getForecastForPeriod = (forecastData, period) => {
    if (!forecastData || !forecastData.data || !Array.isArray(forecastData.data)) {
      console.log(`[getForecastForPeriod] No forecast data for ${period}`);
      return null;
    }

    // BMKG API structure: data is direct array of forecast items
    const dataArray = forecastData.data;
    console.log(`[getForecastForPeriod] Processing ${period}, data entries:`, dataArray.length);

    if (dataArray.length === 0) {
      console.log(`[getForecastForPeriod] Empty data array for ${period}`);
      return null;
    }

    // Get forecast based on period
    let targetHour;
    if (period === 'morning') targetHour = 8; // 08:00
    else if (period === 'afternoon') targetHour = 14; // 14:00
    else if (period === 'evening') targetHour = 20; // 20:00

    // Find closest forecast to target hour from data array
    let closestForecast = null;
    let minDiff = Infinity;

    dataArray.forEach((item, index) => {
      if (!item || !item.local_datetime) return;

      try {
        const hour = parseInt(item.local_datetime.split('T')[1].split(':')[0]);
        const diff = Math.abs(hour - targetHour);

        console.log(`[getForecastForPeriod] ${period} - Index ${index}: Hour ${hour}, Diff ${diff}, Temp ${item.t}`);

        if (diff < minDiff) {
          minDiff = diff;
          closestForecast = item;
        }
      } catch (e) {
        console.warn(`[getForecastForPeriod] Error parsing datetime at index ${index}:`, e);
      }
    });

    // Fallback to first forecast if no close match
    if (!closestForecast && dataArray.length > 0) {
      closestForecast = dataArray[0];
      console.log(`[getForecastForPeriod] Using fallback (first) for ${period}`);
    }

    if (!closestForecast) {
      console.log(`[getForecastForPeriod] No forecast found for ${period}`);
      return null;
    }

    const result = {
      time: period === 'morning' ? 'Pagi' : period === 'afternoon' ? 'Siang' : 'Sore',
      temperature: closestForecast.t,
      condition: closestForecast.weather_desc,
      humidity: closestForecast.hu,
      icon: closestForecast.image ? '🌤️' : '☀️', // Use default icons for now
    };

    console.log(`[getForecastForPeriod] ${period} result:`, result);
    return result;
  };

  useEffect(() => {
    const loadLocationAndWeather = async () => {
      try {
        setWeatherLoading(true);
        setLocationError(null);

        // Default fallback location (Jakarta)
        const defaultLocation = {
          latitude: -6.2088,
          longitude: 106.8456,
          name: 'Jakarta',
          bmkgCode: '31.71.03.1001', // Kemayoran, Jakarta Pusat
        };

        let finalLocation = defaultLocation;
        let displayLocation = 'Jakarta';

        // Try to get location permission
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();

          if (status === 'granted') {
            // Permission granted, try to get current location
            try {
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High, // Use High accuracy for better results
                timeout: 10000, // 10 second timeout
              });

              console.log('[DynamicHeader] 📍 GPS Coordinates:', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                accuracy: location.coords.accuracy,
              });

              const [place] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });

              displayLocation =
                place?.district ||
                place?.city ||
                place?.region ||
                place?.subregion ||
                'Lokasi Saat Ini';

              finalLocation = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                name: displayLocation,
                bmkgCode: '31.71.03.1001', // Still use Jakarta code for now
              };

              console.log('[DynamicHeader] ✅ Location obtained:', {
                name: displayLocation,
                lat: location.coords.latitude,
                lon: location.coords.longitude,
              });
            } catch (locationError) {
              console.warn('[DynamicHeader] ⚠️ Failed to get location, using default:', locationError.message);
              // Keep using default location
            }
          } else {
            console.log('[DynamicHeader] ℹ️ Location permission denied, using default location');
          }
        } catch (permissionError) {
          console.warn('[DynamicHeader] ⚠️ Permission request failed, using default:', permissionError.message);
          // Keep using default location
        }

        // Get realtime weather from existing API
        try {
          console.log('[DynamicHeader] 🌤️ Fetching weather for coordinates:', {
            lat: finalLocation.latitude,
            lon: finalLocation.longitude,
          });

          const weatherResponse = await apiService.getWeather(
            finalLocation.latitude,
            finalLocation.longitude
          );

          console.log('[DynamicHeader] 🌤️ Weather API Response:', weatherResponse);

          if (weatherResponse.success && weatherResponse.data) {
            const { temperature, condition, main, forecast } = weatherResponse.data;
            setWeatherInfo({
              location: displayLocation,
              temperature: Math.round(temperature),
              condition,
            });

            console.log('[DynamicHeader] ✅ Realtime weather loaded:', {
              location: displayLocation,
              lat: finalLocation.latitude,
              lon: finalLocation.longitude,
              temp: Math.round(temperature),
              condition,
              main,
              forecast,
            });

            // Helper function to get weather icon based on temperature and condition
            const getWeatherIcon = (weatherMain, temperature) => {
              console.log('[getWeatherIcon] Called with:', { weatherMain, temperature });

              // Indonesian climate rule: Temperature below 30°C = Rainy/Cloudy weather
              if (temperature < 30) {
                // Below 28°C = Rain icon (gerimis/hujan ringan)
                if (temperature < 28) {
                  console.log('[getWeatherIcon] Temperature < 28°C, returning Rain icon 🌧️');
                  return '🌧️';
                }
                // 28-29°C = Cloudy icon
                console.log('[getWeatherIcon] Temperature 28-29°C, returning Cloudy icon ☁️');
                return '☁️';
              }

              // Temperature >= 30°C, use actual weather condition from API
              console.log('[getWeatherIcon] Temperature >= 30°C, using API condition:', weatherMain);
              const mainLower = (weatherMain || '').toLowerCase();
              if (mainLower === 'rain') return '🌧️';
              if (mainLower === 'drizzle') return '🌧️';
              if (mainLower === 'thunderstorm') return '⛈️';
              if (mainLower === 'clouds') return '☁️';
              if (mainLower === 'clear') return '☀️';
              if (mainLower === 'fog' || mainLower === 'mist') return '🌫️';
              return '🌤️';
            };

            // ONLY use real forecast data from Open-Meteo API - no assumptions/fallback
            if (forecast && forecast.morning && forecast.afternoon && forecast.evening) {
              console.log('[DynamicHeader] 🌡️ Temperature-based icon calculation:', {
                morning: { temp: forecast.morning.temperature, main: forecast.morning.main },
                afternoon: { temp: forecast.afternoon.temperature, main: forecast.afternoon.main },
                evening: { temp: forecast.evening.temperature, main: forecast.evening.main },
              });

              const morningIcon = getWeatherIcon(forecast.morning.main, forecast.morning.temperature);
              const afternoonIcon = getWeatherIcon(forecast.afternoon.main, forecast.afternoon.temperature);
              const eveningIcon = getWeatherIcon(forecast.evening.main, forecast.evening.temperature);

              setWeatherForecast({
                morning: {
                  time: 'Pagi',
                  temperature: forecast.morning.temperature,
                  condition: forecast.morning.condition,
                  icon: morningIcon,
                },
                afternoon: {
                  time: 'Siang',
                  temperature: forecast.afternoon.temperature,
                  condition: forecast.afternoon.condition,
                  icon: afternoonIcon,
                },
                evening: {
                  time: 'Sore',
                  temperature: forecast.evening.temperature,
                  condition: forecast.evening.condition,
                  icon: eveningIcon,
                },
              });

              console.log('[DynamicHeader] 📊 Real 3-period forecast from Open-Meteo API:', {
                morning: { icon: morningIcon, temp: forecast.morning.temperature, main: forecast.morning.main },
                afternoon: { icon: afternoonIcon, temp: forecast.afternoon.temperature, main: forecast.afternoon.main },
                evening: { icon: eveningIcon, temp: forecast.evening.temperature, main: forecast.evening.main },
              });
            } else {
              console.warn('[DynamicHeader] ⚠️ Forecast data incomplete from API, not showing forecast badge');
            }
          } else {
            console.warn('[DynamicHeader] ⚠️ Weather API returned no data');
            setWeatherInfo({
              location: displayLocation,
              temperature: null,
              condition: 'Cuaca tidak tersedia',
            });
          }
        } catch (weatherError) {
          console.error('[DynamicHeader] ❌ Weather fetch failed:', weatherError);
          setWeatherInfo({
            location: displayLocation,
            temperature: null,
            condition: 'Cuaca tidak tersedia',
          });
        }
      } catch (error) {
        console.error('[DynamicHeader] ❌ Error in loadLocationAndWeather:', error);
        // Fallback to basic display
        setWeatherInfo({
          location: 'Jakarta',
          temperature: null,
          condition: 'Cuaca tidak tersedia',
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    loadLocationAndWeather();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await apiService.logout();
              setSession(null);
            } catch (error) {
              console.error('[DynamicHeader] Logout error:', error);
              setSession(null); // Force logout anyway
            }
          },
        },
      ]
    );
  };

  const getJakartaDate = (date) => {
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 60 * 60000);
  };

  const formatDayName = (date) => {
    const gmt7Date = getJakartaDate(date);
    try {
      const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(gmt7Date);
      return day.charAt(0).toUpperCase() + day.slice(1);
    } catch {
      const fallback = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return fallback[gmt7Date.getDay()];
    }
  };

  const formatTime = (date) => {
    const gmt7Date = getJakartaDate(date);
    try {
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(gmt7Date);
    } catch {
      const hours = String(gmt7Date.getHours()).padStart(2, '0');
      const minutes = String(gmt7Date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  };

  const dayLabel = formatDayName(currentTime);
  const timeLabel = formatTime(currentTime);
  const conditionLabel = weatherInfo.condition || '';
  const conditionEmoji = (() => {
    const condition = conditionLabel.toLowerCase();
    if (condition.includes('cerah')) return '☀️';
    if (condition.includes('hujan')) return '🌧️';
    if (condition.includes('badai')) return '⛈️';
    if (condition.includes('mendung') || condition.includes('awan')) return '⛅';
    if (condition.includes('kabut')) return '🌫️';
    return '🌦️';
  })();
  const weatherLabel = `${dayLabel}, ${timeLabel} WIB`;
  const locationLabel =
    weatherInfo.temperature != null
      ? `${weatherInfo.location} • ${weatherInfo.temperature}°C`
      : weatherInfo.location;

  return (
    <>
      <LinearGradient
        colors={['#1E9BE9', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        {/* Left Section - Title */}
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
        </View>

        {/* Right Section - Scrollable Badges + Burger Menu */}
        <View style={styles.headerRight}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesContainer}
          >
            {/* Area Code Badge */}
            {session?.area_code && session.area_code.length > 0 && (
              <View style={styles.areaBadge}>
                <Text style={styles.areaIcon}>📍</Text>
                <Text style={styles.areaText}>
                  {session.area_code.join(', ')}
                </Text>
              </View>
            )}

            {/* Location & Time Badge */}
            <View style={styles.weatherBadge}>
              {weatherLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.locationRow}>
                  <Text style={styles.weatherLocation}>{weatherInfo.location}</Text>
                  <Text style={styles.weatherSeparator}>•</Text>
                  <Text style={styles.weatherTime}>{weatherLabel}</Text>
                </View>
              )}
            </View>

            {/* 3-Period Forecast Badge */}
            {!weatherLoading && weatherForecast.morning && weatherForecast.afternoon && weatherForecast.evening && (
              <View style={styles.forecastBadge}>
                <View style={styles.forecastTimeline}>
                  {/* Morning */}
                  <View style={styles.forecastPeriod}>
                    <Text style={styles.forecastIcon}>{weatherForecast.morning.icon}</Text>
                    <Text style={styles.forecastLabel}>Pagi</Text>
                    <Text style={styles.forecastTemp}>{weatherForecast.morning.temperature}°</Text>
                  </View>

                  {/* Connector */}
                  <View style={styles.timelineConnector} />

                  {/* Afternoon */}
                  <View style={styles.forecastPeriod}>
                    <Text style={styles.forecastIcon}>{weatherForecast.afternoon.icon}</Text>
                    <Text style={styles.forecastLabel}>Siang</Text>
                    <Text style={styles.forecastTemp}>{weatherForecast.afternoon.temperature}°</Text>
                  </View>

                  {/* Connector */}
                  <View style={styles.timelineConnector} />

                  {/* Evening */}
                  <View style={styles.forecastPeriod}>
                    <Text style={styles.forecastIcon}>{weatherForecast.evening.icon}</Text>
                    <Text style={styles.forecastLabel}>Sore</Text>
                    <Text style={styles.forecastTemp}>{weatherForecast.evening.temperature}°</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Burger Menu Button - Always Visible */}
          <TouchableOpacity
            onPress={() => setShowSettingsMenu(!showSettingsMenu)}
            style={styles.burgerButton}
          >
            <Image
              source={require('../../../assets/burger-tab.png')}
              style={styles.burgerIcon}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Overlay to close menu when clicking outside */}
      {showSettingsMenu && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowSettingsMenu(false)}
        />
      )}

      {/* Settings Dropdown Menu */}
      {showSettingsMenu && (
        <View style={styles.settingsMenu}>
          <ScrollView
            style={styles.menuScrollView}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Theme Toggle */}
            <View style={styles.menuItem}>
              <Text style={styles.menuItemText}>White Mode</Text>
              <Switch
                value={!isDarkMode}
                onValueChange={(value) => {
                  toggleTheme();
                }}
                trackColor={{ false: '#D1D5DB', true: '#0EA5E9' }}
                thumbColor={'#FFFFFF'}
                ios_backgroundColor="#D1D5DB"
              />
            </View>

            {/* Drone Code Info */}
            <View style={styles.menuInfoItem}>
              <Text style={styles.droneMenuIcon}>🚁</Text>
              <Text style={styles.droneMenuText}>
                {session?.drone?.drone_code || 'Drone-001'}
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.menuDivider} />

            {/* Logout Button */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                setShowSettingsMenu(false);
                handleLogout();
              }}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: width > 768 ? 24 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: width < 768 ? 0.35 : 0.4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: width > 768 ? 32 : width > 480 ? 22 : 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: width > 768 ? 14 : 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerRight: {
    flex: width < 768 ? 0.65 : 0.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 8,
  },
  areaBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: width < 768 ? 6 : 8,
    paddingHorizontal: width < 768 ? 10 : 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: width < 768 ? 4 : 8,
  },
  areaIcon: {
    fontSize: width < 768 ? 12 : 16,
  },
  areaText: {
    color: '#FFFFFF',
    fontSize: width < 768 ? 11 : 14,
    fontWeight: '600',
  },
  weatherBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: width < 768 ? 6 : 8,
    paddingHorizontal: width < 768 ? 10 : 16,
    borderRadius: 20,
    minHeight: width < 768 ? 32 : 40,
    justifyContent: 'center',
  },
  forecastBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: width < 768 ? 6 : 8,
    paddingHorizontal: width < 768 ? 10 : 16,
    borderRadius: 20,
    minHeight: width < 768 ? 32 : 40,
    justifyContent: 'center',
  },
  weatherContainer: {
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherLocation: {
    color: '#FFFFFF',
    fontSize: width < 768 ? 9 : 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  weatherSeparator: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: width < 768 ? 8 : 10,
  },
  weatherTime: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: width < 768 ? 8 : 10,
    fontWeight: '500',
  },
  forecastTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  forecastPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width < 768 ? 2 : 3,
  },
  forecastIcon: {
    fontSize: width < 768 ? 12 : 16,
  },
  forecastLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: width < 768 ? 7 : 9,
    fontWeight: '600',
  },
  forecastTemp: {
    color: '#FFFFFF',
    fontSize: width < 768 ? 9 : 11,
    fontWeight: '700',
  },
  timelineConnector: {
    width: width < 768 ? 8 : 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: width < 768 ? 4 : 6,
  },
  fallbackWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherIcon: {
    fontSize: 16,
  },
  weatherTemp: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  burgerButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: width < 768 ? 6 : 8,
    paddingHorizontal: width < 768 ? 8 : 12,
    borderRadius: 20,
    marginLeft: 4,
  },
  burgerIcon: {
    width: width < 768 ? 20 : 24,
    height: width < 768 ? 20 : 24,
    // tintColor: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  settingsMenu: {
    position: 'absolute',
    top: 60,
    right: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    maxHeight: Dimensions.get('window').height - 100, // Prevent overflow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  menuScrollView: {
    maxHeight: Dimensions.get('window').height - 140, // Account for padding and spacing
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  menuItemSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B7280',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  menuInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  droneMenuIcon: {
    fontSize: 18,
  },
  droneMenuText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
