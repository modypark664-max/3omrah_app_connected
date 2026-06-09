import { PixelRatio } from 'react-native';

const BASE_WIDTH = 375;

export function scale(size, screenWidth) {
  if (!screenWidth) return size;
  const newSize = (screenWidth / BASE_WIDTH) * size;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

