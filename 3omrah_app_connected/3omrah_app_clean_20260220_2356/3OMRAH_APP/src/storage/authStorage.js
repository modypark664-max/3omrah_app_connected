import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_KEY = '@rehlatty/auth-state';

export const loadAuthState = async () => {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[authStorage] loadAuthState failed', error);
    return null;
  }
};

export const saveAuthState = async (state) => {
  try {
    if (!state) {
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
      return;
    }
    await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[authStorage] saveAuthState failed', error);
  }
};

export const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem(AUTH_STATE_KEY);
  } catch (error) {
    console.warn('[authStorage] clearAuthState failed', error);
  }
};

export default {
  loadAuthState,
  saveAuthState,
  clearAuthState
};
