import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  HomeScreen,
  OffersScreen,
  ProfileScreen,
  ScreenPlaceholder
} from '../screens';

import colors from '../theme/colors';

const Tab = createBottomTabNavigator();

const TAB_ICON_SIZE = 23;

const TabIcon = ({ focused, iconName, outlineName }) => (
  <View style={styles.tabIconWrap}>
    {focused && <View style={styles.activeIndicator} />}
    <Ionicons
      name={focused ? iconName : outlineName}
      size={TAB_ICON_SIZE}
      color={focused ? colors.primary : colors.muted}
    />
  </View>
);

const BottomTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 6 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 6,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#5D5FEF',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 10
        },
        tabBarLabelStyle: {
          fontFamily: 'Tajawal_500Medium',
          fontSize: 10.5,
          marginTop: -2,
          marginBottom: 2
        }
      }}
    >
      <Tab.Screen
        name="More"
        component={ProfileScreen}
        options={{
          title: 'المزيد',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              iconName="ellipsis-horizontal-circle"
              outlineName="ellipsis-horizontal-circle-outline"
            />
          )
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={ScreenPlaceholder}
        initialParams={{
          title: 'المفضلة',
          description: 'ستظهر وجهاتك المفضلة هنا.'
        }}
        options={{
          title: 'المفضلة',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="heart" outlineName="heart-outline" />
          )
        }}
      />
      <Tab.Screen
        name="OffersTab"
        component={OffersScreen}
        options={{
          title: 'العروض',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="gift" outlineName="gift-outline" />
          )
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={ScreenPlaceholder}
        initialParams={{
          title: 'حجوزاتي',
          description: 'ستظهر حجوزاتك هنا قريباً.'
        }}
        options={{
          title: 'حجوزاتي',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="briefcase" outlineName="briefcase-outline" />
          )
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} iconName="home" outlineName="home-outline" />
          )
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    width: 48,
    position: 'relative'
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    width: 18,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary
  }
});

export default BottomTabs;
