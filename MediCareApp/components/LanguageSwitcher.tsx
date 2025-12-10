import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

interface LanguageSwitcherProps {
  style?: any;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
];

export default function LanguageSwitcher({ style }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, t, isRTL } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageChange = async (langCode: string) => {
    try {
      setModalVisible(false);
      await changeLanguage(langCode);
      // Force a small delay to ensure state updates propagate
      // Language change will trigger re-render via context
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const selectedLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <>
      <View style={[styles.container, style, isRTL && styles.containerRTL]}>
        <TouchableOpacity
          style={[styles.settingItem, isRTL && styles.settingItemRTL]}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="language" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingLabel}>{t('common.labels.language')}</Text>
            <Text style={styles.settingValue}>{selectedLang.nativeName}</Text>
          </View>
          <Ionicons 
            name={isRTL ? "chevron-back" : "chevron-forward"} 
            size={20} 
            color="rgba(255, 255, 255, 0.7)" 
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContentWrapper}>
            <LinearGradient
              colors={['#1a1a2e', '#1B2E1F', '#1D3020']}
              style={[styles.modalContent, isRTL && styles.modalContentRTL]}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('common.labels.language')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

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
                    {lang.nativeName}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingItemRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalContentRTL: {
    alignItems: 'flex-end',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  languageOptionRTL: {
    flexDirection: 'row-reverse',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  optionFlag: {
    fontSize: 24,
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

