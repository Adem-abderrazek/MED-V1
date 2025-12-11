import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  primaryButton?: {
    text: string;
    onPress: () => void;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
}

export default function CustomModal({
  visible,
  title,
  message,
  type,
  onClose,
  primaryButton,
  secondaryButton,
}: ModalProps) {
  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          colors: ['#10B981', '#059669'],
          iconColor: '#10B981',
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          colors: ['#EF4444', '#DC2626'],
          iconColor: '#EF4444',
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          colors: ['#F59E0B', '#D97706'],
          iconColor: '#F59E0B',
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          colors: ['#3B82F6', '#2563EB'],
          iconColor: '#3B82F6',
        };
      default:
        return {
          icon: 'information-circle' as const,
          colors: ['#3B82F6', '#2563EB'],
          iconColor: '#3B82F6',
        };
    }
  };

  const { icon, colors, iconColor } = getIconAndColors();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={32} color={iconColor} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={styles.message}>{message}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {secondaryButton && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={secondaryButton.onPress}
                >
                  <Text style={styles.secondaryButtonText}>{secondaryButton.text}</Text>
                </TouchableOpacity>
              )}
              
              {primaryButton ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={primaryButton.onPress}
                >
                  <LinearGradient
                    colors={colors}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>{primaryButton.text}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onClose}
                >
                  <LinearGradient
                    colors={colors}
                    style={styles.primaryButtonGradient}
                  >
                    <Text style={styles.primaryButtonText}>OK</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
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
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalGradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});
