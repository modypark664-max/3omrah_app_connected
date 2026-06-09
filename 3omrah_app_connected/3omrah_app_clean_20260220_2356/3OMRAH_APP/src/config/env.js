import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

const DEFAULT_API_URL = 'http://localhost:3000';

const resolveApiUrl = () => {
  const configured = process.env?.EXPO_PUBLIC_API_URL || extra.apiUrl || DEFAULT_API_URL;
  if (Platform.OS === 'android' && configured.includes('localhost')) {
    return configured.replace('localhost', '10.0.2.2');
  }
  return configured;
};

export const API_BASE_URL = resolveApiUrl();

const normalizedBase = API_BASE_URL.replace(/\/$/, '');
const fallbackPrivacyUrl = `${normalizedBase}/privacy`;

export const PRIVACY_POLICY_URL =
  process.env?.EXPO_PUBLIC_PRIVACY_POLICY_URL || extra.privacyPolicyUrl || fallbackPrivacyUrl;

export default {
  API_BASE_URL,
  PRIVACY_POLICY_URL
};
