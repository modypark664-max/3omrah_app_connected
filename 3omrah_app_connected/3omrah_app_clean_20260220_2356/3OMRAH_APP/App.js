import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Platform, View, I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Tajawal_400Regular, Tajawal_500Medium, Tajawal_700Bold } from '@expo-google-fonts/tajawal';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import BottomTabs from './src/navigation/BottomTabs';
import colors from './src/theme/colors';
import {
  OnboardingScreen,
  LoginScreen,
  SignupScreen,
  NotificationsScreen,
  SearchScreen,
  OffersScreen,
  OfferDetailsScreen,
  BundlesScreen,
  CompareScreen,
  ContactScreen
} from './src/screens';
import AuthContext from './src/context/AuthContext';
import CompareProvider from './src/context/CompareProvider';
import ChatProvider from './src/context/ChatProvider';
import { NotificationProvider } from './src/context/NotificationContext';
import { loadAuthState, saveAuthState, clearAuthState } from './src/storage/authStorage';
import { fetchProfileOverview, registerPushToken, removePushToken } from './src/services/api';
import { API_BASE_URL } from './src/config/env';

// Check if push notifications are supported (not in Expo Go)
const PUSH_SUPPORTED = Constants?.executionEnvironment !== 'storeClient' && Device.isDevice;

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    border: 'transparent',
    card: colors.surface,
    primary: colors.secondary,
    text: colors.primary
  }
};

const Stack = createNativeStackNavigator();

