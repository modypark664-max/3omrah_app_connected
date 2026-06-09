import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';

const ReviewSection = ({ title, data, icon }) => {
  if (!data || Object.values(data).every(val => !val)) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {Object.entries(data).map(([key, value]) => {
          if (!value) return null;
          
          // Format the key to be human-readable
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();

          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{formattedKey}</Text>
              <Text style={styles.reviewValue}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const Step3Review = ({ 
  bundleType, 
  formData, 
  airports = [],
  airlines = [],
  onConfirm, 
  onEditStep,
  loading = false 
}) => {
  const getTourTypeLabel = () => {
    const types = {
      omrah: 'عمرة',
      ramadan: 'عمرة رمضان',
      internal_tour: 'رحلات داخل مصر',
      external_tour: 'رحلات خارج مصر',
    };
    return types[bundleType] || bundleType;
  };

  const getAirportLabel = (id) => {
    if (!id) return '';
    const found = airports.find(a => a._id === id);
    return found ? `${found.code} - ${found.city}` : id;
  };

  const getAirlineLabel = (id) => {
    if (!id) return '';
    const found = airlines.find(a => a._id === id);
    return found ? found.name : id;
  };

  const roomTypeLabels = {
    single: 'فردي', double: 'ثنائي', triple: 'ثلاثي', quad: 'رباعي', family: 'خماسي'
  };
  const programTypeLabels = { economic: 'اقتصادي', premium: 'مميز', luxury: 'فاخر' };
  const tabLabels = { day: 'رحلة اليوم الواحد', honeymoon: 'شهر العسل', family: 'الرحلات العائلية' };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مراجعة طلبك</Text>
        <Text style={styles.headerSubtitle}>تحقق من جميع المعلومات قبل الإرسال</Text>
      </View>

      {/* Tour Type Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <MaterialCommunityIcons 
            name="check-circle" 
            size={28} 
            color={colors.success} 
            style={styles.summaryIcon}
          />
          <Text style={styles.summaryText}>
            نوع الرحلة: <Text style={styles.summaryHighlight}>{getTourTypeLabel()}</Text>
          </Text>
        </View>
      </View>

      {/* Review Sections based on tour type */}
      {['omrah', 'ramadan'].includes(bundleType) && (
        <>
          <ReviewSection
            title="معلومات البرنامج"
            icon="package"
            data={{
              'نوع البرنامج': programTypeLabels[formData.programType] || formData.programType,
              'تاريخ البداية': formData.travelStartDate,
              'تاريخ النهاية': formData.travelEndDate,
              'عدد الأيام': formData.days,
            }}
          />
          <ReviewSection
            title="معلومات الطيران"
            icon="airplane"
            data={{
              'المطار': getAirportLabel(formData.airport),
              'شركة الطيران': getAirlineLabel(formData.airline),
            }}
          />
          <ReviewSection
            title="معلومات الإقامة"
            icon="hotel"
            data={{
              'عدد الأفراد': formData.numberOfPeople,
              'نوع الغرفة': roomTypeLabels[formData.roomType] || formData.roomType,
            }}
          />
        </>
      )}

      {bundleType === 'internal_tour' && (
        <>
          <ReviewSection
            title="معلومات الرحلة"
            icon="map-marker"
            data={{
              'نوع الرحلة': tabLabels[formData.activeTab] || formData.activeTab,
            }}
          />
          {formData.activeTab === 'day' && (
            <ReviewSection
              title="تفاصيل الرحلة"
              icon="information"
              data={{
                'اليوم': formData.dayTour?.day,
                'المدينة': formData.dayTour?.city,
                'عدد الأفراد': formData.dayTour?.numberOfPeople,
              }}
            />
          )}
          {formData.activeTab === 'honeymoon' && (
            <ReviewSection
              title="تفاصيل شهر العسل"
              icon="heart"
              data={{
                'عدد الأيام': formData.honeymoonTour?.days,
                'تاريخ البداية': formData.honeymoonTour?.startDate,
                'تاريخ النهاية': formData.honeymoonTour?.endDate,
                'المدينة': formData.honeymoonTour?.city,
                'الفندق': formData.honeymoonTour?.hotel,
              }}
            />
          )}
          {formData.activeTab === 'family' && (
            <ReviewSection
              title="تفاصيل الرحلة العائلية"
              icon="account-multiple"
              data={{
                'عدد الأفراد': formData.familyTour?.numberOfPeople,
                'عدد الأيام': formData.familyTour?.days,
                'تاريخ البداية': formData.familyTour?.startDate,
                'تاريخ النهاية': formData.familyTour?.endDate,
                'المدينة': formData.familyTour?.city,
              }}
            />
          )}
        </>
      )}

      {bundleType === 'external_tour' && (
        <>
          <ReviewSection
            title="معلومات الوجهة"
            icon="passport"
            data={{
              'الدولة': formData.destinationCountry,
              'المدينة': formData.destinationCity,
              'عدد الأيام': formData.days,
            }}
          />
          <ReviewSection
            title="معلومات الطيران"
            icon="airplane"
            data={{
              'تاريخ البداية': formData.travelStartDate,
              'تاريخ النهاية': formData.travelEndDate,
              'المطار': getAirportLabel(formData.airport),
              'شركة الطيران': getAirlineLabel(formData.airline),
            }}
          />
          <ReviewSection
            title="معلومات الإقامة"
            icon="hotel"
            data={{
              'عدد الأفراد': formData.numberOfPeople,
              'الفندق': formData.hotel,
            }}
          />
        </>
      )}

      {/* Edit Button */}
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => onEditStep(1)}
        disabled={loading}
      >
        <MaterialCommunityIcons name="pencil" size={18} color={colors.text} />
        <Text style={styles.editButtonText}>تعديل البيانات</Text>
      </TouchableOpacity>

      {/* Important Notice */}
      <View style={styles.noticeBox}>
        <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
        <Text style={styles.noticeText}>
          تأكد من صحة جميع البيانات المدخلة قبل الإرسال. لا يمكن تعديل الطلب بعد الإرسال.
        </Text>
      </View>

      {/* Confirm Button inside scroll area */}
      <TouchableOpacity
        style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
        onPress={onConfirm}
        disabled={loading}
      >
        <MaterialCommunityIcons name={loading ? 'loading' : 'send'} size={20} color={colors.white} />
        <Text style={styles.confirmButtonText}>
          {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </Text>
      </TouchableOpacity>

      <View style={styles.footerSpacer} />
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
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: colors.success + '12',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: 16,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    marginRight: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  summaryHighlight: {
    fontWeight: '700',
    color: colors.success,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 10,
  },
  sectionContent: {
    padding: 16,
  },
  reviewItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  editButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  noticeBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    backgroundColor: colors.warning + '12',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    padding: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    marginLeft: 10,
    lineHeight: 16,
  },
  footerSpacer: {
    height: 100,
  },
  confirmButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default Step3Review;
