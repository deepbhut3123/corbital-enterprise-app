import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession } from './auth';

const AUTH_SESSION_KEY = 'corbital_auth_session';

export async function saveSession(session: AuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function loadSession() {
  const rawValue = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  return JSON.parse(rawValue) as AuthSession;
}

export async function clearSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
