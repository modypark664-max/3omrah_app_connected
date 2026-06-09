import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AuthContext from '../context/AuthContext';
import colors from '../theme/colors';
import {
  changePassword,
  deleteAccount,
  fetchProfileOverview,
  logoutUser,
  toggleFavorite,
  uploadProfileImage
} from '../services/api';
import { API_BASE_URL, PRIVACY_POLICY_URL } from '../config/env';

const typeLabelMap = {
  omrah: 'باقة عمرة',
  internal_tour: 'رحلة داخلية',
  external_tour: 'رحلة خارجية',
  ramadan: 'رحلة رمضانية',
  '7ag': 'حج'
};

const paymentStatusColors = {
  pending: { backgroundColor: '#fef3c7', color: '#92400e', label: 'في انتظار الدفع' },
  paid: { backgroundColor: '#d1fae5', color: '#065f46', label: 'مدفوع' },
  cancelled: { backgroundColor: '#fee2e2', color: '#991b1b', label: 'ملغي' }
};

const partnerStatusColors = {
  pending: { backgroundColor: '#e0f2fe', color: '#075985', label: 'في انتظار موافقة الشريك' },
  confirmed: { backgroundColor: '#dcfce7', color: '#166534', label: 'مؤكد من الشريك' },
  rejected: { backgroundColor: '#fee2e2', color: '#991b1b', label: 'مرفوض من الشريك' }
};

