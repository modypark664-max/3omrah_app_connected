// index.js in project root
import { I18nManager } from 'react-native';

// Force LTR BEFORE loading App
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
  console.log('🔧 RTL disabled globally');
} catch (e) {
  console.warn('Failed to disable RTL:', e);
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
