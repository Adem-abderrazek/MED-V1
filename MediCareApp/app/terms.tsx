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

export default function TermsScreen() {
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
          <Text style={styles.headerTitle}>{t('terms.title')}</Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <LinearGradient
              colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"]}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={48} color="#4facfe" />
              </View>
              
              <Text style={styles.lastUpdated}>{t('terms.lastUpdated')}</Text>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.acceptance.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.acceptance.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.description.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.description.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.description.points.manage')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.description.points.reminders')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.description.points.tracking')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.description.points.communication')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.responsibilities.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.responsibilities.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.responsibilities.points.credentials')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.responsibilities.points.information')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.responsibilities.points.lawful')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.responsibilities.points.verification')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.dataProtection.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.dataProtection.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.dataProtection.points.encryption')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.dataProtection.points.sharing')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.dataProtection.points.secrecy')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.dataProtection.points.security')}</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.liability.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.liability.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.liability.points.consultations')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.liability.points.diagnostics')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.liability.points.advice')}</Text>
                <Text style={[styles.paragraph, { marginTop: 12 }]}>
                  {t('terms.sections.liability.emergency')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.modifications.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.modifications.content')}
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{t('terms.sections.contact.title')}</Text>
                <Text style={styles.paragraph}>
                  {t('terms.sections.contact.content')}
                </Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.contact.email')}</Text>
                <Text style={styles.bulletPoint}>• {t('terms.sections.contact.phone')}</Text>
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
    fontSize: 20,
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
    marginBottom: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
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
});

