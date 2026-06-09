import { Platform } from 'react-native';

export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
};

export const typography = {
  regular: 'Tajawal_400Regular',
  medium: 'Tajawal_500Medium',
  bold: 'Tajawal_700Bold'
};

export function shadow(level = 1) {
  if (Platform.OS === 'android') {
    return { elevation: Math.max(1, Math.round(level * 3)) };
  }
  const opacity = 0.08 + level * 0.03;
  const radius = 10 + level * 6;
  const height = 8 + level * 4;
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height },
    shadowOpacity: Math.min(0.22, opacity),
    shadowRadius: radius
  };
}

