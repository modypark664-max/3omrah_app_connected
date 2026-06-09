import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatContext from '../context/ChatContext';
import colors from '../theme/colors';

const formatTime = (timestamp) => {
  if (!timestamp) {
    return '';
  }
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_error) {
    return '';
  }
};

const ChatWidget = () => {
  const { isOpen, closeChat, messages, activeCard, loading, sending, statusText, sendMessage, refreshChat } = useContext(ChatContext);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [rendered, setRendered] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const keyboardVisibleRef = useRef(false);
  const listRef = useRef(null);
  const keyboardVerticalOffset = useMemo(
    () => Platform.select({ ios: (insets.top || 0) + 32, android: 0, default: 0 }),
    [insets.top]
  );
  const composerBottomInset = useMemo(() => Math.max(insets.bottom || 0, 12), [insets.bottom]);

  useEffect(() => {
    if (!isOpen) {
      setDraft('');
    }
  }, [isOpen, activeCard]);

  useEffect(() => {
    if (!isOpen || !listRef.current) {
      return;
    }
    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd?.({ animated: true });
    }, 100);
    return () => clearTimeout(timeout);
  }, [messages, isOpen]);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const handleShow = () => {
      keyboardVisibleRef.current = true;
    };

    const handleHide = () => {
      keyboardVisibleRef.current = false;
    };

    const showSub = Keyboard.addListener(showEvent, handleShow);
    const hideSub = Keyboard.addListener(hideEvent, handleHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const animateTo = (value, onComplete) => {
      sheetAnim.stopAnimation();
      Animated.timing(sheetAnim, {
        toValue: value,
        duration: value === 1 ? 250 : 220,
        easing: value === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(onComplete);
    };

    if (isOpen) {
      setRendered(true);
      animateTo(1);
    } else if (rendered && !keyboardVisibleRef.current) {
      animateTo(0, ({ finished }) => {
        if (finished) {
          setRendered(false);
          sheetAnim.setValue(0);
        }
      });
    } else if (!isOpen && keyboardVisibleRef.current) {
      Keyboard.dismiss();
      animateTo(0, ({ finished }) => {
        if (finished) {
          setRendered(false);
          sheetAnim.setValue(0);
        }
      });
    }
  }, [isOpen, rendered, sheetAnim]);

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) {
      return;
    }
    sendMessage(trimmed);
    setDraft('');
  };

  const renderMessage = (message, index) => {
    const isMine = Boolean(message?.isMine);
    const bubbleStyles = [styles.messageBubble, isMine ? styles.messageMine : styles.messageTheirs];
    const timeLabel = formatTime(message?.sentAt || message?.createdAt);
    return (
      <View key={message?._id || message?.clientMessageId || `msg-${index}`} style={styles.messageRow}>
        <View style={bubbleStyles}>
          <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{message?.body || ''}</Text>
          <View style={styles.messageMetaRow}>
            {message?.pending ? (
              <Text style={styles.messagePending}>جارٍ الإرسال...</Text>
            ) : timeLabel ? (
              <Text style={styles.messageMeta}>{timeLabel}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  if (!rendered) {
    return null;
  }

  const backdropStyle = [
    styles.backdrop,
    {
      opacity: sheetAnim
    }
  ];

  const sheetStyle = [
    styles.widgetCard,
    {
      paddingBottom: composerBottomInset + 16,
      transform: [
        {
          translateY: sheetAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [60, 0]
          })
        }
      ]
    }
  ];

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={closeChat}>
      <Animated.View style={backdropStyle}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height', default: 'padding' })}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={styles.avoider}
        >
          <SafeAreaView style={styles.sheetWrapper} edges={["bottom"]}>
            <Animated.View style={sheetStyle}>
              <View style={styles.sheetHandle} />
              <View style={styles.header}>
                <View style={styles.headerInfo}>
                  <Text style={styles.headerEyebrow}>دردشة مباشرة</Text>
                  <Text style={styles.headerTitle}>{activeCard?.name || 'استفسار جديد'}</Text>
                  <Text style={styles.headerSubtitle}>
                    {activeCard?.code ? `كود الباقة: ${activeCard.code}` : 'اختر أي باقة لبدء الحديث عنها'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={[styles.closeBtn, { marginRight: 8 }]} onPress={refreshChat} accessibilityRole="button">
                        <Ionicons name="refresh" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeBtn} onPress={closeChat} accessibilityRole="button">
                        <Ionicons name="close" size={20} color={colors.primary} />
                    </TouchableOpacity>
                </View>
              </View>

              <View style={{ backgroundColor: '#fff3cd', padding: 8, borderRadius: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="warning-outline" size={16} color="#856404" style={{ marginRight: 6 }} />
                  <Text style={{ fontFamily: 'Tajawal_400Regular', fontSize: 12, color: '#856404', textAlign: 'center' }}>
                      يرجى إبقاء التطبيق مفتوحاً لاستلام الإشعارات
                  </Text>
              </View>

              <View style={styles.messagesContainer}>
                {loading ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color={colors.secondary} />
                    <Text style={styles.loadingText}>جارٍ فتح المحادثة...</Text>
                  </View>
                ) : messages?.length ? (
                  <ScrollView
                    ref={listRef}
                    onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
                    style={styles.messagesInner}
                    contentContainerStyle={styles.messagesContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {messages.map(renderMessage)}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-ellipses" size={32} color={colors.secondary} />
                    <Text style={styles.emptyTitle}>ابدأ المحادثة</Text>
                    <Text style={styles.emptySubtitle}>اكتب سؤالك حول الباقة وسنرد عليك فوراً</Text>
                  </View>
                )}
              </View>

              {statusText ? (
                <Text style={styles.statusText}>{statusText}</Text>
              ) : null}

              <View style={[styles.composerRow, { paddingBottom: composerBottomInset, paddingTop: 8 }]}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="اكتب رسالتك هنا"
                  placeholderTextColor="#94a3b8"
                  multiline
                />
                <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
                  {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

export default ChatWidget;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    paddingHorizontal: 12,
    paddingTop: 32
  },
  avoider: {
    flex: 1
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%'
  },
  widgetCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 12,
    elevation: 16,
    width: '100%'
  },
  sheetHandle: {
    width: 60,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#dbe2ed',
    alignSelf: 'center',
    marginBottom: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  headerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: 12
  },
  headerEyebrow: {
    fontFamily: 'Tajawal_500Medium',
    color: colors.secondary,
    fontSize: 13,
    textAlign: 'right'
  },
  headerTitle: {
    fontFamily: 'Tajawal_700Bold',
    color: colors.primary,
    fontSize: 18,
    textAlign: 'right'
  },
  headerSubtitle: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'right'
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  messagesContainer: {
    flex: 1,
    minHeight: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e4eaf2',
    padding: 12,
    marginBottom: 8
  },
  messagesInner: {
    flex: 1
  },
  messagesContent: {
    paddingBottom: 8
  },
  messageRow: {
    marginBottom: 8
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    maxWidth: '85%'
  },
  messageMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.secondary
  },
  messageTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0'
  },
  messageText: {
    fontFamily: 'Tajawal_500Medium',
    fontSize: 15,
    color: colors.primary
  },
  messageTextMine: {
    color: '#fff'
  },
  messageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4
  },
  messageMeta: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 12,
    color: '#cbd5f5'
  },
  messagePending: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 12,
    color: '#fef3c7'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  emptyTitle: {
    fontFamily: 'Tajawal_700Bold',
    fontSize: 18,
    color: colors.primary,
    marginTop: 12
  },
  emptySubtitle: {
    fontFamily: 'Tajawal_400Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 8,
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted
  },
  statusText: {
    fontFamily: 'Tajawal_400Regular',
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'center'
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontFamily: 'Tajawal_500Medium',
    textAlign: 'right',
    minHeight: 44,
    maxHeight: 120,
    marginLeft: 8
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnDisabled: {
    opacity: 0.5
  }
});
