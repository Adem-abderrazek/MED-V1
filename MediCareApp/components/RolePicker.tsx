import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface Role {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const roles: Role[] = [
  {
    id: 'patient',
    name: 'Patient',
    description: 'Gérer mes médicaments et recevoir des rappels',
    icon: 'person'
  },
  {
    id: 'tuteur',
    name: 'Tuteur',
    description: 'Suivre les traitements de mes proches',
    icon: 'heart'
  },
  {
    id: 'medecin',
    name: 'Médecin',
    description: 'Prescrire et suivre mes patients',
    icon: 'medical'
  }
];

interface RolePickerProps {
  selectedRole: string;
  onRoleSelect: (role: string) => void;
}

export default function RolePicker({ selectedRole, onRoleSelect }: RolePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const getRoleIcon = (roleId: string): keyof typeof Ionicons.glyphMap => {
    switch (roleId) {
      case 'patient':
        return 'person';
      case 'tuteur':
        return 'heart';
      case 'medecin':
        return 'medical';
      default:
        return 'person';
    }
  };

  const getSelectedRole = () => {
    return roles.find(role => role.id === selectedRole) || roles[0];
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pickerContainer}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.pickerContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={getRoleIcon(selectedRole)} 
              size={20} 
              color="rgba(255, 255, 255, 0.6)" 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.pickerText}>
              {getSelectedRole().name}
            </Text>
            <Text style={styles.pickerDescription}>
              {getSelectedRole().description}
            </Text>
          </View>
          <Ionicons 
            name="chevron-down" 
            size={20} 
            color="rgba(255, 255, 255, 0.6)" 
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir votre rôle</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
              </TouchableOpacity>
            </View>

            <View style={styles.rolesList}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleItem,
                    selectedRole === role.id && styles.selectedRoleItem
                  ]}
                  onPress={() => {
                    onRoleSelect(role.id);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.roleContent}>
                    <View style={[
                      styles.roleIconContainer,
                      selectedRole === role.id && styles.selectedRoleIconContainer
                    ]}>
                      <Ionicons 
                        name={role.icon} 
                        size={24} 
                        color={selectedRole === role.id ? "white" : "rgba(255, 255, 255, 0.6)"} 
                      />
                    </View>
                    <View style={styles.roleTextContainer}>
                      <Text style={[
                        styles.roleName,
                        selectedRole === role.id && styles.selectedRoleName
                      ]}>
                        {role.name}
                      </Text>
                      <Text style={[
                        styles.roleDescription,
                        selectedRole === role.id && styles.selectedRoleDescription
                      ]}>
                        {role.description}
                      </Text>
                    </View>
                    {selectedRole === role.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#4facfe" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
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
  textContainer: {
    flex: 1,
  },
  pickerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  pickerDescription: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 4,
  },
  rolesList: {
    padding: 20,
  },
  roleItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedRoleItem: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderColor: '#4facfe',
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedRoleIconContainer: {
    backgroundColor: '#4facfe',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  selectedRoleName: {
    color: '#4facfe',
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  selectedRoleDescription: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
