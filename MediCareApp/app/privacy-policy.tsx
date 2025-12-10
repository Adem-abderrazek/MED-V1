import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.background}>
          {/* Header */}
          <LinearGradient
          colors={["#4facfe", "#00f2fe"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
              </View>
              
              <Text style={styles.lastUpdated}>{t('privacy.lastUpdated')}</Text>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.introduction.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.introduction.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.dataCollected.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.dataCollected.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataCollected.points.identification')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataCollected.points.medical')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataCollected.points.connection')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataCollected.points.messages')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.dataUsage.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.dataUsage.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataUsage.points.services')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataUsage.points.reminders')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataUsage.points.communication')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataUsage.points.improvement')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.dataProtection.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.dataProtection.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataProtection.points.encryption')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataProtection.points.authentication')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataProtection.points.servers')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataProtection.points.audits')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.dataSharing.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.dataSharing.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataSharing.points.professionals')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.dataSharing.points.technical')}</Text>
                <Text style={[styles.paragraph, { marginTop: 12 }]}>
                  {t('privacy.sections.dataSharing.noSale')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.rights.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.rights.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.rights.points.access')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.rights.points.rectification')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.rights.points.erasure')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.rights.points.portability')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.rights.points.opposition')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.retention.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.retention.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.retention.points.duration')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.retention.points.medical')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.retention.points.legal')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.cookies.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.cookies.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.cookies.points.tokens')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.cookies.points.storage')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.cookies.points.notifications')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.modifications.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.modifications.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('privacy.sections.contact.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('privacy.sections.contact.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.contact.email')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.contact.phone')}</Text>
                <Text style={styles.bulletPoint}>• {t('privacy.sections.contact.address')}</Text>
              </View>

              <View style={styles.certificationBanner}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                <Text style={styles.certificationText}>
                  {t('privacy.sections.certification.text')}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
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
    fontSize: 18,
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
  card: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  textSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4facfe',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 24,
    marginLeft: 12,
    marginBottom: 6,
  },
  certificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  certificationText: {
    flex: 1,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    lineHeight: 20,
  },
});

