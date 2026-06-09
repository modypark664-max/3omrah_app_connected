import React, { useContext, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  PanResponder,
  Platform,
  Alert,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import colors from '../theme/colors';
import { typography } from '../theme/ui';
import { NotificationContext } from '../context/NotificationContext';

// Helper to format dates to relative Arabic text
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    
    // Prevent future dates showing negative
    if (diffMs < 0) return 'الآن';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `قبل ${diffMins} د`;
    if (diffHours === 1) return 'قبل ساعة';
    if (diffHours === 2) return 'قبل ساعتين';
    if (diffHours < 24) return `قبل ${diffHours} س`;
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'قبل يومين';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    
    // Fallback absolute date
    return past.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  } catch (_err) {
    return '';
  }
};

// Custom Swipeable Notification Card Subcomponent
const NotificationItem = ({ item, onMarkAsRead, onDelete }) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const heightVal = useRef(new Animated.Value(1)).current; // For smooth delete height collapse
  const opacityVal = useRef(new Animated.Value(1)).current;
  const isOpen = useRef(false);

  const handlePress = () => {
    onMarkAsRead(item.id);
    if (item.data?.route) {
      navigation.navigate(item.data.route, item.data.params);
    } else {
      if (item.type === 'booking') {
        navigation.navigate('Bookings');
      } else if (item.type === 'offer') {
        navigation.navigate('OffersTab');
      } else {
        navigation.navigate('Home');
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Intercept only when dragging horizontally and ignoring vertical scrolls
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        let newX = gestureState.dx;
        // Adjust for current open position
        if (isOpen.current) {
          newX -= 80;
        }
        
        // Restrict swipe: only allow left swipe (negative dx)
        if (newX > 0) newX = 0;
        if (newX < -120) newX = -120; // maximum swipe limit
        
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        let finalX = gestureState.dx;
        if (isOpen.current) {
          finalX -= 80;
        }
        
        if (finalX < -40) {
          // Snap Open to show delete button
          Animated.spring(translateX, {
            toValue: -80,
            useNativeDriver: true,
            friction: 6,
            tension: 40
          }).start();
          isOpen.current = true;
        } else {
          // Snap Closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6,
            tension: 40
          }).start();
          isOpen.current = false;
        }
      }
    })
  ).current;

  // Animate card collapse and trigger delete
  const handleDeleteTrigger = () => {
    Animated.parallel([
      Animated.timing(heightVal, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false
      }),
      Animated.timing(opacityVal, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false
      })
    ]).start(() => {
      onDelete(item.id);
    });
  };

  const itemHeight = heightVal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 105] // Height of the card + margin
  });

  const getNotificationDetails = (type) => {
    switch (type) {
      case 'booking':
        return { name: 'briefcase', color: colors.success, bg: colors.successSoft };
      case 'offer':
        return { name: 'gift', color: colors.brand, bg: '#F2EFFF' }; // matching brand soft tone
      case 'update':
      default:
        return { name: 'alert-circle', color: colors.info, bg: colors.infoSoft };
    }
  };

  const details = getNotificationDetails(item.type);

  return (
    <Animated.View style={[styles.cardWrapper, { height: itemHeight, opacity: opacityVal }]}>
      {/* Red Delete Background Revealed behind swiped card */}
      <View style={styles.deleteBackground}>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDeleteTrigger}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Main Notification Card Content */}
      <Animated.View
        style={[
          styles.itemCard,
          {
            transform: [{ translateX }],
            backgroundColor: item.isRead ? colors.surface : '#F4F9FF'
          }
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable 
          style={styles.cardPressable} 
          onPress={handlePress}
        >
          {/* Unread small dot badge */}
          {!item.isRead && <View style={styles.unreadDot} />}

          {/* Left part: Icon container in a circular badge */}
          <View style={[styles.iconContainer, { backgroundColor: details.bg }]}>
            <Ionicons name={details.name} size={22} color={details.color} />
          </View>

          {/* Right part: Text details */}
          <View style={styles.textContainer}>
            <View style={styles.cardHeaderRow}>
              <Text 
                style={[
                  styles.itemTitle, 
                  !item.isRead && styles.itemTitleUnread
                ]} 
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.itemDate}>
                {formatRelativeTime(item.date)}
              </Text>
            </View>
            <Text 
              style={[
                styles.itemBody, 
                !item.isRead && styles.itemBodyUnread
              ]} 
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Main Screen Component
const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { 
    notifications, 
    markAsRead, 
    deleteNotification, 
    clearAll 
  } = useContext(NotificationContext);

  const [activeFilter, setActiveFilter] = useState('all');

  // Filter labels and keys in Arabic
  const filters = [
    { key: 'all', label: 'الكل' },
    { key: 'booking', label: 'حجوزات' },
    { key: 'offer', label: 'عروض' },
    { key: 'update', label: 'تحديثات' }
  ];

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(notif => notif.type === activeFilter);
  }, [notifications, activeFilter]);

  // Clear all confirmation alert
  const handleClearAll = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm('هل أنت متأكد من رغبتك في حذف جميع الإشعارات نهائياً؟');
      if (confirm) {
        clearAll();
      }
    } else {
      Alert.alert(
        'تأكيد الحذف',
        'هل أنت متأكد من رغبتك في حذف جميع الإشعارات نهائياً؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { 
            text: 'حذف الكل', 
            style: 'destructive', 
            onPress: () => clearAll() 
          }
        ]
      );
    }
  };

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.headerContainer}>
        {canGoBack ? (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}

        <Text style={styles.screenTitle}>الإشعارات</Text>

        {notifications.length > 0 ? (
          <TouchableOpacity 
            style={styles.clearAllButton} 
            onPress={handleClearAll}
            accessibilityRole="button"
            accessibilityLabel="مسح الكل"
          >
            <Text style={styles.clearAllText}>مسح الكل</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 68 }} />
        )}
      </View>

      {/* ── Category Filters (Segmented Tabs) ── */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  isSelected && styles.filterTabSelected
                ]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text 
                  style={[
                    styles.filterLabel,
                    isSelected && styles.filterLabelSelected
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Notifications List ── */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkAsRead={handleMarkAsRead}
              onDelete={deleteNotification}
            />
          )}
        />
      ) : (
        /* ── Empty State ── */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={54} color={colors.placeholder} />
          </View>
          <Text style={styles.emptyTitle}>لا توجد إشعارات حالياً</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all' 
              ? 'عند استلامك أي إشعارات حول الحجوزات أو العروض والتحديثات الخاصة بك، ستظهر هنا فوراً.'
              : 'لا يوجد أي إشعارات مطابقة في هذا التصنيف حالياً.'}
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreButtonText}>العودة للرئيسية</Text>
            <Ionicons name="home-outline" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.surface
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted
  },
  screenTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.primary
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  clearAllText: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: colors.danger
  },
  
  // Filters Style
  filtersWrapper: {
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  filtersList: {
    paddingHorizontal: 16,
    flexDirection: 'row-reverse', // Align Arabic tabs from right to left
    gap: 8
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    minWidth: 70,
    alignItems: 'center'
  },
  filterTabSelected: {
    backgroundColor: colors.primary
  },
  filterLabel: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: colors.textSecondary
  },
  filterLabelSelected: {
    color: colors.white,
    fontFamily: typography.bold
  },

  // List Style
  listContent: {
    padding: 16,
    paddingBottom: 40
  },

  // Card Wrapper and background Delete button
  cardWrapper: {
    position: 'relative',
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 16
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderRadius: 16
  },
  deleteButton: {
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Notification Card Main body
  itemCard: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6
      },
      android: {
        elevation: 2
      }
    })
  },
  cardPressable: {
    flex: 1,
    flexDirection: 'row-reverse', // Align components to read Arabic right-to-left
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative'
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 14 // spacing between icon and text in RTL
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-end' // RTL text alignment
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4
  },
  itemTitle: {
    fontFamily: typography.medium,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10
  },
  itemTitleUnread: {
    fontFamily: typography.bold,
    color: colors.text
  },
  itemDate: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: colors.muted
  },
  itemBody: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'right',
    lineHeight: 18
  },
  itemBodyUnread: {
    color: colors.textSecondary,
    fontFamily: typography.medium
  },

  // Empty State Style
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 20
  },
  emptyTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.primary,
    marginBottom: 8
  },
  emptySubtitle: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  exploreButtonText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: colors.white
  }
});

export default NotificationsScreen;
