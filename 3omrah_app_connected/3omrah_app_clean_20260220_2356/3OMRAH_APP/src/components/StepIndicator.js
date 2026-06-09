import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

const StepIndicator = ({ currentStep, totalSteps, stepTitles }) => {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <React.Fragment key={index}>
            <View
              style={[
                styles.step,
                index < currentStep && styles.stepCompleted,
                index === currentStep - 1 && styles.stepActive,
                index > currentStep && styles.stepInactive
              ]}
            >
              <Text style={[styles.stepNumber, index < currentStep && styles.stepNumberCompleted]}>
                {index < currentStep ? '✓' : index + 1}
              </Text>
            </View>

            {/* Connector line between steps */}
            {index < totalSteps - 1 && (
              <View
                style={[
                  styles.connector,
                  index < currentStep - 1 && styles.connectorCompleted
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Step titles */}
      <View style={styles.titlesContainer}>
        {stepTitles.map((title, index) => (
          <View key={index} style={[styles.titleWrapper, { flex: 1 }]}>
            <Text
              style={[
                styles.stepTitle,
                index === currentStep - 1 && styles.stepTitleActive
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: colors.background,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray200,
    borderWidth: 2,
    borderColor: colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepInactive: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray300,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray500,
  },
  stepNumberCompleted: {
    color: colors.white,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray300,
    marginHorizontal: -2,
  },
  connectorCompleted: {
    backgroundColor: colors.success,
  },
  titlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrapper: {
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 10,
    color: colors.gray600,
    textAlign: 'center',
    fontWeight: '400',
  },
  stepTitleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});

export default StepIndicator;
