import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const brandLogo = require('../../assets/splash-logo.png');

type LoginScreenProps = {
  email: string;
  isSubmitting: boolean;
  isTwoFactorStep: boolean;
  onChangeEmail: (value: string) => void;
  onChangeOtp: (value: string) => void;
  onChangePassword: (value: string) => void;
  onBackToCredentials: () => void;
  onSubmit: () => void;
  otpCode: string;
  password: string;
  paddingBottom: number;
  paddingTop: number;
};

export default function LoginScreen({
  email,
  isSubmitting,
  isTwoFactorStep,
  onChangeEmail,
  onChangeOtp,
  onChangePassword,
  onBackToCredentials,
  onSubmit,
  otpCode,
  password,
  paddingBottom,
  paddingTop,
}: LoginScreenProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          styles.contentPadding,
          { paddingTop, paddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.loginCard}>
          <View style={styles.brandPanel}>
            <Image source={brandLogo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.title}>
              {isTwoFactorStep ? 'Verify Authenticator' : 'Sign in'}
            </Text>
            <Text style={styles.note}>
              {isTwoFactorStep
                ? 'Enter the 6-digit code from Google Authenticator to complete user login.'
                : 'Access your Corbital Enterprise workspace with your company account.'}
            </Text>
          </View>

          <View style={styles.formPanel}>
            {!isTwoFactorStep ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={onChangeEmail}
                    placeholder="name@corbital.com"
                    placeholderTextColor="#94a3b8"
                    returnKeyType="next"
                    style={styles.input}
                    value={email}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordInputWrap}>
                    <TextInput
                      onChangeText={onChangePassword}
                      placeholder="Enter your password"
                      placeholderTextColor="#94a3b8"
                      returnKeyType="done"
                      secureTextEntry={!isPasswordVisible}
                      style={styles.passwordInput}
                      value={password}
                    />
                    <Pressable
                      hitSlop={10}
                      onPress={() => setIsPasswordVisible(current => !current)}
                      style={styles.eyeButton}>
                      <Ionicons
                        color="#9ca3af"
                        name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                      />
                    </Pressable>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewLabel}>Login Account</Text>
                  <Text style={styles.reviewValue}>{email}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Authenticator Code</Text>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={onChangeOtp}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#94a3b8"
                    returnKeyType="done"
                    style={styles.input}
                    value={otpCode}
                  />
                </View>

                <Pressable onPress={onBackToCredentials} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back to credentials</Text>
                </Pressable>
              </>
            )}

            <Pressable
              disabled={isSubmitting}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
                isSubmitting && styles.loginButtonDisabled,
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>
                  {isTwoFactorStep ? 'Verify Code' : 'Continue'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.footerText}>
              {isTwoFactorStep
                ? 'Admin accounts bypass authenticator. User accounts verify with Google Authenticator.'
                : 'Secure employee login for payroll and role-based access.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff5f3',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  contentPadding: {
    paddingHorizontal: 22,
  },
  glowOne: {
    backgroundColor: '#fecaca',
    borderRadius: 160,
    height: 220,
    left: -60,
    opacity: 0.35,
    position: 'absolute',
    top: 90,
    width: 220,
  },
  glowTwo: {
    backgroundColor: '#fca5a5',
    borderRadius: 160,
    bottom: 120,
    height: 180,
    opacity: 0.2,
    position: 'absolute',
    right: -40,
    width: 180,
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fee2e2',
    borderRadius: 32,
    borderWidth: 1,
    elevation: 6,
    maxWidth: 460,
    overflow: 'hidden',
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.12,
    shadowRadius: 36,
    width: '100%',
    alignSelf: 'center',
  },
  brandPanel: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  formPanel: {
    padding: 22,
  },
  logo: {
    height: 112,
    marginBottom: 18,
    width: 250,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginBottom: 10,
    textAlign: 'center',
  },
  note: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 260,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fffafa',
    borderColor: '#fecaca',
    borderRadius: 18,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  passwordInputWrap: {
    alignItems: 'center',
    backgroundColor: '#fffafa',
    borderColor: '#fecaca',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    paddingLeft: 18,
    paddingRight: 14,
  },
  passwordInput: {
    color: '#111827',
    flex: 1,
    fontSize: 16,
    paddingVertical: 15,
  },
  eyeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  reviewCard: {
    backgroundColor: '#fff1ee',
    borderColor: '#fecaca',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  reviewLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  reviewValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: -2,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#d61f1f',
    borderRadius: 18,
    marginTop: 10,
    paddingVertical: 17,
  },
  loginButtonPressed: {
    opacity: 0.92,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
    textAlign: 'center',
  },
});
