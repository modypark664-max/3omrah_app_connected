import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { fetchUserFavorites, toggleFavorite } from '../services/api';

const extractId = (item) => {
  if (!item) {
    return null;
  }
  return String(item._id || item.id || item.cardId || '');
};

const normalizeFavorites = (favorites = []) => {
  const next = new Set();
  favorites.forEach((favorite) => {
    const id = extractId(favorite);
    if (id) {
      next.add(id);
    }
  });
  return next;
};

const useFavorites = ({ autoLoad = true } = {}) => {
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);
  const [initialLoadError, setInitialLoadError] = useState(null);

  const loadFavorites = useCallback(async () => {
    try {
      const response = await fetchUserFavorites();
      const ids = normalizeFavorites(response?.favorites || []);
      setFavoriteIds(ids);
      setInitialLoadError(null);
    } catch (error) {
      console.log('[Favorites] Failed to load favorites', error);
      setInitialLoadError(error);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      loadFavorites();
    }
  }, [autoLoad, loadFavorites]);

  const isFavorite = useCallback((cardId) => {
    if (!cardId) return false;
    return favoriteIds.has(String(cardId));
  }, [favoriteIds]);

  const toggleFavoriteId = useCallback(async (cardId) => {
    if (!cardId) {
      return null;
    }
    const normalizedId = String(cardId);
    setFavoriteLoadingId(normalizedId);
    try {
      const response = await toggleFavorite(normalizedId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (response?.isFavorite) {
          next.add(normalizedId);
        } else {
          next.delete(normalizedId);
        }
        return next;
      });
      return response;
    } catch (error) {
      Alert.alert('خطأ', error?.message || 'تعذر تحديث قائمة المفضلة، حاول مرة أخرى.');
      throw error;
    } finally {
      setFavoriteLoadingId(null);
    }
  }, []);

  const favoriteList = useMemo(() => Array.from(favoriteIds), [favoriteIds]);

  return {
    favoriteIds,
    favoriteList,
    favoriteLoadingId,
    initialLoadError,
    isFavorite,
    loadFavorites,
    toggleFavoriteId
  };
};

export default useFavorites;
