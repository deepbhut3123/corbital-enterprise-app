import { Platform } from 'react-native';

const FALLBACK_API_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://192.168.1.28:5000';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const rawApiBaseUrl = envApiUrl || FALLBACK_API_URL;

export const API_BASE_URL = /\/api\/?$/i.test(rawApiBaseUrl)
  ? rawApiBaseUrl.replace(/\/+$/, '')
  : `${rawApiBaseUrl.replace(/\/+$/, '')}/api`;

export function buildApiUrl(path = '') {
  if (!path) {
    return API_BASE_URL;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  return `${normalizedBase}/${normalizedPath}`;
}
