import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../theme/colors';

const UMRAH_IMG = require('../../assets/عمره وحج.webp');
const INTERNAL_IMG = require('../../assets/رحلات داخليه.webp');
const EXTERNAL_IMG = require('../../assets/رحلات خارجيه.webp');
const RAMADAN_IMG = require('../../assets/hero.webp');

const TourTypeOption = ({ 
  title, 
  description, 
  icon, 
  image,
  isSelected, 
  onPress 
}) => (
  <TouchableOpacity
    style={[styles.card, isSelected && styles.cardSelected]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    {/* Background Image */}
    {image && (
      <Image
        source={image}
        style={styles.cardBgImage}
        resizeMode="cover"
      />
    )}
    
    {/* Dark Gradient Overlay */}
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.75)']}
      style={styles.cardGradient}
    />

    {isSelected && (
      <View style={styles.checkmark}>
        <MaterialCommunityIcons name="check-circle" size={26} color={colors.success || '#10B981'} />
      </View>
    )}

    <View style={styles.cardContent}>
      <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
        <MaterialCommunityIcons
          name={icon}
          size={28}
          color={colors.white}
        />
      </View>
      <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
        {title}
      </Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const Step1BundleType = ({ selectedType, onTypeSelect, onNext }) => {
  const tourTypes = [
    {
      id: 'omrah',
      title: 'عمرة',
      description: 'عمرة عادية في أي وقت من السنة',
      icon: 'kaaba',
      image: UMRAH_IMG,
    },
    {
      id: 'ramadan',
      title: 'عمرة رمضان',
      description: 'عمرة في شهر رمضان المبارك',
      icon: 'crescent-moon',
      image: RAMADAN_IMG,
    },
    {
      id: 'internal_tour',
      title: 'رحلات داخل مصر',
      description: 'اكتشف جمال مصر من الداخل',
      icon: 'map-marker',
      image: INTERNAL_IMG,
    },
    {
      id: 'external_tour',
      title: 'رحلات خارج مصر',
      description: 'رحلات سياحية إلى دول أخرى',
      icon: 'passport',
      image: EXTERNAL_IMG,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>اختر نوع رحلتك</Text>
        <Text style={styles.headerSubtitle}>
          اختر الخيار الذي يناسبك للبدء بالحجز
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {tourTypes.map((type) => (
          <TourTypeOption
            key={type.id}
            title={type.title}
            description={type.description}
            icon={type.icon}
            image={type.image}
            isSelected={selectedType === type.id}
            onPress={() => onTypeSelect(type.id)}
          />
        ))}
      </View>

      <View style={styles.footerSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: colors.primary,
    paddingTop: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.8,
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray200,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: colors.primary,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'right',
  },
  cardTitleSelected: {
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
    textAlign: 'right',
  },
  checkmark: {
    marginRight: 12,
    zIndex: 2,
  },
  footerSpacer: {
    height: 80,
  },
});

export default Step1BundleType;
