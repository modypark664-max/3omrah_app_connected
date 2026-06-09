import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import StepIndicator from './StepIndicator';
import Step1BundleType from './Step1BundleType';
import Step2Umrah from './Step2Umrah';
import Step2InternalTour from './Step2InternalTour';
import Step2ExternalTour from './Step2ExternalTour';
import Step3Review from './Step3Review';
import { fetchAirports, fetchAirlines, submitBundleRequest } from '../services/api';

const STEP_TITLES = ['نوع الرحلة', 'تفاصيل الرحلة', 'مراجعة الطلب'];

const INITIAL_FORM_STATE = {
  // Step 1
  bundleType: '',
  
  // Step 2 - Umrah/Ramadan
  programType: 'economic',
  travelStartDate: '',
  travelEndDate: '',
  days: 0,
  airport: '',
  airline: '',
  numberOfPeople: 1,
  roomType: 'double',
  
  // Step 2 - Internal Tours
  activeTab: 'day',
  dayTour: {
    day: '',
    city: '',
    numberOfPeople: 1,
  },
  honeymoonTour: {
    days: 0,
    startDate: '',
    endDate: '',
    city: '',
    hotel: '',
  },
  familyTour: {
    numberOfPeople: 1,
    days: 0,
    startDate: '',
    endDate: '',
    city: '',
  },
  
  // Step 2 - External Tours
  destinationCountry: '',
  destinationCity: '',
  hotel: '',
};

const MultiStepBundleForm = () => {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [airports, setAirports] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [loadingAirports, setLoadingAirports] = useState(false);
  const [loadingAirlines, setLoadingAirlines] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAirportsAndAirlines = useCallback(async () => {
    try {
      setLoadingAirports(true);
      setLoadingAirlines(true);
      
      const [airportsData, airlinesData] = await Promise.all([
        fetchAirports(),
        fetchAirlines(),
      ]);
      
      setAirports(airportsData);
      setAirlines(airlinesData);
    } catch (error) {
      console.log('Error loading airports/airlines:', error.message);
      // Continue anyway - data can be loaded later if needed
    } finally {
      setLoadingAirports(false);
      setLoadingAirlines(false);
    }
  }, []);

  useEffect(() => {
    loadAirportsAndAirlines();
  }, [loadAirportsAndAirlines]);

  const handleFormChange = useCallback((key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleTypeSelect = useCallback((type) => {
    setFormData(prev => ({
      ...prev,
      bundleType: type,
    }));
  }, []);

  const handleTabChange = useCallback((tab) => {
    setFormData(prev => ({
      ...prev,
      activeTab: tab,
    }));
  }, []);

  const isStep1Valid = () => formData.bundleType !== '';

  const isStep2UmrahValid = () => {
    const { programType, travelStartDate, travelEndDate, days, airport, airline, numberOfPeople, roomType } = formData;
    return (
      programType &&
      travelStartDate &&
      travelEndDate &&
      days > 0 &&
      airport &&
      airline &&
      numberOfPeople > 0 &&
      roomType
    );
  };

  const isStep2InternalTourValid = () => {
    if (formData.activeTab === 'day') {
      const { day, city, numberOfPeople } = formData.dayTour;
      return day && city && numberOfPeople > 0;
    } else if (formData.activeTab === 'honeymoon') {
      const { days, startDate, endDate, city } = formData.honeymoonTour;
      return days > 0 && startDate && endDate && city;
    } else if (formData.activeTab === 'family') {
      const { numberOfPeople, days, startDate, endDate, city } = formData.familyTour;
      return numberOfPeople > 0 && days > 0 && startDate && endDate && city;
    }
    return false;
  };

  const isStep2ExternalTourValid = () => {
    const { destinationCountry, destinationCity, days, travelStartDate, travelEndDate, airport, airline, numberOfPeople } = formData;
    return (
      destinationCountry &&
      destinationCity &&
      days > 0 &&
      travelStartDate &&
      travelEndDate &&
      airport &&
      airline &&
      numberOfPeople > 0
    );
  };

  const isStep2Valid = () => {
    if (['omrah', 'ramadan'].includes(formData.bundleType)) {
      return isStep2UmrahValid();
    } else if (formData.bundleType === 'internal_tour') {
      return isStep2InternalTourValid();
    } else if (formData.bundleType === 'external_tour') {
      return isStep2ExternalTourValid();
    }
    return false;
  };

  const canGoNext = () => {
    if (currentStep === 1) return isStep1Valid();
    if (currentStep === 2) return isStep2Valid();
    return true;
  };

  const handleNext = () => {
    if (canGoNext()) {
      setCurrentStep(prev => Math.min(prev + 1, STEP_TITLES.length));
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleEditStep = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const result = await submitBundleRequest(formData);
      // Show success and reset form
      Alert.alert(
        'تم إرسال الطلب ✅',
        result.message || 'تم إرسال طلبك بنجاح! سيتواصل معك فريقنا قريباً.',
        [
          {
            text: 'حسناً',
            onPress: () => {
              setFormData(INITIAL_FORM_STATE);
              setCurrentStep(1);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      const msg = error?.message || 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.';
      // Handle unauthenticated
      if (error?.status === 401) {
        Alert.alert(
          'تسجيل الدخول مطلوب',
          'يجب تسجيل الدخول أولاً لإرسال طلب رحلة.',
          [{ text: 'حسناً' }]
        );
      } else {
        Alert.alert('خطأ', msg, [{ text: 'حسناً' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1BundleType
            selectedType={formData.bundleType}
            onTypeSelect={handleTypeSelect}
            onNext={handleNext}
          />
        );
      case 2:
        if (['omrah', 'ramadan'].includes(formData.bundleType)) {
          return (
            <Step2Umrah
              formData={formData}
              onFormChange={handleFormChange}
              airports={airports}
              airlines={airlines}
              loadingAirports={loadingAirports}
              loadingAirlines={loadingAirlines}
            />
          );
        } else if (formData.bundleType === 'internal_tour') {
          return (
            <Step2InternalTour
              formData={formData}
              onFormChange={handleFormChange}
              activeTab={formData.activeTab}
              onTabChange={handleTabChange}
            />
          );
        } else if (formData.bundleType === 'external_tour') {
          return (
            <Step2ExternalTour
              formData={formData}
              onFormChange={handleFormChange}
              airports={airports}
              airlines={airlines}
              loadingAirports={loadingAirports}
              loadingAirlines={loadingAirlines}
            />
          );
        }
        break;
      case 3:
        return (
          <Step3Review
            bundleType={formData.bundleType}
            formData={formData}
            airports={airports}
            airlines={airlines}
            onConfirm={handleConfirm}
            onEditStep={handleEditStep}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StepIndicator
        currentStep={currentStep}
        totalSteps={STEP_TITLES.length}
        stepTitles={STEP_TITLES}
      />

      {renderStep()}

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton, currentStep === 1 && styles.buttonDisabled]}
          onPress={handleBack}
          disabled={false}
        >
          <MaterialCommunityIcons
            name={currentStep === 1 ? 'close' : 'chevron-right'}
            size={20}
            color={colors.text}
          />
          <Text style={styles.buttonText}>{currentStep === 1 ? 'إغلاق' : 'رجوع'}</Text>
        </TouchableOpacity>

        {currentStep < STEP_TITLES.length ? (
          <TouchableOpacity
            style={[styles.button, styles.nextButton, !canGoNext() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextButtonText}>التالي</Text>
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={handleConfirm}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </Text>
            <MaterialCommunityIcons
              name="check"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  backButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  nextButton: {
    backgroundColor: colors.primary,
    flex: 1.2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default MultiStepBundleForm;
