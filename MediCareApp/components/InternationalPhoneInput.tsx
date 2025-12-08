import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
} from 'libphonenumber-js';
import { getThemeColors } from '../config/theme';

// Country data with flags
const COUNTRY_DATA = [
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
];

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export interface PhoneInputValue {
  countryCode: CountryCode;
  nationalNumber: string;
  e164: string;
  isValid: boolean;
}

export interface InternationalPhoneInputProps {
  value?: string;
  onChange?: (value: PhoneInputValue) => void;
  onBlur?: () => void;
  defaultCountry?: CountryCode;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  containerStyle?: any;
  inputStyle?: any;
  theme?: 'medecin' | 'tuteur' | 'patient';
  autoFocus?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value = '',
  onChange,
  onBlur,
  defaultCountry = 'TN',
  required = false,
  disabled = false,
  placeholder,
  error,
  containerStyle,
  inputStyle,
  theme = 'medecin',
  autoFocus = false,
  accessibilityLabel = 'Phone number input',
  testID = 'international-phone-input',
}) => {
  const colors = getThemeColors(theme);
  const inputRef = useRef<TextInput>(null);
  
  // Get solid background color
  const getBackgroundColor = () => {
    if (Array.isArray(colors.background)) {
      return colors.background[0];
    }
    return colors.background || '#1a1a2e';
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRY_DATA.find(c => c.code === defaultCountry) || COUNTRY_DATA[0]
  );
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize with value prop (only once)
  useEffect(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed && parsed.country) {
          const country = COUNTRY_DATA.find(c => c.code === parsed.country);
          if (country) {
            setSelectedCountry(country);
            setPhoneNumber(parsed.nationalNumber);
          } else {
            // Extract digits only
            setPhoneNumber(value.replace(/\D/g, ''));
          }
        } else {
          setPhoneNumber(value.replace(/\D/g, ''));
        }
      } catch {
        setPhoneNumber(value.replace(/\D/g, ''));
      }
    }
  }, []); // Only run once on mount

  // Validate and call onChange only on blur or when explicitly needed
  const validateAndNotify = () => {
    if (!phoneNumber.trim()) {
      if (required) {
        setValidationError('Phone number is required');
      } else {
        setValidationError(null);
      }
      if (onChange) {
        onChange({
          countryCode: selectedCountry.code as CountryCode,
          nationalNumber: '',
          e164: '',
          isValid: false,
        });
      }
      return;
    }

    const fullNumber = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;
    
    try {
      const parsed = parsePhoneNumber(fullNumber, selectedCountry.code as CountryCode);
      const isValid = isValidPhoneNumber(fullNumber, selectedCountry.code as CountryCode);

      if (isValid) {
        setValidationError(null);
        if (onChange) {
          onChange({
            countryCode: selectedCountry.code as CountryCode,
            nationalNumber: parsed.nationalNumber,
            e164: parsed.number || fullNumber,
            isValid: true,
          });
        }
      } else {
        setValidationError(`Invalid phone number format for ${selectedCountry.name}`);
        if (onChange) {
          onChange({
            countryCode: selectedCountry.code as CountryCode,
            nationalNumber: phoneNumber.replace(/\D/g, ''),
            e164: fullNumber,
            isValid: false,
          });
        }
      }
    } catch (err) {
      setValidationError(`Invalid phone number format for ${selectedCountry.name}`);
      if (onChange) {
        onChange({
          countryCode: selectedCountry.code as CountryCode,
          nationalNumber: phoneNumber.replace(/\D/g, ''),
          e164: fullNumber,
          isValid: false,
        });
      }
    }
  };

  // Filter countries based on search
  const filteredCountries = COUNTRY_DATA.filter(country => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.dialCode.includes(query)
    );
  });

  // Handle phone number input change - just store digits
  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
    // Clear error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  // Handle country selection
  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryPickerVisible(false);
    setSearchQuery('');
    Keyboard.dismiss(); // Dismiss keyboard when closing modal
    // Clear error when country changes
    if (validationError) {
      setValidationError(null);
    }
    // Focus input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  // Get placeholder
  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    return `Enter phone number`;
  };

  // Render country picker modal
  const renderCountryPicker = () => {
    const bgColor = getBackgroundColor();
    
    return (
      <Modal
        visible={isCountryPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setIsCountryPickerVisible(false);
        }}
        accessibilityViewIsModal={true}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            Keyboard.dismiss();
            setIsCountryPickerVisible(false);
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, { backgroundColor: bgColor }]}
          >
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: bgColor }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Country</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setIsCountryPickerVisible(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search country..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    { 
                      backgroundColor: item.code === selectedCountry.code ? `${colors.primary}25` : 'transparent',
                    },
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={[styles.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.countryDialCode, { color: colors.textSecondary }]}>{item.dialCode}</Text>
                  </View>
                  {item.code === selectedCountry.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: error || validationError
              ? (typeof colors.error === 'string' ? colors.error : colors.error[0])
              : isFocused
              ? colors.primary
              : colors.border,
            backgroundColor: disabled ? `${colors.primary}05` : 'transparent',
          },
          inputStyle,
        ]}
      >
        {/* Country Selector Button */}
        <TouchableOpacity
          style={styles.countryButton}
          onPress={() => {
            if (!disabled) {
              Keyboard.dismiss(); // Dismiss keyboard before opening modal
              setTimeout(() => {
                setIsCountryPickerVisible(true);
              }, 100);
            }
          }}
          disabled={disabled}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Phone Number Input */}
        <TextInput
          ref={inputRef}
          style={[styles.phoneInput, { color: colors.text }]}
          value={phoneNumber}
          onChangeText={handlePhoneChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            validateAndNotify();
            onBlur?.();
          }}
          placeholder={getPlaceholder()}
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          editable={!disabled}
          autoFocus={autoFocus}
          accessibilityLabel={accessibilityLabel}
          testID={`${testID}-input`}
        />
      </View>

      {/* Error Message */}
      {(error || validationError) && (
        <Text 
          style={[
            styles.errorText, 
            { color: typeof colors.error === 'string' ? colors.error : colors.error[0] }
          ]} 
          testID={`${testID}-error`}
        >
          {error || validationError}
        </Text>
      )}

      {/* Country Picker Modal */}
      {renderCountryPicker()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  flag: {
    fontSize: 24,
    marginRight: 4,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: {
        paddingBottom: 0,
      },
      android: {
        paddingBottom: 0,
      },
    }),
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === 'ios' ? '85%' : '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Extra padding for iOS safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginTop: 'auto', // Push to bottom
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  countryFlag: {
    fontSize: 28,
    width: 32,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 14,
  },
});

export default InternationalPhoneInput;



