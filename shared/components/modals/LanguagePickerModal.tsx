import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface LanguagePickerModalProps {
  visible: boolean;
  currentLanguage?: 'en' | 'fr' | 'ar';
  onSelect?: (language: 'en' | 'fr' | 'ar') => void;
  onLanguageChange?: (language: 'en' | 'fr' | 'ar') => void; // Alias for onSelect for compatibility
  onClose: () => void;
  theme?: 'patient' | 'doctor';
}

const languages = [
  { code: 'en' as const, name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'fr' as const, name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ar' as const, name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export default function LanguagePickerModal({
  visible,
  currentLanguage,
  onSelect,
  onLanguageChange,
  onClose,
  theme = 'patient',
}: LanguagePickerModalProps) {
  const { t, i18n } = useTranslation();
  
  // Use onLanguageChange as fallback if onSelect is not provided
  const handleSelect = onSelect || onLanguageChange;
  
  // Get the actual current language from i18n to ensure it's always in sync
  const actualCurrentLanguage = (i18n.language || currentLanguage) as 'en' | 'fr' | 'ar';
  const colors = theme === 'patient' 
    ? {
        primary: '#10B981',
        primaryLight: '#34D399',
        cardBg: ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const,
      }
    : {
        primary: '#4facfe',
        primaryLight: '#00f2fe',
        cardBg: ['rgba(79, 172, 254, 0.1)', 'rgba(0, 242, 254, 0.05)'] as const,
      };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["rgba(26, 26, 46, 0.98)", "rgba(15, 52, 96, 0.98)"]}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{t('language.select')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Language Options */}
            <View style={styles.languageList}>
              {languages.map((lang) => {
                const isSelected = lang.code === actualCurrentLanguage;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageItem,
                      isSelected && styles.languageItemSelected,
                    ]}
                    onPress={() => {
                      if (handleSelect) {
                        handleSelect(lang.code);
                      }
                      onClose();
                    }}
                  >
                    <LinearGradient
                      colors={isSelected ? [colors.primary, colors.primaryLight] : colors.cardBg}
                      style={styles.languageItemGradient}
                    >
                      <View style={styles.languageItemContent}>
                        <Text style={styles.flag}>{lang.flag}</Text>
                        <View style={styles.languageTextContainer}>
                          <Text style={styles.languageName}>{lang.nativeName}</Text>
                          <Text style={styles.languageNameSecondary}>{lang.name}</Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={24} color="white" />
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageList: {
    gap: 12,
  },
  languageItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  languageItemSelected: {
    // Additional styling for selected item if needed
  },
  languageItemGradient: {
    padding: 16,
  },
  languageItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flag: {
    fontSize: 32,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  languageNameSecondary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});