const formatDate = (value) => {
  if (!value) return 'غير متوفر';
  try {
    return new Date(value).toLocaleDateString('ar-EG');
  } catch (_error) {
    return 'غير متوفر';
  }
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'غير متوفر';
  try {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(amount);
  } catch (_error) {
    return `${amount.toLocaleString('ar-EG')} ج.م`;
  }
};

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { signOut } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ password: '', reason: '' });
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [favoriteProcessingId, setFavoriteProcessingId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfile = useCallback(async (withSpinner = false) => {
    if (withSpinner) {
      setLoading(true);
    }
    setError('');
    try {
      const data = await fetchProfileOverview();
      setProfile(data);
    } catch (apiError) {
      console.error('Failed to load profile', apiError);
      const unauthorized = apiError?.status === 401 || apiError?.status === 403;
      setError(
        unauthorized
          ? 'انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مرة أخرى.'
          : apiError?.message || 'تعذر تحميل بيانات الملف الشخصي.'
      );

      if (unauthorized) {
        setTimeout(() => {
          signOut();
        }, 350);
      }
    } finally {
      if (withSpinner) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [signOut]);

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile(false);
    }, [loadProfile])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile(false);
  }, [loadProfile]);

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteFormChange = (field, value) => {
    setDeleteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('تنبيه', 'جميع الحقول مطلوبة.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('تنبيه', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('تنبيه', 'كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changePassword(passwordForm);
      Alert.alert('تم', 'تم تغيير كلمة المرور بنجاح.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordModalVisible(false);
    } catch (apiError) {
      Alert.alert('خطأ', apiError?.message || 'تعذر تغيير كلمة المرور.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const executeDeleteAccount = async () => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    try {
      const password = deleteForm.password?.trim() || '';
      const reason = deleteForm.reason?.trim() || '';
      await deleteAccount({
        password,
        reason: reason || undefined
      });
      setDeleteModalVisible(false);
      setDeleteForm({ password: '', reason: '' });
      Alert.alert('تم حذف الحساب', 'تم حذف حسابك وجميع بياناتك بنجاح.', [
        {
          text: 'حسناً',
          onPress: () => signOut()
        }
      ]);
    } catch (apiError) {
      if (apiError?.status === 401) {
        Alert.alert('انتهت الجلسة', 'يرجى تسجيل الدخول مرة أخرى.');
        signOut();
      } else {
        Alert.alert('خطأ', apiError?.message || 'تعذر حذف الحساب حالياً.');
      }
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmDeleteAccount = () => {
    if (deletingAccount) return;
    if (!deleteForm.password?.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور لتأكيد حذف الحساب.');
      return;
    }

    Alert.alert(
      'تأكيد حذف الحساب',
      'سيتم حذف حسابك وجميع بياناتك بشكل نهائي ولا يمكن التراجع. هل ترغب في المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'نعم، حذف الحساب', style: 'destructive', onPress: executeDeleteAccount }
      ]
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('الإذن مطلوب', 'يرجى منح صلاحية الوصول إلى الصور لتحديث صورة الملف الشخصي.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (!asset) {
      return;
    }

    setUploadingImage(true);
    try {
      await uploadProfileImage({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', name: asset.fileName });
      await loadProfile(false);
      Alert.alert('تم', 'تم تحديث صورة الملف الشخصي.');
    } catch (apiError) {
      Alert.alert('خطأ', apiError?.message || 'تعذر رفع الصورة، حاول مرة أخرى.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFavoriteToggle = async (cardId) => {
    setFavoriteProcessingId(cardId);
    try {
      await toggleFavorite(cardId);
      await loadProfile(false);
    } catch (apiError) {
      Alert.alert('خطأ', apiError?.message || 'تعذر تحديث قائمة المفضلات.');
    } finally {
      setFavoriteProcessingId(null);
    }
  };

  const handleReservationPress = useCallback(
    (reservation) => {
      if (!reservation) {
        return;
      }
      const reservationIdentifier = reservation.reservationNumber || reservation.id;
      if (!reservationIdentifier) {
        Alert.alert('لا يمكن فتح الحجز', 'بيانات الحجز غير مكتملة حالياً.');
        return;
      }

      const sanitizedBase = API_BASE_URL?.replace(/\/$/, '') || '';
      const fallbackPaymentUrl = `${sanitizedBase}/payment/${reservation.id || reservationIdentifier}`;
      const params = {
        reservationId: reservationIdentifier,
        fallbackPaymentUrl
      };

      navigation.navigate('Bundles', {
        screen: 'BundlePayment',
        params
      });
    },
    [navigation]
  );

  const confirmLogout = () => {
    const performLogout = async () => {
      setLoggingOut(true);
      try {
        await logoutUser();
        signOut();
      } catch (apiError) {
        if (Platform.OS === 'web') {
          alert(apiError?.message || 'تعذر تسجيل الخروج حالياً.');
        } else {
          Alert.alert('خطأ', apiError?.message || 'تعذر تسجيل الخروج حالياً.');
        }
      } finally {
        setLoggingOut(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
      if (confirm) {
        performLogout();
      }
    } else {
      Alert.alert('تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد',
          style: 'destructive',
          onPress: performLogout
        }
      ]);
    }
  };

  const stats = profile?.stats || { totalReservations: 0, totalPaid: 0, favoritesCount: profile?.favorites?.length || 0 };
  const user = profile?.user || {};
  const reservations = profile?.reservations || [];
  const favorites = profile?.favorites || [];

  const quickLinks = useMemo(() => {
    const links = [
      { label: 'المقارنة', icon: '⚖️', route: 'Compare' },
      { label: 'تواصل معنا', icon: '📞', route: 'Contact' }
    ];

    if (user.role === 'admin') {
      links.push({ label: 'لوحة التحكم', icon: '⚙️', route: 'AdminDashboard' });
    }

    return links;
  }, [user.role]);

  const privacyPolicyLink = useMemo(() => {
    let url = '';
    const configured = PRIVACY_POLICY_URL || '';
    if (/^https?:\/\//i.test(configured)) {
      url = configured;
    } else {
      const base = (API_BASE_URL || '').replace(/\/$/, '');
      if (!configured) {
        url = `${base}/privacy`;
      } else {
        const normalized = configured.startsWith('/') ? configured : `/${configured}`;
        url = `${base}${normalized}`;
      }
    }
    return url + (url.includes('?') ? '&' : '?') + 'hideNav=true';
  }, []);

  const handleOpenPrivacyPolicy = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(privacyPolicyLink);
      if (!supported) {
        throw new Error('unsupported');
      }
      await Linking.openURL(privacyPolicyLink);
    } catch (error) {
      console.warn('Failed opening privacy policy', error);
      Alert.alert('تعذر فتح الرابط', 'يمكنك زيارة https://www.rhalatumrah.com/privacy لقراءة سياسة الخصوصية.');
    }
  }, [privacyPolicyLink]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>جارٍ تحميل الملف الشخصي...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadProfile(true)}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickImage} activeOpacity={0.85}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.placeholderAvatarText}>{(user.username || 'ع').slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.avatarOverlay}>
              {uploadingImage ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.avatarOverlayText}>تغيير الصورة</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>مرحباً، {user.username}</Text>
            <Text style={styles.userPhone}>{user.phoneNumber}</Text>
            <Text style={styles.userRole}>{user.role === 'admin' ? 'مدير' : user.role === 'partner' ? 'شريك' : 'عميل'}</Text>
            <Text style={styles.userSince}>عضو منذ {formatDate(user.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="إجمالي الحجوزات" value={`${stats.totalReservations ?? 0} حجز`} icon="📋" />
          <StatCard label="المدفوعات" value={`${stats.totalPaid ?? 0} مدفوع`} icon="💳" />
          <StatCard label="المفضلة" value={`${stats.favoritesCount ?? favorites.length} باقة`} icon="❤️" />
          <StatCard label="عضو منذ" value={formatDate(user.createdAt)} icon="🕐" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>معلومات الحساب</Text>
          <InfoRow label="الاسم:" value={user.username} />
          <InfoRow label="رقم الهاتف:" value={user.phoneNumber} />
          <InfoRow label="نوع الحساب:" value={user.role === 'admin' ? 'مدير' : user.role === 'partner' ? 'شريك' : 'عميل'} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>روابط سريعة</Text>
          <View style={styles.linksGrid}>
            {quickLinks.map((link) => (
              <TouchableOpacity
                key={link.label}
                style={styles.linkItem}
                activeOpacity={0.85}
                onPress={() => {
                  if (link.route === 'AdminDashboard') {
                    Alert.alert('تنبيه', 'يمكنك الوصول إلى لوحة التحكم من الموقع مباشرة.');
                    return;
                  }
                  if (link.route === 'Bundles') {
                    navigation.navigate('Bundles', { screen: 'BundlesOverview' });
                    return;
                  }
                  navigation.navigate(link.route);
                }}
              >
                <Text style={styles.linkIcon}>{link.icon}</Text>
                <Text style={styles.linkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>المراجع والسياسات</Text>
          <TouchableOpacity style={styles.legalLink} onPress={handleOpenPrivacyPolicy}>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.legalLinkLabel}>سياسة الخصوصية وشروط الاستخدام</Text>
              <Text style={styles.legalLinkMeta}>تعرف على كيفية جمع بياناتك، استخداماتها، وحقوقك في إلغاء أو حذف البيانات.</Text>
            </View>
            <Text style={styles.legalLinkIcon}>↗︎</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>حجوزاتي</Text>
          {reservations.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد حجوزات بعد.</Text>
          ) : (
            reservations.map((reservation) => (
              <TouchableOpacity
                key={reservation.id}
                style={styles.reservationCard}
                activeOpacity={0.9}
                onPress={() => handleReservationPress(reservation)}
              >
                <Text style={styles.reservationTitle}>
                  {reservation.card?.code || reservation.reservationNumber} · {typeLabelMap[reservation.card?.type] || 'عرض'}
                </Text>
                <Text style={styles.reservationMeta}>رقم الحجز: {reservation.reservationNumber}</Text>
                <Text style={styles.reservationMeta}>عدد الأشخاص: {reservation.peopleCount}</Text>
                <Text style={styles.reservationMeta}>المبلغ: {formatCurrency(reservation.totalAmount)}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge config={paymentStatusColors[reservation.paymentStatus] || paymentStatusColors.pending} />
                  <StatusBadge config={partnerStatusColors[reservation.partnerStatus] || partnerStatusColors.pending} />
                </View>
                {reservation.partnerNotes ? (
                  <View style={styles.partnerNotes}>
                    <Text style={styles.partnerNotesLabel}>ملاحظات الشريك:</Text>
                    <Text style={styles.partnerNotesText}>{reservation.partnerNotes}</Text>
                  </View>
                ) : null}
                <Text style={styles.reservationHint}>اضغط لعرض تفاصيل الدفع</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>الباقات المفضلة</Text>
          {favorites.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد باقات مفضلة بعد.</Text>
          ) : (
            favorites.map((favorite) => (
              <View key={favorite.id} style={styles.favoriteRow}>
                <View style={styles.favoriteInfo}>
                  <Text style={styles.favoriteTitle}>{favorite.code}</Text>
                  <Text style={styles.favoriteMeta}>
                    {typeLabelMap[favorite.type] || 'عرض'} · {favorite.days} يوم
                  </Text>
                  <Text style={styles.favoritePrice}>من {formatCurrency(favorite.lowestPrice)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeFavorite}
                  onPress={() => handleFavoriteToggle(favorite.id)}
                  disabled={favoriteProcessingId === favorite.id}
                >
                  <Text style={styles.removeFavoriteText}>
                    {favoriteProcessingId === favorite.id ? 'جاري...' : 'إزالة'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>إعدادات الحساب</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => setPasswordModalVisible(true)}>
            <Text style={styles.settingLabel}>🔐 تغيير كلمة المرور</Text>
            <Text style={styles.settingArrow}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, styles.deleteItem]}
            onPress={() => {
              setDeleteForm({ password: '', reason: '' });
              setDeleteModalVisible(true);
            }}
          >
            <Text style={[styles.settingLabel, styles.deleteLabel]}>🗑️ حذف الحساب نهائياً</Text>
            <Text style={[styles.settingArrow, styles.deleteLabel]}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={confirmLogout} disabled={loggingOut}>
            <Text style={[styles.settingLabel, styles.logoutLabel]}>{loggingOut ? 'جارٍ تسجيل الخروج...' : '🚪 تسجيل الخروج'}</Text>
            <Text style={[styles.settingArrow, styles.logoutLabel]}>←</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Account Settings Modals - Placed at root level to ensure touch responsiveness and clickability */}
      <Modal visible={passwordModalVisible} transparent animationType="fade" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تغيير كلمة المرور</Text>
            <TextInput
              secureTextEntry
              placeholder="كلمة المرور الحالية"
              placeholderTextColor="#9ba5b1"
              style={styles.input}
              value={passwordForm.currentPassword}
              onChangeText={(text) => handlePasswordChange('currentPassword', text)}
            />
            <TextInput
              secureTextEntry
              placeholder="كلمة المرور الجديدة"
              placeholderTextColor="#9ba5b1"
              style={styles.input}
              value={passwordForm.newPassword}
              onChangeText={(text) => handlePasswordChange('newPassword', text)}
            />
            <TextInput
              secureTextEntry
              placeholder="تأكيد كلمة المرور الجديدة"
              placeholderTextColor="#9ba5b1"
              style={styles.input}
              value={passwordForm.confirmPassword}
              onChangeText={(text) => handlePasswordChange('confirmPassword', text)}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnSecondary]} 
                onPress={() => setPasswordModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, passwordSubmitting && styles.btnDisabled]}
                onPress={handlePasswordSubmit}
                disabled={passwordSubmitting}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnText, styles.btnPrimaryText]}>
                  {passwordSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>حذف الحساب نهائياً</Text>
            <View style={styles.deleteWarningBox}>
              <Text style={styles.deleteWarning}>سيتم حذف جميع حجوزاتك، المفضلة وسجل المحادثة.</Text>
              <Text style={styles.deleteDescription}>لا يمكن التراجع عن هذا الإجراء وفق سياسة الخصوصية.</Text>
            </View>
            <TextInput
              secureTextEntry
              placeholder="أدخل كلمة المرور للتأكيد"
              placeholderTextColor="#9ba5b1"
              style={styles.input}
              value={deleteForm.password}
              onChangeText={(text) => handleDeleteFormChange('password', text)}
            />
            <TextInput
              multiline
              numberOfLines={4}
              placeholder="سبب الحذف (اختياري)"
              placeholderTextColor="#9ba5b1"
              style={[styles.input, styles.textArea]}
              value={deleteForm.reason}
              onChangeText={(text) => handleDeleteFormChange('reason', text)}
              textAlignVertical="top"
            />
            <Text style={styles.deleteHint}>سيتم تسجيل خروجك فور إتمام العملية ولا يمكن استعادة البيانات لاحقاً.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, deletingAccount && styles.btnDisabled]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                <Text style={[styles.btnText, styles.btnDangerText]}>
                  {deletingAccount ? 'جارٍ الحذف...' : 'حذف الحساب'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const StatCard = ({ label, value, icon }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const StatusBadge = ({ config }) => (
  <View style={[styles.statusBadge, { backgroundColor: config?.backgroundColor || '#f1f5f9' }] }>
    <Text style={[styles.statusBadgeText, { color: config?.color || colors.primary }]}>{config?.label || 'غير محدد'}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    backgroundColor: colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: colors.primary,
    fontFamily: 'Tajawal_500Medium'
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca'
  },
  errorText: {
    color: colors.danger,
    marginBottom: 10,
    fontFamily: 'Tajawal_500Medium'
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#fff'
  },
  retryText: {
    color: colors.primary,
    fontFamily: 'Tajawal_500Medium'
  },
  profileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    shadowColor: '#011',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  avatarWrap: {
    marginLeft: 16,
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden'
  },
  avatar: {
    width: '100%',
    height: '100%'
  },
  placeholderAvatar: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderAvatarText: {
    fontSize: 32,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarOverlayText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Tajawal_500Medium'
  },
  userInfo: {
    flex: 1,
    alignItems: 'flex-end'
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
  },
  userPhone: {
    marginTop: 6,
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  userRole: {
    marginTop: 4,
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary
  },
  userSince: {
    marginTop: 6,
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    fontSize: 12
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#0000000d',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 6
  },
  statValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 16
  },
  statLabel: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 4
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0000000d',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1
  },
  sectionTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary,
    marginBottom: 14,
    textAlign: 'right'
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  infoLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  infoValue: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
  },
  linksGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10
  },
  linkItem: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  linkIcon: {
    fontSize: 20
  },
  linkText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  legalLink: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd'
  },
  legalLinkLabel: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 14,
    textAlign: 'right'
  },
  legalLinkMeta: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    textAlign: 'right',
    marginTop: 2,
    fontSize: 12
  },
  legalLinkIcon: {
    fontSize: 22,
    color: colors.secondary,
    marginLeft: 8
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontFamily: 'Tajawal_400Regular'
  },
  reservationCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fdfdfd'
  },
  reservationTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 6
  },
  reservationMeta: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginBottom: 4
  },
  reservationHint: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 8
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusBadgeText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12
  },
  partnerNotes: {
    marginTop: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 10
  },
  partnerNotesLabel: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    marginBottom: 4
  },
  partnerNotesText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted
  },
  favoriteRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  favoriteInfo: {
    flex: 1,
    alignItems: 'flex-end'
  },
  favoriteTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary
  },
  favoriteMeta: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    marginTop: 2
  },
  favoritePrice: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary,
    marginTop: 4
  },
  removeFavorite: {
    marginRight: 12
  },
  removeFavoriteText: {
    color: colors.danger,
    fontFamily: 'Tajawal_500Medium'
  },
  settingItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  settingLabel: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  settingArrow: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted
  },
  deleteItem: {
    borderBottomColor: '#fee2e2'
  },
  deleteLabel: {
    color: colors.danger
  },
  logoutItem: {
    borderBottomWidth: 0
  },
  logoutLabel: {
    color: colors.danger
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18
  },
  modalTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 16
  },
  deleteWarningBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  deleteWarning: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.danger,
    marginBottom: 4,
    textAlign: 'right'
  },
  deleteDescription: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    textAlign: 'right',
    fontFamily: 'Tajawal_500Medium'
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  deleteHint: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.muted,
    textAlign: 'right',
    marginBottom: 14
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start'
  },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginLeft: 10
  },
  btnSecondary: {
    backgroundColor: '#f8fafc'
  },
  btnPrimary: {
    backgroundColor: colors.primary
  },
  btnDanger: {
    backgroundColor: colors.danger
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnText: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.primary
  },
  btnPrimaryText: {
    color: '#fff'
  },
  btnDangerText: {
    color: '#fff'
  }
});

export default ProfileScreen;
