import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import DynamicHeader from '../components/shared/DynamicHeader';
import MainTabMenu from '../components/navigation/MainTabMenu';

export default function AppLayout({
  session,
  setSession,
  activeMenu,
  onChangeMenu,
  title,
  subtitle,
  children,
}) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DynamicHeader
        title={title}
        subtitle={subtitle}
        session={session}
        setSession={setSession}
      />
      <View style={styles.tabWrapper}>
        <MainTabMenu
          activeMenu={activeMenu}
          onChangeMenu={onChangeMenu}
        />
      </View>
      <View style={[styles.content, { backgroundColor: theme.backgroundSecondary || theme.background }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabWrapper: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  content: {
    flex: 1,
  },
});

