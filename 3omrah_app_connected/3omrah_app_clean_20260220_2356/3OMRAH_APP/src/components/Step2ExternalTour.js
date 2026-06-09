import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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

const Step2ExternalTour = ({ 
  formData, 
  onFormChange, 
  airports = [],
  airlines = [],
  loadingAirports = false,
  loadingAirlines = false,
}) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      onFormChange('travelStartDate', selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      onFormChange('travelEndDate', selectedDate.toISOString().split('T')[0]);
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>رحلات خارج مصر</Text>
        <Text style={styles.headerSubtitle}>ملء المعلومات المطلوبة</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Destination Country */}
        <FormField
          label="الوجهة (الدولة)"
          value={formData.destinationCountry}
          onChangeText={(value) => onFormChange('destinationCountry', value)}
          placeholder="مثال: الإمارات"
          required
        />

        {/* Destination City */}
        <FormField
          label="المدينة"
          value={formData.destinationCity}
          onChangeText={(value) => onFormChange('destinationCity', value)}
          placeholder="مثال: دبي"
          required
        />

        {/* Travel Days */}
        <FormField
          label="عدد الأيام"
          value={String(formData.days)}
          onChangeText={(value) => onFormChange('days', Number(value) || 0)}
          keyboardType="number-pad"
          placeholder="مثال: 10"
          required
        />

        {/* Travel Dates */}
        <FormField
          label="تاريخ البداية"
          value={formData.travelStartDate}
          onPress={() => setShowStartDatePicker(true)}
          isDropdown
          required
        />

        {showStartDatePicker && (
          <DateTimePicker
            value={new Date(formData.travelStartDate || new Date())}
            mode="date"
            display="spinner"
            onChange={handleStartDateChange}
          />
        )}

        <FormField
          label="تاريخ النهاية"
          value={formData.travelEndDate}
          onPress={() => setShowEndDatePicker(true)}
          isDropdown
          required
        />

        {showEndDatePicker && (
          <DateTimePicker
            value={new Date(formData.travelEndDate || new Date())}
            mode="date"
            display="spinner"
            onChange={handleEndDateChange}
          />
        )}

        {/* Airport Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            مطار المغادرة
            <Text style={styles.requiredAsterisk}> *</Text>
          </Text>
          {loadingAirports ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.airportList}
            >
              {airports.map((airport) => (
                <TouchableOpacity
                  key={airport._id}
                  style={[
                    styles.airportChip,
                    formData.airport === airport._id && styles.airportChipSelected,
                  ]}
                  onPress={() => onFormChange('airport', airport._id)}
                >
                  <Text
                    style={[
                      styles.airportChipText,
                      formData.airport === airport._id && styles.airportChipTextSelected,
                    ]}
                  >
                    {airport.code}
                  </Text>
                  <Text
                    style={[
                      styles.airportChipSubText,
                      formData.airport === airport._id && styles.airportChipSubTextSelected,
                    ]}
                  >
                    {airport.city}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Airline Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>
            شركة الطيران
            <Text style={styles.requiredAsterisk}> *</Text>
          </Text>
          {loadingAirlines ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.airlineList}
            >
              {airlines.map((airline) => (
                <TouchableOpacity
                  key={airline._id}
                  style={[
                    styles.airlineChip,
                    formData.airline === airline._id && styles.airlineChipSelected,
                  ]}
                  onPress={() => onFormChange('airline', airline._id)}
                >
                  <Text
                    style={[
                      styles.airlineChipText,
                      formData.airline === airline._id && styles.airlineChipTextSelected,
                    ]}
                  >
                    {airline.code}
                  </Text>
                  <Text
                    style={[
                      styles.airlineChipSubText,
                      formData.airline === airline._id && styles.airlineChipSubTextSelected,
                    ]}
                  >
                    {airline.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Number of People */}
        <FormField
          label="عدد الأفراد"
          value={String(formData.numberOfPeople)}
          onChangeText={(value) => onFormChange('numberOfPeople', Number(value) || 1)}
          keyboardType="number-pad"
          placeholder="مثال: 2"
          required
        />

        {/* Hotel (Optional) */}
        <FormField
          label="الفندق (اختياري)"
          value={formData.hotel}
          onChangeText={(value) => onFormChange('hotel', value)}
          placeholder="اسم الفندق"
        />

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
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  airportList: {
    height: 80,
  },
  airportChip: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  airportChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  airportChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  airportChipTextSelected: {
    color: colors.white,
  },
  airportChipSubText: {
    fontSize: 10,
    color: colors.gray600,
    marginTop: 2,
  },
  airportChipSubTextSelected: {
    color: colors.white,
  },
  airlineList: {
    height: 80,
  },
  airlineChip: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  airlineChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  airlineChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  airlineChipTextSelected: {
    color: colors.white,
  },
  airlineChipSubText: {
    fontSize: 10,
    color: colors.gray600,
    marginTop: 2,
  },
  airlineChipSubTextSelected: {
    color: colors.white,
  },
  footerSpacer: {
    height: 80,
  },
});

export default Step2ExternalTour;
