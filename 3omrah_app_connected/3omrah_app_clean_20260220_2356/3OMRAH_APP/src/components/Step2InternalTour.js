import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';

const FormField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  editable = true,
  onPress,
  isDropdown = false,
  required = false
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.requiredAsterisk}> *</Text>}
    </Text>
    <TouchableOpacity 
      style={[styles.input, !editable && styles.inputDisabled]}
      onPress={onPress}
      disabled={!isDropdown}
      activeOpacity={isDropdown ? 0.7 : 1}
    >
      <TextInput
        style={[styles.inputText, !editable && styles.inputTextDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        keyboardType={keyboardType}
        editable={editable && !isDropdown}
        selectTextOnFocus={false}
      />
      {isDropdown && <MaterialCommunityIcons name="chevron-down" size={20} color={colors.gray400} />}
    </TouchableOpacity>
  </View>
);

const TabButton = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DayTourForm = ({ formData, onFormChange }) => (
  <View style={styles.tabContent}>
    <FormField
      label="اليوم"
      value={formData.day}
      onChangeText={(value) => onFormChange('dayTour', { ...formData, day: value })}
      placeholder="اختر اليوم"
      required
    />
    <FormField
      label="المدينة"
      value={formData.city}
      onChangeText={(value) => onFormChange('dayTour', { ...formData, city: value })}
      placeholder="مثال: الإسكندرية"
      required
    />
    <FormField
      label="عدد الأفراد"
      value={String(formData.numberOfPeople)}
      onChangeText={(value) => onFormChange('dayTour', { ...formData, numberOfPeople: Number(value) || 1 })}
      keyboardType="number-pad"
      placeholder="مثال: 2"
      required
    />
  </View>
);

const HoneymoonTourForm = ({ formData, onFormChange }) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      onFormChange('honeymoonTour', { 
        ...formData, 
        startDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      onFormChange('honeymoonTour', { 
        ...formData, 
        endDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  return (
    <View style={styles.tabContent}>
      <FormField
        label="عدد الأيام"
        value={String(formData.days)}
        onChangeText={(value) => onFormChange('honeymoonTour', { ...formData, days: Number(value) || 0 })}
        keyboardType="number-pad"
        placeholder="مثال: 7"
        required
      />
      <FormField
        label="تاريخ البداية"
        value={formData.startDate}
        onPress={() => setShowStartDatePicker(true)}
        isDropdown
        required
      />
      {showStartDatePicker && (
        <DateTimePicker
          value={new Date(formData.startDate || new Date())}
          mode="date"
          display="spinner"
          onChange={handleStartDateChange}
        />
      )}
      <FormField
        label="تاريخ النهاية"
        value={formData.endDate}
        onPress={() => setShowEndDatePicker(true)}
        isDropdown
        required
      />
      {showEndDatePicker && (
        <DateTimePicker
          value={new Date(formData.endDate || new Date())}
          mode="date"
          display="spinner"
          onChange={handleEndDateChange}
        />
      )}
      <FormField
        label="المدينة"
        value={formData.city}
        onChangeText={(value) => onFormChange('honeymoonTour', { ...formData, city: value })}
        placeholder="مثال: شرم الشيخ"
        required
      />
      <FormField
        label="الفندق"
        value={formData.hotel}
        onChangeText={(value) => onFormChange('honeymoonTour', { ...formData, hotel: value })}
        placeholder="اسم الفندق"
      />
    </View>
  );
};

const FamilyTourForm = ({ formData, onFormChange }) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      onFormChange('familyTour', { 
        ...formData, 
        startDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      onFormChange('familyTour', { 
        ...formData, 
        endDate: selectedDate.toISOString().split('T')[0] 
      });
    }
  };

  return (
    <View style={styles.tabContent}>
      <FormField
        label="عدد الأفراد"
        value={String(formData.numberOfPeople)}
        onChangeText={(value) => onFormChange('familyTour', { ...formData, numberOfPeople: Number(value) || 1 })}
        keyboardType="number-pad"
        placeholder="مثال: 4"
        required
      />
      <FormField
        label="عدد الأيام"
        value={String(formData.days)}
        onChangeText={(value) => onFormChange('familyTour', { ...formData, days: Number(value) || 0 })}
        keyboardType="number-pad"
        placeholder="مثال: 5"
        required
      />
      <FormField
        label="تاريخ البداية"
        value={formData.startDate}
        onPress={() => setShowStartDatePicker(true)}
        isDropdown
        required
      />
      {showStartDatePicker && (
        <DateTimePicker
          value={new Date(formData.startDate || new Date())}
          mode="date"
          display="spinner"
          onChange={handleStartDateChange}
        />
      )}
      <FormField
        label="تاريخ النهاية"
        value={formData.endDate}
        onPress={() => setShowEndDatePicker(true)}
        isDropdown
        required
      />
      {showEndDatePicker && (
        <DateTimePicker
          value={new Date(formData.endDate || new Date())}
          mode="date"
          display="spinner"
          onChange={handleEndDateChange}
        />
      )}
      <FormField
        label="المدينة"
        value={formData.city}
        onChangeText={(value) => onFormChange('familyTour', { ...formData, city: value })}
        placeholder="مثال: الغردقة"
        required
      />
    </View>
  );
};

const Step2InternalTour = ({ formData, onFormChange, activeTab, onTabChange }) => {
  const tabData = [
    { id: 'day', label: 'رحلة اليوم الواحد' },
    { id: 'honeymoon', label: 'شهر العسل' },
    { id: 'family', label: 'الرحلات العائلية' },
  ];

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>رحلات داخل مصر</Text>
        <Text style={styles.headerSubtitle}>اختر نوع الرحلة والمعلومات</Text>
      </View>

      <View style={styles.tabsContainer}>
        {tabData.map((tab) => (
          <TabButton
            key={tab.id}
            label={tab.label}
            isActive={activeTab === tab.id}
            onPress={() => onTabChange(tab.id)}
          />
        ))}
      </View>

      <View style={styles.formContainer}>
        {activeTab === 'day' && (
          <DayTourForm 
            formData={formData.dayTour} 
            onFormChange={onFormChange}
          />
        )}
        {activeTab === 'honeymoon' && (
          <HoneymoonTourForm 
            formData={formData.honeymoonTour} 
            onFormChange={onFormChange}
          />
        )}
        {activeTab === 'family' && (
          <FamilyTourForm 
            formData={formData.familyTour} 
            onFormChange={onFormChange}
          />
        )}
        <View style={styles.footerSpacer} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray600,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  tabContent: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  inputDisabled: {
    backgroundColor: colors.gray100,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  inputTextDisabled: {
    color: colors.gray500,
  },
  footerSpacer: {
    height: 80,
  },
});

export default Step2InternalTour;