// Register for push notifications and get token
async function registerForPushNotificationsAsync() {
  if (!PUSH_SUPPORTED) {
    console.log('[Push] Not supported in this environment (Expo Go or simulator)');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission not granted');
      return null;
    }

    // Get Expo push token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId
    });

    console.log('[Push] Token obtained:', tokenData.data?.slice(0, 30) + '...');

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      });
    }

    return tokenData.data;
  } catch (error) {
    console.error('[Push] Error getting push token:', error.message);
    return null;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Force app entry to auth flow (Login first) unless authenticated.
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [authStartRoute, setAuthStartRoute] = useState('Login');
  const pushTokenRef = useRef(null);
  const [isHydratingAuth, setIsHydratingAuth] = useState(true);
  const [directionReady, setDirectionReady] = useState(false);

  useEffect(() => {
    try {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
      I18nManager.swapLeftAndRightInRTL(false);
      if (I18nManager.isRTL) {
        console.log('[Layout] Forced LTR layout. Reload the app if the UI still appears RTL.');
      }
    } catch (error) {
      console.warn('[Layout] Failed to enforce LTR direction', error);
    } finally {
      setDirectionReady(true);
    }
  }, []);

  const persistAuthSnapshot = useCallback(
    async (overrides = {}) => {
      const snapshot = {
        isAuthenticated: overrides.isAuthenticated ?? isAuthenticated,
        hasSeenOnboarding: overrides.hasSeenOnboarding ?? hasSeenOnboarding,
        authStartRoute: overrides.authStartRoute ?? authStartRoute
      };
      await saveAuthState(snapshot);
    },
    [isAuthenticated, hasSeenOnboarding, authStartRoute]
  );

  const handleCompleteOnboarding = useCallback(
    async (preferredRoute = 'Login') => {
      setAuthStartRoute(preferredRoute);
      setHasSeenOnboarding(true);
      await persistAuthSnapshot({ hasSeenOnboarding: true, authStartRoute: preferredRoute });
    },
    [persistAuthSnapshot]
  );

  const handleSignIn = useCallback(
    async () => {
      setIsAuthenticated(true);
      setHasSeenOnboarding(true);
      await persistAuthSnapshot({ isAuthenticated: true, hasSeenOnboarding: true });
      // Register push token for this device
      try {
        await registerExpoPushToken();
      } catch (err) {
        console.warn('[Push] register after sign-in failed', err?.message || err);
      }
    },
    [persistAuthSnapshot]
  );

  // Push token storage key
  const PUSH_TOKEN_KEY = '@rehlatty/push-token';

  const registerExpoPushToken = async () => {
    try {
      // Request permissions
      const settings = await Notifications.getPermissionsAsync();
      let granted = settings?.granted || settings?.status === 'granted';
      console.log('[Push] Permission status:', settings?.status, 'granted:', granted);
      if (!granted) {
        const request = await Notifications.requestPermissionsAsync();
        granted = request?.granted || request?.status === 'granted';
        console.log('[Push] Requested permission, granted:', granted);
      }
      if (!granted) {
        console.log('[Push] Notification permission not granted');
        return null;
      }

      // Get the project ID for Expo push token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      console.log('[Push] Using projectId:', projectId);
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId
      });
      const token = tokenResult?.data;
      console.log('[Push] Got token:', token?.slice(0, 40) + '...');
      if (!token) {
        console.warn('[Push] No token returned');
        return null;
      }

      // Set up Android notification channel (Critical for custom priority/sound)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C'
        });
      }

      // Persist locally for removal on logout
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Send to backend
      await registerPushToken(token, null);
      return token;
    } catch (error) {
      console.warn('[Push] registerExpoPushToken failed', error?.message || error);
      return null;
    }
  };

  // Sync push token whenever user is authenticated (e.g. on app launch with restored session)
  useEffect(() => {
    if (isAuthenticated) {
      // We don't await this to avoid blocking UI, just fire and forget (with log)
      registerExpoPushToken().catch(err => console.warn('[Push] Auto-register failed', err));
    }
  }, [isAuthenticated]);

  const removeExpoPushToken = async () => {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (!token) return;
      await removePushToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      console.log('[Push] Removed token on server');
    } catch (error) {
      console.warn('[Push] removeExpoPushToken failed', error?.message || error);
    }
  };

  const handleSignOut = useCallback(
    async () => {
      // Remove push token from server (best-effort)
      try {
        await removeExpoPushToken();
      } catch (err) {
        console.warn('[Push] remove token on sign out failed', err?.message || err);
      }
      setIsAuthenticated(false);
      setHasSeenOnboarding(true);
      await persistAuthSnapshot({ isAuthenticated: false, hasSeenOnboarding: true });
    },
    [persistAuthSnapshot]
  );

  const validateStoredSession = useCallback(async () => {
    try {
      await fetchProfileOverview();
      return true;
    } catch (error) {
      if (error?.status && [401, 403].includes(error.status)) {
        return false;
      }
      console.warn('[Auth] session validation skipped', error?.message || error);
      return true;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const hydrateAuthState = async () => {
      try {
        const stored = await loadAuthState();
        if (stored) {
          if (stored.authStartRoute) {
            setAuthStartRoute(stored.authStartRoute);
          }
          // Even if older snapshots have onboarding=false, we now start at Login by default.
          setHasSeenOnboarding(true);
          if (stored.isAuthenticated) {
            const sessionValid = await validateStoredSession();
            if (sessionValid && isMounted) {
              setIsAuthenticated(true);
              setHasSeenOnboarding(true);
            } else if (!sessionValid) {
              await clearAuthState();
            }
          }
        }
      } catch (error) {
        console.warn('[Auth] hydrateAuthState failed', error);
      } finally {
        if (isMounted) {
          setIsHydratingAuth(false);
        }
      }
    };

    hydrateAuthState();

    return () => {
      isMounted = false;
    };
  }, [validateStoredSession]);

  const authValue = useMemo(
    () => ({
      isAuthenticated,
      hasSeenOnboarding,
      completeOnboarding: handleCompleteOnboarding,
      signIn: handleSignIn,
      signOut: handleSignOut
    }),
    [handleCompleteOnboarding, handleSignIn, handleSignOut, hasSeenOnboarding, isAuthenticated]
  );

  if (!fontsLoaded || isHydratingAuth || !directionReady) {
    return (
      <SafeAreaProvider>
        <AuthContext.Provider value={authValue}>
          <CompareProvider>
            <ChatProvider>
              <NotificationProvider>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
                  <ActivityIndicator color={colors.secondary} size="large" />
                </View>
              </NotificationProvider>
            </ChatProvider>
          </CompareProvider>
        </AuthContext.Provider>
      </SafeAreaProvider>
    );
  }

  const navigatorKey = isAuthenticated ? 'main' : hasSeenOnboarding ? 'auth' : 'onboarding';
  const initialRouteName = isAuthenticated
    ? 'Main'
    : hasSeenOnboarding
      ? authStartRoute
      : 'Onboarding';

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={authValue}>
        <CompareProvider>
          <ChatProvider>
            <NotificationProvider>
              <NavigationContainer theme={navTheme}>
                <StatusBar style="light" />
                <Stack.Navigator
                  key={navigatorKey}
                  screenOptions={{ headerShown: false }}
                  initialRouteName={initialRouteName}
                >
                  {!hasSeenOnboarding && (
                    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                  )}

                  {hasSeenOnboarding && !isAuthenticated && (
                    <>
                      <Stack.Screen name="Login" component={LoginScreen} />
                      <Stack.Screen name="Signup" component={SignupScreen} />
                    </>
                  )}

                  {isAuthenticated && <Stack.Screen name="Main" component={BottomTabs} />}
                  {isAuthenticated && <Stack.Screen name="Notifications" component={NotificationsScreen} />}
                  {isAuthenticated && <Stack.Screen name="Search" component={SearchScreen} />}
                  {isAuthenticated && <Stack.Screen name="Offers" component={OffersScreen} />}
                  {isAuthenticated && <Stack.Screen name="OfferDetails" component={OfferDetailsScreen} />}
                  {isAuthenticated && <Stack.Screen name="Bundles" component={BundlesScreen} />}
                  {isAuthenticated && <Stack.Screen name="Compare" component={CompareScreen} />}
                  {isAuthenticated && <Stack.Screen name="Contact" component={ContactScreen} />}
                </Stack.Navigator>
              </NavigationContainer>
            </NotificationProvider>
          </ChatProvider>
        </CompareProvider>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
