import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

interface LanguageButtonProps {
  style?: any;
}

export default function LanguageButton({ style }: LanguageButtonProps) {
  const { currentLanguage, changeLanguage, isRTL } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, style, isRTL && styles.buttonRTL]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.flag}>{currentLang.flag}</Text>
        <Text style={styles.code}>{currentLang.code.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.8)" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  currentLanguage === lang.code && styles.languageOptionActive,
                  isRTL && styles.languageOptionRTL
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <Text
                  style={[
                    styles.optionName,
                    currentLanguage === lang.code && styles.optionNameActive
                  ]}
                >
                  {lang.name}
                </Text>
                {currentLanguage === lang.code && (
                  <Ionicons name="checkmark" size={20} color="#4facfe" />
                )}
              </TouchableOpacity>
            ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRTL: {
    flexDirection: 'row-reverse',
  },
  flag: {
    fontSize: 18,
  },
  code: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContentRTL: {
    alignItems: 'flex-end',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageOptionRTL: {
    flexDirection: 'row-reverse',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
  },
  optionFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  optionName: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

