import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '../theme/colors';

const SectionHeader = ({ title, description, actionLabel, onActionPress, style }) => (
  <View style={[styles.container, style]}>
    <View style={styles.texts}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
    {actionLabel ? (
      <Pressable accessibilityRole="button" onPress={onActionPress} style={styles.actionButton}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

export default SectionHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  texts: {
    flex: 1,
    marginHorizontal: 8
  },
  title: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right'
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular',
    textAlign: 'right'
  },
  actionButton: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start'
  },
  actionText: {
    color: colors.white,
    fontFamily: 'Tajawal_500Medium',
    fontSize: 14,
    textAlign: 'right'
  }
});
