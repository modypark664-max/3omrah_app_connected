import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const NOTIFICATIONS_STORAGE_KEY = '@omrah_app/notifications';

const MOCK_SEED_NOTIFICATIONS = [];

export const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: true,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  deleteNotification: () => {},
  clearAll: () => {}
});

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load notifications from AsyncStorage
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const jsonValue = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (jsonValue !== null) {
        let loaded = JSON.parse(jsonValue);
        // Filter out any seed/mock notifications that were stored previously
        loaded = loaded.filter(notif => !notif.id.startsWith('notif_seed_'));
        setNotifications(loaded);
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(loaded));
      } else {
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify([]));
        setNotifications([]);
      }
    } catch (error) {
      console.warn('[NotificationContext] Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Save notifications to AsyncStorage helper
  const saveNotifications = async (newNotifications) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(newNotifications));
    } catch (error) {
      console.warn('[NotificationContext] Failed to save notifications:', error);
    }
  };

  // Add a new notification (useful for local triggers or Push notification listeners)
  const addNotification = useCallback((title, body, type = 'update', data = {}) => {
    setNotifications((prevNotifications) => {
      const newNotification = {
        id: `notif_${Date.now()}`,
        type,
        title,
        body,
        date: new Date().toISOString(),
        isRead: false,
        data
      };
      const updated = [newNotification, ...prevNotifications];
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Listen for active incoming Expo Push Notifications
  useEffect(() => {
    // foreground listener
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push Received]:', notification);
      const { title, body, data } = notification.request.content;
      
      // Map incoming push structure to our schema
      const type = data?.type || 'update'; // can be 'booking', 'offer', 'update'
      addNotification(
        title || 'إشعار جديد', 
        body || '', 
        type, 
        data || {}
      );
    });

    // interaction listener (click)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Push Clicked]:', response);
      const { notification } = response;
      const { title, body, data } = notification.request.content;
      const type = data?.type || 'update';
      
      // When user clicks the push notification, we want to ensure it is in our history and marked as read
      // We can also let the UI navigate if needed
      addNotification(
        title || 'إشعار جديد', 
        body || '', 
        type, 
        data || {}
      );
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [addNotification]);

  // Mark a single notification as read
  const markAsRead = useCallback((id) => {
    setNotifications((prevNotifications) => {
      const updated = prevNotifications.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      );
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prevNotifications) => {
      const updated = prevNotifications.map((notif) => ({ ...notif, isRead: true }));
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((id) => {
    setNotifications((prevNotifications) => {
      const updated = prevNotifications.filter((notif) => notif.id !== id);
      saveNotifications(updated);
      return updated;
    });
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  // Compute dynamic unread notifications count
  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
