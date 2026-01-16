import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AdherenceChartProps {
  weeklyAdherence: Array<{
    weekNumber: number;
    adherenceRate: number;
  }>;
  colors: {
    text: string;
    textSecondary: string;
    cardBg: string[];
  };
}

export default function AdherenceChart({ weeklyAdherence, colors }: AdherenceChartProps) {
  return (
    <View style={styles.weeklyAdherenceSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>4 Dernières Semaines</Text>
      <View style={[styles.weeklyChartContainer, { backgroundColor: colors.cardBg[0] }]}>
        {weeklyAdherence.map((week: any, index: number) => (
          <View key={index} style={styles.weekBar}>
            <View style={styles.weekBarContainer}>
              <View
                style={[
                  styles.weekBarFill,
                  {
                    height: `${Math.max(week.adherenceRate, 5)}%`,
                    backgroundColor:
                      week.adherenceRate >= 80
                        ? '#10B981'
                        : week.adherenceRate >= 60
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              />
            </View>
            <Text style={[styles.weekBarLabel, { color: colors.text }]}>S{week.weekNumber}</Text>
            <Text style={[styles.weekBarRate, { color: colors.textSecondary }]}>
              {week.adherenceRate}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weeklyAdherenceSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  weeklyChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  weekBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  weekBarContainer: {
    width: '80%',
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  weekBarFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 10,
  },
  weekBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekBarRate: {
    fontSize: 11,
  },
});

