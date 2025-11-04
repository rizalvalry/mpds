// src/components/SideMenu.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  UIManager,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { logout, getSession } from '../api/Auth';



if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SideMenu({ user, onNavigate, activeTab, setSession, session }) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const animWidth = useRef(new Animated.Value(220)).current;
  /*console.log(session);
  const user = session.username;*/

  const toggleCollapse = (collapseTo = !collapsed) => {
    setCollapsed(collapseTo);
    Animated.timing(animWidth, {
      toValue: collapseTo ? 60 : 220,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 30 && collapsed) toggleCollapse(false);
        if (gesture.dx < -30 && !collapsed) toggleCollapse(true);
      },
    })
  ).current;

  const menuItems = [
    { key: "placeholder", label: "Dashboard" },
    { key: "upload", label: "Upload Photos" },
    { key: "results", label: "Case List" },
    { key: "workers", label: "Workers" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderRightColor: theme.border,
          width: animWidth,
        },
      ]}
    >
      {/* ☰ Toggle button */}
      <TouchableOpacity
        style={[styles.toggle, { backgroundColor: theme.accent }]}
        onPress={() => toggleCollapse()}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleIcon, { color: theme.buttonText }]}>☰</Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.menuInner}>
          <Text style={[styles.user, { color: theme.text }]}>Hello, {user}</Text>

          {menuItems.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <View key={key} style={styles.itemWrapper}>
                {/* Indicator bar on the left */}
                <View
                  style={[
                    styles.activeIndicator,
                    {
                      backgroundColor: isActive ? theme.accent || "#007aff" : "transparent",
                      opacity: isActive ? 1 : 0.2,
                    },
                  ]}
                />

                <TouchableOpacity
                  style={[
                    styles.item,
                    {
                      backgroundColor: isActive ? theme.accent + "22" : "transparent",
                    },
                  ]}
                  onPress={() => onNavigate(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: isActive ? theme.accent || "#007aff" : theme.text,
                      fontWeight: isActive ? "700" : "400",
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={styles.itemWrapper}>
            <View style={[styles.activeIndicator, { backgroundColor: "transparent" }]} />
            <TouchableOpacity
              style={[styles.item, { backgroundColor: "#de020233" }]}
              onPress={async () => {
                        alert("Logging out...")
                        await logout(); 
                        setSession(null);         
              }}
            >
              <Text style={{ color: "#de0202e2", fontWeight: "600" }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRightWidth: 1,
    paddingTop: 12,
    position: "relative",
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginRight: 12,
    marginBottom: 16,
  },
  toggleIcon: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuInner: {
    padding: 12,
  },
  user: {
    fontWeight: "600",
    marginBottom: 12,
    fontSize: 15,
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  activeIndicator: {
    width: 5,
    height: 40,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: "transparent",
  },
  item: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
