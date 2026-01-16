import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DateItem } from '../../../shared/types/patient.types';
import { COLORS } from '../../../shared/constants/colors';
import { useTranslation } from 'react-i18next';

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export default function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const { t, i18n } = useTranslation();

  const datesList = useMemo(() => {
    const dates: DateItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = -7; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = [
        t('dashboard.days.sun'),
        t('dashboard.days.mon'),
        t('dashboard.days.tue'),
        t('dashboard.days.wed'),
        t('dashboard.days.thu'),
        t('dashboard.days.fri'),
        t('dashboard.days.sat')
      ];
      const monthNames = [
        t('dashboard.months.jan'),
        t('dashboard.months.feb'),
        t('dashboard.months.mar'),
        t('dashboard.months.apr'),
        t('dashboard.months.may'),
        t('dashboard.months.jun'),
        t('dashboard.months.jul'),
        t('dashboard.months.aug'),
        t('dashboard.months.sep'),
        t('dashboard.months.oct'),
        t('dashboard.months.nov'),
        t('dashboard.months.dec')
      ];
      
      dates.push({
        date: date,
        dayName: dayNames[date.getDay()],
        dayNumber: date.getDate(),
        monthName: monthNames[date.getMonth()],
        isToday: i === 0,
      });
    }
    
    return dates;
  }, [t, i18n.language]);

  const renderDateCircle = ({ item }: { item: DateItem }) => {
    const isSelected = item.date.toDateString() === selectedDate.toDateString();
    
    return (
      <TouchableOpacity
        onPress={() => onDateSelect(item.date)}
        style={styles.dateCircleContainer}
      >
        <LinearGradient
          colors={isSelected 
            ? [COLORS.patient.primary, COLORS.patient.primaryLight] 
            : item.isToday
            ? ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.2)']
            : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
          }
          style={[
            styles.dateCircle,
            isSelected && styles.dateCircleSelected,
          ]}
        >
          <Text style={[
            styles.dayName,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.dayName}
          </Text>
          <Text style={[
            styles.dayNumber,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.dayNumber}
          </Text>
          <Text style={[
            styles.monthName,
            isSelected && styles.dateTextSelected,
          ]}>
            {item.monthName}
          </Text>
        </LinearGradient>
        {item.isToday && !isSelected && (
          <View style={styles.todayIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        key={i18n.language}
        data={datesList}
        renderItem={renderDateCircle}
        keyExtractor={(item) => item.date.toISOString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        initialScrollIndex={7}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCircleContainer: {
    position: 'relative',
  },
  dateCircle: {
    width: 70,
    height: 90,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dateCircleSelected: {
    shadowColor: COLORS.patient.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  dayName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  dayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORS.text,
    marginVertical: 2,
  },
  monthName: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  dateTextSelected: {
    color: 'white',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.patient.primary,
  },
});





