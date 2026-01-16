import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../../config/theme';
import { usePatientProfile } from '../../features/doctor/hooks/usePatientProfile';
import { useAuthToken } from '../../shared/hooks/useAuthToken';
import PatientInfoCard from '../../features/doctor/components/PatientInfoCard';
import PatientProfileTabs from '../../features/doctor/components/PatientProfileTabs';
import ProfileMedicationCard from '../../features/doctor/components/ProfileMedicationCard';
import AdherenceStatsSection from '../../features/doctor/components/AdherenceStatsSection';
import VoiceMessageCard from '../../features/doctor/components/VoiceMessageCard';
import AddPrescriptionModal from '../../shared/components/modals/AddPrescriptionModal';
import FeedbackModal from '../../shared/components/modals/FeedbackModal';
import VoiceRecorderModal from '../../shared/components/modals/VoiceRecorderModal';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { token } = useAuthToken();
  const [userType, setUserType] = React.useState<'medecin' | 'tuteur' | 'patient' | null>(null);

  React.useEffect(() => {
    const loadUserType = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        setUserType(user.userType);
      }
    };
    loadUserType();
  }, []);

  const {
    patient,
    medications,
    isLoading,
    isRefreshing,
    showPrescriptionModal,
    selectedPrescription,
    feedbackModal,
    deleteConfirmModal,
    voiceMessages,
    showVoiceRecorder,
    currentPlayingVoice,
    adherenceHistory,
    adherenceLoading,
    selectedTab,
    userType: hookUserType,
    setShowPrescriptionModal,
    setSelectedPrescription,
    setFeedbackModal,
    setDeleteConfirmModal,
    setShowVoiceRecorder,
    setSelectedTab,
    onRefresh,
    handleAddPrescription,
    handleEditPrescription,
    handleDeletePrescription,
    confirmDeletePrescription,
    handleSavePrescription,
    handlePlayVoiceMessage,
    handleDeleteVoiceMessage,
    handleSaveVoiceMessage,
  } = usePatientProfile(patientId);

  // Use hook's userType if available, otherwise use state
  const effectiveUserType = hookUserType || userType;

  const colors = useMemo(() => {
    // Only apply theme if user is doctor or tutor, not patient
    if (effectiveUserType === 'medecin' || effectiveUserType === 'tuteur') {
      return getThemeColors(effectiveUserType);
    }
    // Default to doctor theme if userType is not set yet
    return getThemeColors('medecin');
  }, [effectiveUserType]);

  React.useEffect(() => {
    // Only redirect if no patientId and we're a patient
    if (!patientId && effectiveUserType === 'patient') {
      router.replace('/(patient)/profile-settings' as any);
    }
  }, [patientId, effectiveUserType, router]);

  const renderMedicationCard = ({ item }: { item: any }) => (
    <ProfileMedicationCard
      medication={item}
      onEdit={handleEditPrescription}
      onDelete={handleDeletePrescription}
      colors={colors}
    />
  );

  const renderEmptyMedications = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="medical-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Aucun médicament</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        Ce patient n'a pas encore de prescription active
      </Text>
    </View>
  );

  if (!patientId) {
    return null; // Will redirect in useEffect
  }

  if (isLoading && !patient) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Chargement...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={colors.background} style={styles.background}>
          <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.customHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(doctor)/dashboard' as any);
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profil Patient</Text>
            <View style={styles.headerSpacer} />
          </LinearGradient>
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Patient non trouvé</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.background} style={styles.background}>
        {/* Header */}
        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.customHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(doctor)/dashboard' as any);
              }
            }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Patient</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="white" colors={[colors.primary]} />
          }
        >
          {/* Patient Contact Info */}
          <PatientInfoCard patient={patient} medicationCount={medications.length} colors={colors} />

          {/* Tab Selector */}
          <PatientProfileTabs selectedTab={selectedTab} onTabChange={setSelectedTab} colors={colors} />

          {/* Medications Tab Content */}
          {selectedTab === 'medications' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescriptions Actives</Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddPrescription}>
                  <Ionicons name="add-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={medications}
                renderItem={renderMedicationCard}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyMedications}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          {/* Adherence History Tab Content */}
          {selectedTab === 'adherence' && (
            <>
              {adherenceLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: colors.text }]}>Chargement de l'observance...</Text>
                </View>
              ) : adherenceHistory ? (
                <AdherenceStatsSection adherenceHistory={adherenceHistory} colors={colors} />
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="stats-chart-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Aucune donnée d'observance</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    Les statistiques apparaîtront une fois que le patient commencera son traitement
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Voices Tab Content */}
          {selectedTab === 'voices' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Messages Vocaux</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowVoiceRecorder(true)}>
                  <Ionicons name="mic-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {voiceMessages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="mic-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Aucun message vocal</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
                    Enregistrez un message vocal pour ce patient
                  </Text>
                </View>
              ) : (
                voiceMessages.map((message) => (
                  <VoiceMessageCard
                    key={message.id}
                    message={message}
                    isPlaying={currentPlayingVoice === message.id}
                    onPlay={handlePlayVoiceMessage}
                    onDelete={handleDeleteVoiceMessage}
                    colors={colors}
                  />
                ))
              )}
            </>
          )}
        </ScrollView>

        {/* Add/Edit Prescription Modal */}
        <AddPrescriptionModal
          visible={showPrescriptionModal}
          onClose={() => {
            setShowPrescriptionModal(false);
            setSelectedPrescription(null);
          }}
          onSave={handleSavePrescription}
          existingPrescription={selectedPrescription}
          patientName={patient ? `${patient.firstName || 'Patient'} ${patient.lastName || 'Inconnu'}` : 'Patient'}
          patientId={patientId || ''}
          token={token || ''}
          voiceMessages={voiceMessages}
          onVoiceMessagesUpdate={(voices) => {
            // Voice messages are managed by the hook
          }}
          colors={colors}
        />

        {/* Delete Confirmation Modal */}
        <FeedbackModal
          visible={deleteConfirmModal.visible}
          type="confirm"
          title="Supprimer la prescription"
          message={`Êtes-vous sûr de vouloir supprimer cette prescription ?`}
          onConfirm={confirmDeletePrescription}
          onCancel={() => setDeleteConfirmModal({ visible: false, medication: null })}
          confirmText="Supprimer"
          cancelText="Annuler"
        />

        {/* Success/Error Feedback Modal */}
        <FeedbackModal
          visible={feedbackModal.visible}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          onConfirm={feedbackModal.onConfirm}
          onCancel={feedbackModal.onCancel}
          confirmText={feedbackModal.confirmText}
          cancelText={feedbackModal.cancelText}
        />

        {/* Voice Recorder Modal */}
        <VoiceRecorderModal
          visible={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={handleSaveVoiceMessage}
          colors={colors}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  customHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
