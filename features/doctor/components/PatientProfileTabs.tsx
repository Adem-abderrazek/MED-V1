import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PatientProfileTabsProps {
  selectedTab: 'medications' | 'adherence' | 'voices';
  onTabChange: (tab: 'medications' | 'adherence' | 'voices') => void;
  colors: {
    primary: string;
    text: string;
    textSecondary: string;
  };
}

export default function PatientProfileTabs({
  selectedTab,
  onTabChange,
  colors,
}: PatientProfileTabsProps) {
  return (
    <View style={[styles.tabContainer, { backgroundColor: `${colors.text}05` }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'medications' && { backgroundColor: `${colors.primary}20` },
        ]}
        onPress={() => onTabChange('medications')}
      >
        <Ionicons
          name="medical"
          size={20}
          color={selectedTab === 'medications' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            selectedTab === 'medications' && { color: colors.primary },
            { color: selectedTab === 'medications' ? colors.primary : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          Méds
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'adherence' && { backgroundColor: `${colors.primary}20` }]}
        onPress={() => onTabChange('adherence')}
      >
        <Ionicons
          name="stats-chart"
          size={20}
          color={selectedTab === 'adherence' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: selectedTab === 'adherence' ? colors.primary : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          Stats
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'voices' && { backgroundColor: `${colors.primary}20` }]}
        onPress={() => onTabChange('voices')}
      >
        <Ionicons
          name="mic"
          size={20}
          color={selectedTab === 'voices' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            { color: selectedTab === 'voices' ? colors.primary : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          Voix
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

