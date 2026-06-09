import React, { useContext, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const appLogo = require('../../assets/app-icon.png');
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthContext from '../context/AuthContext';
import colors from '../theme/colors';
import { signupUser } from '../services/api';

const phonePattern = /^[0-9]{11}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const SignupScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [form, setForm] = useState({
    username: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field, value) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const unmetRequirements = [
    { label: '٨ أحرف على الأقل', met: form.password.length >= 8 },
    { label: 'حرف كبير', met: /[A-Z]/.test(form.password) },
    { label: 'حرف صغير', met: /[a-z]/.test(form.password) },
    { label: 'رقم', met: /\d/.test(form.password) },
    { label: 'رمز خاص (!@#)', met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.password) }
  ];

  const handleSubmit = async () => {
    if (!form.username.trim()) {
      setError('الاسم الكامل مطلوب.');
      return;
    }
    if (!phonePattern.test(form.phoneNumber)) {
      setError('رقم الهاتف يجب أن يكون 11 رقمًا (01xxxxxxxxx).');
      return;
    }
    if (!passwordPattern.test(form.password)) {
      setError('كلمة المرور يجب أن تلتزم بجميع الشروط الموضحة.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('تأكيد كلمة المرور غير متطابق.');
      return;
    }

    setLoading(true);
    try {
      await signupUser({
        username: form.username.trim(),
        phoneNumber: form.phoneNumber,
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      signIn();
    } catch (apiError) {
      setError(apiError.message || 'تعذر إنشاء الحساب، حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#eef0ff', '#f5f6ff']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.select({ ios: 32, android: 0 })}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.decorTop} />
            <View style={styles.decorBottom} />

            <View style={styles.logoCard}>
              <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
              <Text style={styles.logoTitle}>Rehlatty</Text>
              <Text style={styles.logoSubtitle}>انضم إلينا وابدأ رحلتك بأمان وراحة.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formHeading}>إنشاء حساب جديد</Text>
              <Text style={styles.formSubheading}>املأ البيانات التالية تمامًا كما في البوابة الإلكترونية.</Text>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>الاسم الكامل</Text>
                <TextInput
                  placeholder="مثال: أحمد علي"
                  placeholderTextColor="#96a6b5"
                  style={styles.input}
                  value={form.username}
                  onChangeText={(text) => updateField('username', text)}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>رقم الهاتف</Text>
                <TextInput
                  placeholder="01xxxxxxxxx"
                  placeholderTextColor="#96a6b5"
                  keyboardType="phone-pad"
                  style={styles.input}
                  maxLength={11}
                  value={form.phoneNumber}
                  onChangeText={(text) => updateField('phoneNumber', text.replace(/\D/g, ''))}
                />
                <Text style={styles.helperText}>سيُستخدم هذا الرقم لتسجيل الدخول وتتبع رحلتك.</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#96a6b5"
                    secureTextEntry={!showPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={form.password}
                    onChangeText={(text) => updateField('password', text)}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'أخفِ كلمة المرور' : 'أظهر كلمة المرور'}
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.passwordField}>
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#96a6b5"
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, styles.passwordInput]}
                    value={form.confirmPassword}
                    onChangeText={(text) => updateField('confirmPassword', text)}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'أخفِ كلمة المرور' : 'أظهر كلمة المرور'}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>شروط كلمة المرور</Text>
                {unmetRequirements.map((req) => (
                  <Text
                    key={req.label}
                    style={[styles.requirementItem, req.met && styles.requirementMet]}
                  >
                    {req.met ? '✓' : '•'} {req.label}
                  </Text>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>{loading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب'}</Text>
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>لديك حساب؟</Text>
                <TouchableOpacity onPress={() => navigation.replace('Login')}>
                  <Text style={styles.switchLink}>تسجيل الدخول</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    padding: 20,
    paddingBottom: 180
  },
  decorTop: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -60,
    right: -40,
    backgroundColor: '#818cf822'
  },
  decorBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    bottom: -70,
    left: -50,
    backgroundColor: '#5D5FEF15'
  },
  logoCard: {
    backgroundColor: '#ffffffdd',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e4f0'
  },
  logoIcon: {
    fontSize: 46,
    marginBottom: 8
  },
  logoImage: {
    width: 110,
    height: 110,
    marginBottom: 10
  },
  logoTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 20,
    color: colors.primary
  },
  logoSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center'
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 24,
    shadowColor: '#0000001a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e4f0'
  },
  formHeading: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 26,
    color: colors.primary,
    marginBottom: 4
  },
  formSubheading: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginBottom: 18
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  errorText: {
    color: '#b91c1c',
    fontFamily: 'Tajawal_500Medium'
  },
  formGroup: {
    marginBottom: 18
  },
  label: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Tajawal_400Regular',
    fontSize: 15,
    color: colors.primary,
    backgroundColor: colors.surfaceAlt
  },
  helperText: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 12,
    color: colors.muted,
    marginTop: 6
  },
  passwordField: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1
  },
  eyeButton: {
    marginLeft: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  requirementsCard: {
    backgroundColor: '#f0f0ff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    marginBottom: 16
  },
  requirementsTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 8
  },
  requirementItem: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginBottom: 4
  },
  requirementMet: {
    color: colors.success
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#fff',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 17
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20
  },
  switchLabel: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted
  },
  switchLink: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginLeft: 4
  }
});

export default SignupScreen;
