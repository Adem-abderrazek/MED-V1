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
import { useLanguage } from '../contexts/LanguageContext';

interface FeedbackModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function FeedbackModal({
  visible,
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
}: FeedbackModalProps) {
  const { t } = useLanguage();
  const defaultConfirmText = confirmText || t('common.buttons.ok');
  const defaultCancelText = cancelText || t('common.buttons.cancel');
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={64} color="#10B981" />;
      case 'error':
        return <Ionicons name="close-circle" size={64} color="#EF4444" />;
      case 'confirm':
        return <Ionicons name="help-circle" size={64} color="#F59E0B" />;
      default:
        return <Ionicons name="information-circle" size={64} color="#4facfe" />;
    }
  };

  const getGradientColors = () => {
    switch (type) {
      case 'success':
        return ['#10B981', '#059669'];
      case 'error':
        return ['#EF4444', '#DC2626'];
      case 'confirm':
        return ['#F59E0B', '#D97706'];
      default:
        return ['#4facfe', '#00f2fe'];
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onCancel || onConfirm}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["rgba(26, 26, 46, 0.98)", "rgba(15, 52, 96, 0.98)"]}
            style={styles.modalContent}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {type === 'confirm' && onCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>{defaultCancelText}</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
              >
                <LinearGradient
                  colors={getGradientColors()}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>{defaultConfirmText}</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  confirmButton: {
    flex: 1,
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

