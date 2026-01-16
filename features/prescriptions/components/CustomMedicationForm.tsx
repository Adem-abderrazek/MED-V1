import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MedicationOption } from '../../../shared/constants/medications';

interface CustomMedicationFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (medication: MedicationOption) => void;
  initialData?: {
    name: string;
    genericName: string;
    dosage: string;
    form: string;
    description: string;
  };
}

export default function CustomMedicationForm({
  visible,
  onClose,
  onSave,
  initialData,
}: CustomMedicationFormProps) {
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    genericName: initialData?.genericName || '',
    dosage: initialData?.dosage || '',
    form: initialData?.form || 'Comprimé',
    description: initialData?.description || '',
  });

  const handleSave = () => {
    if (!formData.name.trim()) {
      return;
    }

    const customMed: MedicationOption = {
      id: 'custom-' + Date.now(),
      name: formData.name,
      genericName: formData.genericName || formData.name,
      dosage: formData.dosage,
      form: formData.form,
      description: formData.description,
    };

    onSave(customMed);
    onClose();
  };

  const formTypes = ['Comprimé', 'Gélule', 'Sirop', 'Injection', 'Gouttes'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Nouveau Médicament</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Nom du médicament *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Aspirine"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={styles.label}>Nom générique</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Acide acétylsalicylique"
              placeholderTextColor="#9CA3AF"
              value={formData.genericName}
              onChangeText={(text) => setFormData({ ...formData, genericName: text })}
            />

            <Text style={styles.label}>Dosage</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 500mg"
              placeholderTextColor="#9CA3AF"
              value={formData.dosage}
              onChangeText={(text) => setFormData({ ...formData, dosage: text })}
            />

            <Text style={styles.label}>Forme</Text>
            <View style={styles.formTypeContainer}>
              {formTypes.map((form) => (
                <TouchableOpacity
                  key={form}
                  style={[
                    styles.formTypePill,
                    formData.form === form && styles.formTypePillActive
                  ]}
                  onPress={() => setFormData({ ...formData, form })}
                >
                  <Text style={[
                    styles.formTypePillText,
                    formData.form === form && styles.formTypePillTextActive
                  ]}>
                    {form}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Description/Indication</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Douleur, fièvre, inflammation"
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.saveButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveButtonText}>Utiliser ce médicament</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  formTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTypePillActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#4facfe',
  },
  formTypePillText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  formTypePillTextActive: {
    color: '#4facfe',
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});





