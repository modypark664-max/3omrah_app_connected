import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../theme/colors';

const ScreenPlaceholder = ({ route }) => {
  const title = route?.params?.title || 'قريباً';
  const description = route?.params?.description || 'هذه الشاشة قيد التطوير.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 24,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 8
  },
  description: {
    fontSize: 16,
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22
  }
});

export default ScreenPlaceholder;
