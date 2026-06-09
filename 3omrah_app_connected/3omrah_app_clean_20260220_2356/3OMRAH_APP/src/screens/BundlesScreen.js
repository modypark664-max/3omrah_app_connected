import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BundlesOverviewScreen from './BundlesOverviewScreen';
import BundleTypeScreen from './BundleTypeScreen';
import BundleDetailsScreen from './BundleDetailsScreen';
import BundlePaymentScreen from './BundlePaymentScreen';
import colors from '../theme/colors';

const Stack = createNativeStackNavigator();

const BundlesScreen = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: colors.background }
    }}
  >
    <Stack.Screen
      name="BundlesOverview"
      component={BundlesOverviewScreen}
      options={{ title: 'الباقات' }}
    />
    <Stack.Screen
      name="BundleType"
      component={BundleTypeScreen}
      options={({ route }) => ({ title: route.params?.title || 'قائمة الباقات' })}
    />
    <Stack.Screen
      name="BundleDetails"
      component={BundleDetailsScreen}
      options={{ title: 'تفاصيل الباقة' }}
    />
    <Stack.Screen
      name="BundlePayment"
      component={BundlePaymentScreen}
      options={{ title: 'إتمام الدفع' }}
    />
  </Stack.Navigator>
);

export default BundlesScreen;
