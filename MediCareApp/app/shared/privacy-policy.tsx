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

export default function PrivacyPolicyScreen() {
  const router = useRouter();

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
          <Text style={styles.headerTitle}>Politique de confidentialité</Text>
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
              
              <Text style={styles.lastUpdated}>Dernière mise à jour: Octobre 2024</Text>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>Introduction</Text>
                <Text style={styles.paragraph}>
                  MediCare s'engage à protéger votre vie privée et la confidentialité de vos données personnelles et médicales. 
                  Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>1. Données collectées</Text>
                <Text style={styles.paragraph}>
                  Nous collectons les informations suivantes:
                </Text>
                <Text style={styles.bulletPoint}>• Informations d'identification (nom, prénom, email, téléphone)</Text>
                <Text style={styles.bulletPoint}>• Données médicales (prescriptions, médicaments, rappels)</Text>
                <Text style={styles.bulletPoint}>• Données de connexion (adresse IP, type d'appareil)</Text>
                <Text style={styles.bulletPoint}>• Messages vocaux et communications</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>2. Utilisation des données</Text>
                <Text style={styles.paragraph}>
                  Vos données sont utilisées pour:
                </Text>
                <Text style={styles.bulletPoint}>• Fournir les services de l'application</Text>
                <Text style={styles.bulletPoint}>• Envoyer des rappels de médicaments</Text>
                <Text style={styles.bulletPoint}>• Faciliter la communication avec les professionnels de santé</Text>
                <Text style={styles.bulletPoint}>• Améliorer nos services</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>3. Protection des données</Text>
                <Text style={styles.paragraph}>
                  Nous mettons en œuvre des mesures de sécurité strictes:
                </Text>
                <Text style={styles.bulletPoint}>• Chiffrement des données en transit et au repos</Text>
                <Text style={styles.bulletPoint}>• Accès sécurisé par authentification</Text>
                <Text style={styles.bulletPoint}>• Serveurs sécurisés et sauvegardés régulièrement</Text>
                <Text style={styles.bulletPoint}>• Audits de sécurité réguliers</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>4. Partage des données</Text>
                <Text style={styles.paragraph}>
                  Vos données ne sont partagées qu'avec:
                </Text>
                <Text style={styles.bulletPoint}>• Les professionnels de santé autorisés (médecins, tuteurs)</Text>
                <Text style={styles.bulletPoint}>• Les services techniques nécessaires au fonctionnement</Text>
                <Text style={[styles.paragraph, { marginTop: 12 }]}>
                  Nous ne vendons jamais vos données personnelles à des tiers.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>5. Vos droits</Text>
                <Text style={styles.paragraph}>
                  Conformément à la réglementation, vous disposez des droits suivants:
                </Text>
                <Text style={styles.bulletPoint}>• Droit d'accès à vos données</Text>
                <Text style={styles.bulletPoint}>• Droit de rectification</Text>
                <Text style={styles.bulletPoint}>• Droit à l'effacement</Text>
                <Text style={styles.bulletPoint}>• Droit à la portabilité des données</Text>
                <Text style={styles.bulletPoint}>• Droit d'opposition au traitement</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>6. Conservation des données</Text>
                <Text style={styles.paragraph}>
                  Vos données sont conservées:
                </Text>
                <Text style={styles.bulletPoint}>• Pendant toute la durée d'utilisation du service</Text>
                <Text style={styles.bulletPoint}>• 3 ans après la dernière connexion (données médicales)</Text>
                <Text style={styles.bulletPoint}>• Selon les obligations légales applicables</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>7. Cookies et technologies similaires</Text>
                <Text style={styles.paragraph}>
                  Nous utilisons des technologies pour améliorer votre expérience:
                </Text>
                <Text style={styles.bulletPoint}>• Tokens de session pour la connexion sécurisée</Text>
                <Text style={styles.bulletPoint}>• Stockage local pour les préférences</Text>
                <Text style={styles.bulletPoint}>• Notifications push (avec votre consentement)</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>8. Modifications de la politique</Text>
                <Text style={styles.paragraph}>
                  Nous pouvons modifier cette politique de confidentialité. Les modifications importantes 
                  vous seront notifiées par email ou notification dans l'application.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>9. Contact</Text>
                <Text style={styles.paragraph}>
                  Pour toute question sur la confidentialité ou pour exercer vos droits:
                </Text>
                <Text style={styles.bulletPoint}>• Email: privacy@medicare.tn</Text>
                <Text style={styles.bulletPoint}>• Téléphone: +216 XX XXX XXX</Text>
                <Text style={styles.bulletPoint}>• Adresse: Tunis, Tunisie</Text>
              </View>

              <View style={styles.certificationBanner}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                <Text style={styles.certificationText}>
                  Conforme aux normes de protection des données de santé
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

