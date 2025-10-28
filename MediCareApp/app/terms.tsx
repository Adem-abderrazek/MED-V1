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

export default function TermsScreen() {
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
          <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
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
              
              <Text style={styles.lastUpdated}>Dernière mise à jour: Octobre 2024</Text>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>1. Acceptation des conditions</Text>
                <Text style={styles.paragraph}>
                  En accédant et en utilisant l'application MediCare, vous acceptez d'être lié par ces conditions d'utilisation. 
                  Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>2. Description du service</Text>
                <Text style={styles.paragraph}>
                  MediCare est une application de gestion des médicaments et de suivi médical destinée aux patients, 
                  tuteurs et médecins. L'application permet de:
                </Text>
                <Text style={styles.bulletPoint}>• Gérer les prescriptions médicales</Text>
                <Text style={styles.bulletPoint}>• Recevoir des rappels pour les prises de médicaments</Text>
                <Text style={styles.bulletPoint}>• Suivre l'observance thérapeutique</Text>
                <Text style={styles.bulletPoint}>• Communiquer avec les professionnels de santé</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>3. Responsabilités de l'utilisateur</Text>
                <Text style={styles.paragraph}>
                  Vous êtes responsable de:
                </Text>
                <Text style={styles.bulletPoint}>• Maintenir la confidentialité de vos identifiants de connexion</Text>
                <Text style={styles.bulletPoint}>• Fournir des informations exactes et à jour</Text>
                <Text style={styles.bulletPoint}>• Utiliser l'application conformément à la loi</Text>
                <Text style={styles.bulletPoint}>• Ne pas partager vos codes de vérification</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>4. Protection des données médicales</Text>
                <Text style={styles.paragraph}>
                  Vos données médicales sont protégées conformément aux réglementations en vigueur sur la protection 
                  des données de santé. Nous nous engageons à:
                </Text>
                <Text style={styles.bulletPoint}>• Chiffrer toutes les données sensibles</Text>
                <Text style={styles.bulletPoint}>• Ne jamais partager vos données sans votre consentement</Text>
                <Text style={styles.bulletPoint}>• Respecter le secret médical</Text>
                <Text style={styles.bulletPoint}>• Sécuriser l'accès à vos informations</Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>5. Limitation de responsabilité</Text>
                <Text style={styles.paragraph}>
                  MediCare est un outil d'aide à la gestion médicale. Il ne remplace pas:
                </Text>
                <Text style={styles.bulletPoint}>• Les consultations médicales</Text>
                <Text style={styles.bulletPoint}>• Les diagnostics professionnels</Text>
                <Text style={styles.bulletPoint}>• Les conseils médicaux personnalisés</Text>
                <Text style={styles.paragraph} style={{ marginTop: 12 }}>
                  En cas d'urgence médicale, contactez immédiatement les services d'urgence.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>6. Modifications des conditions</Text>
                <Text style={styles.paragraph}>
                  Nous nous réservons le droit de modifier ces conditions à tout moment. 
                  Les utilisateurs seront informés des modifications importantes par notification.
                </Text>
              </View>

              <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>7. Contact</Text>
                <Text style={styles.paragraph}>
                  Pour toute question concernant ces conditions, contactez-nous:
                </Text>
                <Text style={styles.bulletPoint}>• Email: support@medicare.tn</Text>
                <Text style={styles.bulletPoint}>• Téléphone: +216 XX XXX XXX</Text>
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

