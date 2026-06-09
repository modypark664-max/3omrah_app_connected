import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import colors from '../theme/colors';

const TabIntroCard = ({
  eyebrow = 'rehlatty.com',
  title,
  description,
  emoji = '✨',
  accentColor = colors.secondary,
  style
}) => {
  if (!title) {
    return null;
  }

  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { borderColor: `${accentColor}33` }]}>
        <Text style={[styles.icon, { color: accentColor }]}>{emoji}</Text>
      </View>
      <View style={styles.texts}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#00000010',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5edf5'
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#f2f6fb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  icon: {
    fontSize: 24
  },
  texts: {
    flex: 1,
    alignItems: 'flex-end'
  },
  eyebrow: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    fontSize: 13,
    marginBottom: 4
  },
  title: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 20
  },
  description: {
    marginTop: 6,
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    lineHeight: 20,
    textAlign: 'right'
  }
});

export default TabIntroCard;
