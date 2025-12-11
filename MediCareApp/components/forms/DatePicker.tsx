import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

interface DatePickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
}

export default function DatePicker({ selectedDate, onDateChange, placeholder }: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const defaultPlaceholder = placeholder || t('auth.dateOfBirth');

  const formatDate = (date: Date) => {
    if (!date) {
      return defaultPlaceholder;
    }
    // Check if date is today (not yet selected)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      return defaultPlaceholder;
    }
    
    // Use locale based on current language, but force Western numerals
    const locale = i18n.language === 'ar' ? 'ar-TN' : i18n.language === 'fr' ? 'fr-FR' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      numberingSystem: 'latn' // Force Western/Latin numerals (1,2,3)
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowPicker(false);
    if (date) {
      onDateChange(date);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.pickerContainer}
        onPress={() => setShowPicker(true)}
      >
        <View style={styles.pickerContent}>
          <View style={styles.iconContainer}>
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color="rgba(255, 255, 255, 0.6)" 
          />
        </View>
        <Text style={[
          styles.pickerText,
          formatDate(selectedDate) === defaultPlaceholder && styles.placeholderText
        ]}>
          {formatDate(selectedDate)}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color="rgba(255, 255, 255, 0.6)" 
        />
      </View>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  pickerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
  },
  iconContainer: {
    marginRight: 12,
  },
  pickerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  placeholderText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "400",
  },
});
