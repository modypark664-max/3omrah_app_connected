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
import { loginUser } from '../services/api';

const phonePattern = /^[0-9]{11}$/;

const LoginScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [form, setForm] = useState({ phoneNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field, value) => {
    setError('');
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!phonePattern.test(form.phoneNumber)) {
      setError('رقم الهاتف يجب أن يكون 11 رقمًا (مثال: 01xxxxxxxxx).');
      return;
    }
    if (!form.password) {
      setError('كلمة المرور مطلوبة.');
      return;
    }

    setLoading(true);
    try {
      await loginUser({ phoneNumber: form.phoneNumber, password: form.password });
      signIn();
    } catch (apiError) {
      setError(apiError.message || 'تعذر تسجيل الدخول، حاول مجددًا.');
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
              <Text style={styles.logoSubtitle}>سجل دخولك لإكمال رحلتك معنا.</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formHeading}>تسجيل الدخول</Text>
              <Text style={styles.formSubheading}>أدخل رقم هاتفك المسجل وكلمة المرور للمتابعة.</Text>

              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

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
                <Text style={styles.helperText}>يجب أن يكون الرقم 11 رقمًا مطابقًا للبوابة الرسمية.</Text>
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

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>{loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}</Text>
              </TouchableOpacity>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>ليس لديك حساب؟</Text>
                <TouchableOpacity onPress={() => navigation.replace('Signup')}>
                  <Text style={styles.switchLink}>إنشاء حساب جديد</Text>
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
    paddingBottom: 160
  },
  decorTop: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -40,
    right: -30,
    backgroundColor: '#818cf822'
  },
  decorBottom: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -60,
    left: -40,
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
    fontSize: 42,
    marginBottom: 8
  },
  logoImage: {
    width: 100,
    height: 100,
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
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8
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

export default LoginScreen;
