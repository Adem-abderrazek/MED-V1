import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PrescriptionSchedule } from '../../../shared/types';
import { WEEK_DAYS } from '../../../shared/constants/medications';

interface ScheduleSelectorProps {
  schedules: PrescriptionSchedule[];
  onSchedulesChange: (schedules: PrescriptionSchedule[]) => void;
  repeatWeeks: string;
  onRepeatWeeksChange: (weeks: string) => void;
}

export default function ScheduleSelector({
  schedules,
  onSchedulesChange,
  repeatWeeks,
  onRepeatWeeksChange,
}: ScheduleSelectorProps) {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  const addSchedule = () => {
    onSchedulesChange([...schedules, { time: '12:00', days: [1, 2, 3, 4, 5, 6, 7] }]);
  };

  const updateScheduleTime = (index: number, time: string) => {
    const newSchedules = [...schedules];
    newSchedules[index].time = time;
    onSchedulesChange(newSchedules);
  };

  const openTimePicker = (index: number) => {
    const schedule = schedules[index];
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 8);
    date.setMinutes(minutes || 0);
    setTempTime(date);
    setEditingScheduleIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate && editingScheduleIndex !== null) {
      const nativeEvent = (event as any)?.nativeEvent;
      let selectedHours: number | undefined = typeof nativeEvent?.hour === 'number'
        ? nativeEvent.hour
        : selectedDate.getHours();
      let selectedMinutes: number | undefined = typeof nativeEvent?.minute === 'number'
        ? nativeEvent.minute
        : selectedDate.getMinutes();

      const hours = selectedHours.toString().padStart(2, '0');
      const minutes = selectedMinutes.toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateScheduleTime(editingScheduleIndex, timeString);
      
      if (Platform.OS === 'ios') {
        setTempTime(selectedDate);
      }
    }
  };

  const confirmTimePicker = () => {
    if (Platform.OS === 'ios' && editingScheduleIndex !== null && tempTime) {
      const hours = tempTime.getHours().toString().padStart(2, '0');
      const minutes = tempTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      updateScheduleTime(editingScheduleIndex, timeString);
    }
    setShowTimePicker(false);
    setEditingScheduleIndex(null);
  };

  const toggleDay = (scheduleIndex: number, dayIndex: number) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[scheduleIndex].days || [];
    const dayNum = dayIndex + 1;
    
    if (currentDays.includes(dayNum)) {
      newSchedules[scheduleIndex].days = currentDays.filter(d => d !== dayNum);
    } else {
      newSchedules[scheduleIndex].days = [...currentDays, dayNum].sort();
    }
    
    onSchedulesChange(newSchedules);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      const newSchedules = schedules.filter((_, i) => i !== index);
      onSchedulesChange(newSchedules);
    }
  };

  return (
    <View style={styles.container}>
      {schedules.map((schedule, index) => (
        <View key={index} style={styles.scheduleCard}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>Horaire {index + 1}</Text>
            {schedules.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeSchedule(index)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.timeInputContainer}>
            <Ionicons name="time-outline" size={20} color="#4facfe" />
            <Text style={styles.timeLabel}>Heure de prise:</Text>
            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => openTimePicker(index)}
            >
              <Ionicons name="time-outline" size={20} color="#4facfe" />
              <Text style={styles.timePickerText}>{schedule.time}</Text>
              <Ionicons name="chevron-down" size={18} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.daysSection}>
            <Text style={styles.daysLabel}>Jours de la semaine:</Text>
            <View style={styles.daysContainer}>
              {WEEK_DAYS.map((day, dayIndex) => {
                const isSelected = schedule.days?.includes(day.value) ?? false;
                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayButton,
                      isSelected && styles.selectedDayButton
                    ]}
                    onPress={() => toggleDay(index, dayIndex)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      isSelected && styles.selectedDayButtonText
                    ]}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addScheduleButton}
        onPress={addSchedule}
      >
        <Ionicons name="add-circle-outline" size={20} color="#10B981" />
        <Text style={styles.addScheduleText}>Ajouter un horaire</Text>
      </TouchableOpacity>

      <View style={styles.repeatWeeksContainer}>
        <Text style={styles.repeatWeeksLabel}>Répéter sur</Text>
        <TextInput
          style={styles.repeatWeeksInput}
          value={repeatWeeks}
          onChangeText={onRepeatWeeksChange}
          keyboardType="numeric"
          placeholder="1"
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
        />
        <Text style={styles.repeatWeeksLabel}>semaine(s)</Text>
      </View>

      {showTimePicker && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <View style={styles.timePickerModalOverlay}>
                <View style={styles.timePickerModalContent}>
                  <View style={styles.timePickerHeader}>
                    <Text style={styles.timePickerTitle}>Sélectionner l'heure</Text>
                    <TouchableOpacity onPress={confirmTimePicker}>
                      <Text style={styles.timePickerDoneButton}>Terminé</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor="white"
                    style={styles.timePicker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={tempTime}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  scheduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  removeButton: {
    padding: 4,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    flex: 1,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  timePickerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  daysSection: {
    marginTop: 8,
  },
  daysLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedDayButton: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  selectedDayButtonText: {
    color: 'white',
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    marginBottom: 16,
  },
  addScheduleText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  repeatWeeksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repeatWeeksLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  repeatWeeksInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  timePickerModalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  timePickerDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4facfe',
  },
  timePicker: {
    height: 200,
  },
});

