import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { io } from 'socket.io-client';
import ChatContext from './ChatContext';
import AuthContext from './AuthContext';
import { API_BASE_URL } from '../config/env';
import { ensureChatThread, sendChatMessage } from '../services/api';
import ChatWidget from '../components/ChatWidget';

const SOCKET_PATH = '/socket.io';

// In Expo Go, executionEnvironment === 'storeClient'. We want local notifications to work there too.
// Only fully disable if notifications module is unavailable.
const NOTIFICATIONS_SUPPORTED = Boolean(Notifications?.scheduleNotificationAsync);

console.log('[Chat] NOTIFICATIONS_SUPPORTED:', NOTIFICATIONS_SUPPORTED, 'executionEnvironment:', Constants?.executionEnvironment);

if (NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });
} else {
  console.log('[Chat] Notifications disabled in Expo Go. Use a development build for push alerts.');
}

const extractCardId = (card) => {
  if (!card) return null;
  return card.id || card._id || card.cardId || card.card_id || null;
};

const ChatProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);

  const cardThreadMapRef = useRef(new Map());
  const threadCacheRef = useRef(new Map());
  const socketRef = useRef(null);
  const activeThreadIdRef = useRef(null);
  const activeThreadRef = useRef(null);
  const viewerIdRef = useRef(null);
  const notificationPermissionRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const isChatOpenRef = useRef(false);

  useEffect(() => {
    isChatOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      
      // When app comes back to foreground, ensure socket is connected and rejoined
      if (prevState.match(/inactive|background/) && nextState === 'active') {
        console.log('[Chat] App returned to foreground');
        if (socketRef.current) {
          if (!socketRef.current.connected) {
            console.log('[Chat] Socket disconnected while in background, reconnecting...');
            socketRef.current.connect();
          }
          // Re-emit join for the active thread to ensure we're in the room
          const threadId = activeThreadIdRef.current;
          if (threadId) {
            console.log('[Chat] Re-joining room after foreground:', threadId);
            socketRef.current.emit('chat:join', { threadId });
          }
        }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!NOTIFICATIONS_SUPPORTED) {
      notificationPermissionRef.current = false;
      return undefined;
    }

    let mounted = true;
    const prepareNotifications = async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        let granted = settings?.granted || settings?.status === 'granted';
        console.log('[Chat] Initial permission status:', settings?.status, 'granted:', granted);
        if (!granted) {
          const request = await Notifications.requestPermissionsAsync();
          granted = request?.granted || request?.status === 'granted';
          console.log('[Chat] Requested permission, granted:', granted);
        }
        if (mounted) {
          notificationPermissionRef.current = Boolean(granted);
          console.log('[Chat] notificationPermissionRef set to:', notificationPermissionRef.current);
        }
      } catch (err) {
        console.log('[Chat] notification permission error', err?.message);
      }
    };
    prepareNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  const getEntityId = useCallback((entity) => {
    if (!entity) {
      return null;
    }
    if (typeof entity === 'string') {
      return entity;
    }
    return entity._id || entity.id || null;
  }, []);

  const normalizeMessageForThread = useCallback(
    (message, thread) => {
      if (!message) {
        return null;
      }
      const viewerId = getEntityId(thread?.viewer) || viewerIdRef.current;
      const senderId = getEntityId(message?.sender);
      let isMine = message.isMine;
      if (viewerId && senderId) {
        isMine = String(senderId) === String(viewerId);
      }
      return {
        ...message,
        isMine
      };
    },
    [getEntityId]
  );

  const baseSocketUrl = useMemo(() => (API_BASE_URL || 'https://www.rhalatumrah.com').replace(/\/$/, ''), []);

  const updateActiveThread = useCallback((thread) => {
    setActiveThread(thread);
    activeThreadRef.current = thread;
    activeThreadIdRef.current = thread?._id || thread?.id || null;
    viewerIdRef.current = getEntityId(thread?.viewer) || viewerIdRef.current;
  }, [getEntityId]);

  const maybeNotifyNewMessage = useCallback((thread, message) => {
    console.log('[Chat] maybeNotifyNewMessage called', {
      hasMessage: Boolean(message),
      isMine: message?.isMine,
      body: message?.body,
      threadId: thread?._id || thread?.id
    });

    if (!message || message.isMine) {
      console.log('[Chat] Skipping notification: no message or isMine');
      return;
    }

    const isSameThreadOpen = isChatOpenRef.current && (activeThreadIdRef.current === (thread?._id || thread?.id));
    const isAppActive = appStateRef.current === 'active';
    console.log('[Chat] Notification context', { isSameThreadOpen, isAppActive, isChatOpen: isChatOpenRef.current });

    if (isSameThreadOpen && isAppActive) {
      console.log('[Chat] Skipping notification: chat is open and active');
      return;
    }

    const cardName = thread?.card?.name || thread?.cardName || 'رسالة جديدة';
    const cardCode = thread?.card?.code || thread?.cardCode;
    const body = message.body || 'لديك رسالة جديدة';

    console.log('[Chat] Preparing notification', { cardName, cardCode, body, NOTIFICATIONS_SUPPORTED, hasPermission: notificationPermissionRef.current });

    if (!NOTIFICATIONS_SUPPORTED) {
      console.log('[Chat] Notifications not supported, using Alert fallback');
      if (isAppActive) {
        Alert.alert(cardName, cardCode ? `${body}\nكود الباقة: ${cardCode}` : body);
      }
      return;
    }

    if (!notificationPermissionRef.current) {
      console.log('[Chat] No notification permission, skipping');
      return;
    }

    console.log('[Chat] Scheduling notification now...');
    Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 ${cardName}`,
        body: cardCode ? `${body}\n📦 كود الباقة: ${cardCode}` : body,
        data: { threadId: thread?._id || thread?.id || null },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        color: '#D4AF37'
      },
      trigger: null
    })
      .then(() => console.log('[Chat] Notification scheduled successfully'))
      .catch((err) => console.log('[Chat] notify error', err?.message));
  }, []);

  const showThreadFromCache = useCallback((threadId) => {
    if (!threadId) return false;
    const entry = threadCacheRef.current.get(threadId);
    if (!entry) {
      return false;
    }
    updateActiveThread(entry.thread);
    setMessages(entry.messages || []);
    setStatusText(entry.messages?.length ? 'تم تحديث المحادثة' : 'أرسل أول رسالة للبدء ✨');
    setError(null);
    return true;
  }, [updateActiveThread]);

  const ensureSocket = useCallback(() => {
    if (socketRef.current) {
      if (!socketRef.current.connected && typeof socketRef.current.connect === 'function') {
        console.log('[Chat] Socket exists but disconnected, reconnecting...');
        socketRef.current.connect();
      }
      return socketRef.current;
    }

    console.log('[Chat] Creating new socket connection to', baseSocketUrl);
    const socket = io(baseSocketUrl, {
      path: SOCKET_PATH,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    socket.on('connect', () => {
      console.log('[Chat] Socket connected, id:', socket.id);
      // Rejoin the active thread room on reconnect
      const threadId = activeThreadIdRef.current;
      if (threadId) {
        console.log('[Chat] Rejoining room after connect:', threadId);
        socket.emit('chat:join', { threadId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected, reason:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('chat:message', (payload) => {
      console.log('[Chat] socket chat:message received', payload);
      const threadId = payload?.threadId;
      const message = payload?.message;
      if (!threadId || !message) {
        console.log('[Chat] Ignoring message: missing threadId or message');
        return;
      }

      const entry = threadCacheRef.current.get(threadId) || { thread: null, messages: [] };
      const nextMessages = [...(entry.messages || [])];

      const clientIdx = message.clientMessageId
        ? nextMessages.findIndex((msg) => msg.clientMessageId === message.clientMessageId)
        : -1;
      const matchIdx = clientIdx !== -1 ? clientIdx : nextMessages.findIndex((msg) => msg._id === message._id);

      const resolvedThread = entry.thread || (activeThreadIdRef.current === threadId ? activeThreadRef.current : entry.thread);
      const normalized = normalizeMessageForThread(message, resolvedThread) || message;
      const delivered = { ...normalized, pending: false };

      if (matchIdx !== -1) {
        nextMessages[matchIdx] = delivered;
      } else {
        nextMessages.push(delivered);
      }

      threadCacheRef.current.set(threadId, { thread: resolvedThread || activeThreadRef.current, messages: nextMessages });
      if (activeThreadIdRef.current === threadId) {
        setMessages(nextMessages);
      }
      maybeNotifyNewMessage(resolvedThread || activeThreadRef.current, delivered);
    });

    socket.on('chat:error', (payload) => {
      const message = payload?.message || 'تعذر الوصول إلى المحادثة.';
      setStatusText(message);
      setError(message);
    });

    socket.on('connect_error', (err) => {
      console.log('[Chat] socket connect_error', err?.message);
      setStatusText('تعذر الاتصال بالخادم، سنحاول مجددًا');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[Chat] Socket reconnected after', attemptNumber, 'attempts');
      // Rejoin room after reconnection
      const threadId = activeThreadIdRef.current;
      if (threadId) {
        console.log('[Chat] Rejoining room after reconnect:', threadId);
        socket.emit('chat:join', { threadId });
      }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Chat] Socket reconnect attempt', attemptNumber);
    });

    socketRef.current = socket;
    return socket;
  }, [baseSocketUrl, maybeNotifyNewMessage, normalizeMessageForThread]);

  useEffect(() => () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const joinRoom = useCallback((threadId) => {
    if (!threadId) return;
    const socket = ensureSocket();
    console.log('[Chat] Joining room:', threadId, 'socket connected:', socket.connected);
    socket.emit('chat:join', { threadId });
  }, [ensureSocket]);

  const leaveRoom = useCallback((threadId) => {
    if (!threadId || !socketRef.current) return;
    socketRef.current.emit('chat:leave', { threadId });
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setStatusText('');
    setError(null);
  }, []);

  const openChat = useCallback(async (card) => {
    if (!isAuthenticated) {
      Alert.alert('تسجيل الدخول مطلوب', 'يرجى تسجيل الدخول لبدء المحادثة.');
      return false;
    }

    const cardId = extractCardId(card);
    if (!cardId) {
      Alert.alert('خطأ', 'لا يمكن فتح المحادثة لعدم توفر معرف الباقة.');
      return false;
    }

    setActiveCard(card || null);
    setIsOpen(true);
    setLoading(true);
    setStatusText('جارٍ فتح المحادثة...');
    setError(null);

    const cachedThreadId = cardThreadMapRef.current.get(cardId);
    if (cachedThreadId && showThreadFromCache(cachedThreadId)) {
      setLoading(false);
      ensureSocket();
      joinRoom(cachedThreadId);
      return true;
    }

    try {
      const payload = await ensureChatThread(cardId);
      if (!payload?.thread) {
        throw new Error('لا يمكن فتح المحادثة حالياً.');
      }
      viewerIdRef.current = getEntityId(payload.thread?.viewer) || viewerIdRef.current;
      const normalizedMessages = (payload.messages || []).map((msg) => ({
        ...(normalizeMessageForThread(msg, payload.thread) || msg),
        pending: false
      }));
      const threadId = payload.thread._id || payload.thread.id;
      if (!threadId) {
        throw new Error('معرف المحادثة غير صالح.');
      }
      threadCacheRef.current.set(threadId, { thread: payload.thread, messages: normalizedMessages });
      cardThreadMapRef.current.set(cardId, threadId);
      updateActiveThread(payload.thread);
      setMessages(normalizedMessages);
      setStatusText(normalizedMessages.length ? 'تم تحديث المحادثة' : 'أرسل أول رسالة للبدء ✨');
      ensureSocket();
      joinRoom(threadId);
      return true;
    } catch (err) {
      const message = err?.message || 'تعذر فتح المحادثة.';
      setError(message);
      Alert.alert('خطأ', message);
      setIsOpen(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [ensureSocket, getEntityId, isAuthenticated, joinRoom, normalizeMessageForThread, showThreadFromCache, updateActiveThread]);

  useEffect(() => {
    const threadId = activeThread?._id || activeThread?.id;
    if (!threadId) {
      return undefined;
    }
    joinRoom(threadId);
    return () => leaveRoom(threadId);
  }, [activeThread, joinRoom, leaveRoom]);

  const sendMessageHandler = useCallback(async (text) => {
    const threadId = activeThreadIdRef.current;
    if (!threadId) {
      Alert.alert('تنبيه', 'لا توجد محادثة نشطة.');
      return;
    }

    const body = (text || '').trim();
    if (!body) {
      Alert.alert('تنبيه', 'اكتب رسالة قبل الإرسال.');
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pendingMessage = {
      _id: tempId,
      clientMessageId: tempId,
      body,
      sentAt: new Date().toISOString(),
      isMine: true,
      pending: true
    };

    const entry = threadCacheRef.current.get(threadId) || { thread: activeThreadRef.current, messages: [] };
    const optimisticMessages = [...(entry.messages || []), pendingMessage];
    threadCacheRef.current.set(threadId, { thread: entry.thread || activeThreadRef.current, messages: optimisticMessages });
    if (activeThreadIdRef.current === threadId) {
      setMessages(optimisticMessages);
    }

    setSending(true);
    try {
      const payload = await sendChatMessage(threadId, { message: body, clientMessageId: tempId });
      const serverMessage = payload?.message;
      if (!serverMessage) {
        throw new Error('لم يتم استلام تأكيد من الخادم.');
      }
      const latestEntry = threadCacheRef.current.get(threadId) || { thread: activeThreadRef.current, messages: [] };
      const entryThread = latestEntry.thread || activeThreadRef.current;
      const normalizedServerMessage = normalizeMessageForThread(serverMessage, entryThread) || serverMessage;
      const delivered = { ...normalizedServerMessage, pending: false };
      const nextMessages = [...(latestEntry.messages || [])];
      const replacementIdx = delivered.clientMessageId
        ? nextMessages.findIndex((msg) => msg.clientMessageId === delivered.clientMessageId)
        : nextMessages.findIndex((msg) => msg._id === tempId);
      if (replacementIdx !== -1) {
        nextMessages[replacementIdx] = delivered;
      } else {
        nextMessages.push(delivered);
      }
      threadCacheRef.current.set(threadId, { thread: entryThread, messages: nextMessages });
      if (activeThreadIdRef.current === threadId) {
        setMessages(nextMessages);
      }
      setStatusText('تم إرسال الرسالة');
    } catch (err) {
      const latestEntry = threadCacheRef.current.get(threadId);
      if (latestEntry?.messages?.length) {
        const filtered = latestEntry.messages.filter((msg) => msg._id !== tempId && msg.clientMessageId !== tempId);
        threadCacheRef.current.set(threadId, { thread: latestEntry.thread, messages: filtered });
        if (activeThreadIdRef.current === threadId) {
          setMessages(filtered);
        }
      }
      const message = err?.message || 'تعذر إرسال الرسالة.';
      setError(message);
      Alert.alert('خطأ', message);
    } finally {
      setSending(false);
    }
  }, [normalizeMessageForThread]);

  const refreshChat = useCallback(async () => {
    const threadId = activeThreadIdRef.current;
    if (!threadId) {
      return;
    }
    
    setLoading(true);
    try {
      // Re-ensure socket connection
      ensureSocket();
      
      // Fetch latest thread state (which includes messages)
      // Since ensureChatThread takes a cardId, we can also just leverage the existing flow 
      // or we can implement a specific fetch thread by ID. 
      // For simplicity, let's use the activeCard if available, or just rejoin the room.
      // But rejoining room doesn't fetch history.
      // Let's rely on the existing openChat flow which does everything we need if we pass the activeCard.
      if (activeCard) {
        // Clear cache forcing a fetch
        const cardId = extractCardId(activeCard);
        if (cardId) {
           // We temporarily remove from cache to force network fetch in openChat
           cardThreadMapRef.current.delete(cardId);
           // Also remove thread from cache
           threadCacheRef.current.delete(threadId);
        }
        await openChat(activeCard);
      } else {
         // Fallback just emit join
         socketRef.current?.emit('chat:join', { threadId });
      }
    } catch (err) {
      console.log('[Chat] Refresh failed', err);
    } finally {
      setLoading(false);
    }
  }, [activeCard, ensureSocket, openChat]);

  const value = useMemo(() => ({
    isOpen,
    loading,
    sending,
    statusText,
    error,
    activeCard,
    activeThread,
    messages,
    openChat,
    closeChat,
    sendMessage: sendMessageHandler,
    refreshChat
  }), [isOpen, loading, sending, statusText, error, activeCard, activeThread, messages, openChat, closeChat, sendMessageHandler, refreshChat]);

  return (
    <ChatContext.Provider value={value}>
      {children}
      <ChatWidget />
    </ChatContext.Provider>
  );
};

export default ChatProvider;
