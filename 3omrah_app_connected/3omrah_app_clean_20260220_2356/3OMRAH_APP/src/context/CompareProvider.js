import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import CompareContext from './CompareContext';

const MAX_COMPARE_ITEMS = 3;

const normalizeCard = (card = {}) => ({
  id: String(card.id || card._id || ''),
  code: card.code || '',
  name: card.name || card.title || `باقة ${card.code || ''}`,
  type: card.type || 'omrah',
  thumbnail: card.thumbnail || card.heroImage || '',
  lowest_price: card.lowest_price ?? 0,
  days: card.days ?? 0,
  nights: card.nights ?? 0,
  travel_date: card.travel_date || null,
  offer_expiry_date: card.offer_expiry_date || null,
  going_route: card.going_route || '',
  returning_route: card.returning_route || '',
  plane_company: card.plane_company || card.airline || '',
  company: card.company || ''
});

const ensureId = (card) => {
  const id = card?.id || card?._id;
  return id ? String(id) : null;
};

const CompareProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const isInCompare = useCallback((cardId) => {
    if (!cardId) return false;
    const normalized = String(cardId);
    return items.some((entry) => entry.id === normalized);
  }, [items]);

  const addCard = useCallback((card) => {
    const id = ensureId(card);
    if (!id) {
      Alert.alert('تنبيه', 'لا يمكن إضافة هذه الباقة للمقارنة حالياً.');
      return 'ignored';
    }

    let result = 'ignored';
    setItems((prev) => {
      if (prev.some((entry) => entry.id === id)) {
        result = 'exists';
        return prev;
      }
      if (prev.length >= MAX_COMPARE_ITEMS) {
        Alert.alert('المقارنة ممتلئة', `يمكن مقارنة ${MAX_COMPARE_ITEMS} باقات كحد أقصى.`, [{ text: 'حسنًا' }]);
        result = 'limit';
        return prev;
      }
      result = 'added';
      return [...prev, normalizeCard(card)];
    });
    return result;
  }, []);

  const removeCard = useCallback((cardId) => {
    if (!cardId) {
      return 'ignored';
    }
    const normalized = String(cardId);
    let result = 'ignored';
    setItems((prev) => {
      if (!prev.some((entry) => entry.id === normalized)) {
        result = 'missing';
        return prev;
      }
      result = 'removed';
      return prev.filter((entry) => entry.id !== normalized);
    });
    return result;
  }, []);

  const toggleCard = useCallback((card) => {
    if (isInCompare(card?.id || card?._id)) {
      return removeCard(card?.id || card?._id);
    }
    return addCard(card);
  }, [addCard, removeCard, isInCompare]);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(() => ({
    items,
    maxItems: MAX_COMPARE_ITEMS,
    isInCompare,
    addCard,
    removeCard,
    toggleCard,
    clear
  }), [items, isInCompare, addCard, removeCard, toggleCard, clear]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
};

export default CompareProvider;
