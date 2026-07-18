import { useCallback, useEffect, useState } from 'react';
import { Alert, StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchCurrentUser, loginUser } from './src/services/auth';
import type { LoggedInUser } from './src/services/auth';
import { clearSession, loadSession, saveSession } from './src/services/session';
import LoginScreen from './src/screens/LoginScreen';
import MainTabsScreen from './src/screens/MainTabsScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const session = await loadSession();

        if (session?.token && session?.user) {
          setSessionToken(session.token);

          try {
            const currentUser = await fetchCurrentUser(session.token);
            await saveSession({
              ...session,
              user: currentUser,
            });
            setLoggedInUser(currentUser);
          } catch {
            setLoggedInUser(session.user);
          }
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession().catch(() => {
      setIsBootstrapping(false);
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter both email and password.');
      return;
    }

    if (isTwoFactorStep && !otpCode.trim()) {
      Alert.alert('Missing code', 'Please enter your authenticator code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await loginUser(
        email.trim(),
        password,
        isTwoFactorStep ? otpCode.trim() : undefined,
      );

      if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
        setIsTwoFactorStep(true);
        Alert.alert(
          'Authenticator required',
          'Enter the 6-digit code from Google Authenticator to continue.',
        );
        return;
      }

      await saveSession(result);
      setSessionToken(result.token);
      setLoggedInUser(result.user);
      setOtpCode('');
      setIsTwoFactorStep(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to login right now.';
      Alert.alert('Login failed', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await clearSession();
    setSessionToken(null);
    setLoggedInUser(null);
    setPassword('');
    setOtpCode('');
    setIsTwoFactorStep(false);
  };

  const handleUpdateLoggedInUser = useCallback(async (updatedUser: LoggedInUser) => {
    if (!sessionToken) {
      return;
    }

    const updatedSession = {
      token: sessionToken,
      tokenExpiresIn: null,
      user: updatedUser,
    };

    await saveSession(updatedSession);
    setLoggedInUser(updatedUser);
  }, [sessionToken]);

  const contentPaddingStyle = {
    paddingTop: safeAreaInsets.top + 24,
    paddingBottom: safeAreaInsets.bottom + 24,
  };

  if (isBootstrapping) {
    return (
      <LoginScreen
        email=""
        isSubmitting
        onChangeEmail={setEmail}
        onChangeOtp={setOtpCode}
        onChangePassword={setPassword}
        onBackToCredentials={() => {}}
        onSubmit={() => {}}
        otpCode=""
        paddingBottom={contentPaddingStyle.paddingBottom}
        paddingTop={contentPaddingStyle.paddingTop}
        password=""
        isTwoFactorStep={false}
      />
    );
  }

  if (loggedInUser && sessionToken) {
    return (
      <MainTabsScreen
        onLogout={handleLogout}
        onUpdateLoggedInUser={handleUpdateLoggedInUser}
        paddingBottom={contentPaddingStyle.paddingBottom}
        paddingTop={contentPaddingStyle.paddingTop}
        token={sessionToken}
        user={loggedInUser}
      />
    );
  }

  return (
    <LoginScreen
      email={email}
      isSubmitting={isSubmitting}
      isTwoFactorStep={isTwoFactorStep}
      onChangeEmail={setEmail}
      onChangeOtp={setOtpCode}
      onChangePassword={setPassword}
      onBackToCredentials={() => {
        setIsTwoFactorStep(false);
        setOtpCode('');
      }}
      onSubmit={handleLogin}
      otpCode={otpCode}
      paddingBottom={contentPaddingStyle.paddingBottom}
      paddingTop={contentPaddingStyle.paddingTop}
      password={password}
    />
  );
}

export default App;
