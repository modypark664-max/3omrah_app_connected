import { API_BASE_URL } from '../config/env';

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const looksLikeHtmlDocument = (contentType = '', body = '') => {
  const lowered = body.slice(0, 200).toLowerCase();
  return contentType.includes('text/html') || lowered.includes('<!doctype') || lowered.includes('<html');
};

const deriveErrorMessage = (source, fallback) => {
  if (!source) return fallback;

  const pick = typeof source === 'string' ? source : source.message || source.error;
  if (typeof pick !== 'string') {
    return fallback;
  }

  const trimmed = pick.trim();
  if (!trimmed) return fallback;

  const htmlSentinel = trimmed.slice(0, 15).toLowerCase();
  if (htmlSentinel.includes('<!doctype') || htmlSentinel.includes('<html')) {
    return fallback;
  }

  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const buildUrl = (path) => {
  const normalizedBase = API_BASE_URL.replace(/\/$/, '');
  return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
};

const isNetworkFailure = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.name === 'TypeError' ||
    message.includes('failed to fetch') ||
    message.includes('network request failed') ||
    message.includes('network error')
  );
};

const toNetworkApiError = (error) =>
  new ApiError(
    `تعذر الاتصال بالخادم (${API_BASE_URL}). تأكد من تشغيل الباكند على المنفذ 3000 ثم أعد المحاولة.`,
    0,
    { cause: error?.message }
  );

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_error) {
      data = null;
    }
  }

  if (data === null && text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = { message: text };
    }
  }

  return { data, text, contentType };
};

const request = async (path, { method = 'GET', body, headers = {}, redirect = 'follow' } = {}) => {
  const finalHeaders = { ...defaultHeaders, ...headers };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  if (isFormData) {
    delete finalHeaders['Content-Type'];
  }

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: finalHeaders,
      body,
      credentials: 'include',
      cache: 'no-store',
      redirect
    });
  } catch (error) {
    if (isNetworkFailure(error)) {
      console.warn('[API] networkError', { path, message: error?.message });
      throw toNetworkApiError(error);
    }
    throw error;
  }

  const { data, text, contentType } = await parseResponse(response);
  console.log('[API] response', { path, status: response.status });

  const expectsJsonPayload = path.startsWith('/api/');
  if (response.ok && expectsJsonPayload && looksLikeHtmlDocument(contentType, text || '')) {
    console.warn('[API] htmlResponseDetected', { path, status: response.status });
    throw new ApiError('انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مرة أخرى.', 401, { html: text });
  }

  if (!response.ok) {
    const message = deriveErrorMessage(data, 'حدث خطأ أثناء الاتصال بالخادم.');
    throw new ApiError(message, response.status, data);
  }

  return { data, response };
};

const ensureSuccess = (payload, fallbackMessage) => {
  if (payload?.success) {
    return payload;
  }
  throw new Error(payload?.message || fallbackMessage);
};

const normalizeLocationPath = (location) => {
  if (!location) return '';
  try {
    const url = location.startsWith('http') ? new URL(location) : new URL(location, API_BASE_URL);
    return url.pathname || '';
  } catch (_error) {
    return location.startsWith('/') ? location : `/${location}`;
  }
};

const legacyAuthRequest = async ({ path, payload, successRedirects = [], failureRedirects = [], genericError }) => {
  console.log('[API] legacyAuthRequest:start', { path, payload });

  const formBody = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formBody.append(key, String(value));
    }
  });

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'REHLATTY_APP/1.0',
        Referer: `${API_BASE_URL.replace(/\/$/, '')}${path}`
      },
      body: formBody.toString(),
      credentials: 'include',
      redirect: 'manual'
    });
  } catch (error) {
    if (isNetworkFailure(error)) {
      console.warn('[API] legacyAuth networkError', { path, message: error?.message });
      throw toNetworkApiError(error);
    }
    throw error;
  }

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const locationPath = normalizeLocationPath(response.headers.get('location'));
    console.log('[API] legacyAuthRequest:redirect', { path, status: response.status, locationPath });

    if (failureRedirects.some((target) => locationPath.startsWith(target))) {
      console.log('[API] legacyAuthRequest:failureRedirect', { path, locationPath });
      throw new Error('بيانات تسجيل الدخول غير صحيحة.');
    }

    if (successRedirects.some((target) => locationPath === target || locationPath.startsWith(`${target}/`))) {
      console.log('[API] legacyAuthRequest:successRedirect', { path, locationPath });
      return { success: true, viaLegacy: true };
    }

    throw new Error(genericError || 'تعذر التأكد من حالة المصادقة.');
  }
  const { data, text } = await parseResponse(response);

  console.log('[API] legacyAuthRequest:nonRedirect', {
    path,
    status: response.status,
    ok: response.ok,
    preview: text?.slice(0, 100)
  });

  const message = deriveErrorMessage(data, genericError || 'تعذر تسجيل الدخول. تأكد من صحة البيانات وحاول مرة أخرى.');

  throw new Error(message);
};

export const signupUser = async ({ username, phoneNumber, password, confirmPassword }) => {
  try {
    console.log('[API] signupUser:jsonStart');
    const { data } = await request('/api/mobile/signup', {
      method: 'POST',
      body: JSON.stringify({ username, phoneNumber, password, confirmPassword })
    });
    console.log('[API] signupUser:jsonSuccess');
    return ensureSuccess(data, 'تعذر إنشاء الحساب.');
  } catch (error) {
    console.log('[API] signupUser:error', { status: error?.status, message: error?.message });
    if (error instanceof ApiError && [404, 405].includes(error.status)) {
      console.log('[API] signupUser:fallback');
      await legacyAuthRequest({
        path: '/signup',
        payload: { username, phoneNumber, password, confirmPassword },
        successRedirects: ['/login'],
        failureRedirects: ['/signup'],
        genericError: 'تعذر إنشاء الحساب على الخادم الحالي.'
      });

      await legacyAuthRequest({
        path: '/login',
        payload: { phoneNumber, password },
        successRedirects: ['/', '/bundles', '/compare', '/profile', '/partner-dashboard', '/admin'],
        failureRedirects: ['/login'],
        genericError: 'تم إنشاء الحساب لكن تعذر تسجيل الدخول التلقائي.'
      });

      return { success: true, viaLegacy: true };
    }
    throw error;
  }
};

export const loginUser = async ({ phoneNumber, password }) => {
  try {
    console.log('[API] loginUser:jsonStart');
    const { data } = await request('/api/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password })
    });
    console.log('[API] loginUser:jsonSuccess');
    return ensureSuccess(data, 'تعذر تسجيل الدخول.');
  } catch (error) {
    console.log('[API] loginUser:error', { status: error?.status, message: error?.message });
    if (error instanceof ApiError && [404, 405].includes(error.status)) {
      console.log('[API] loginUser:fallback');
      return legacyAuthRequest({
        path: '/login',
        payload: { phoneNumber, password },
        successRedirects: ['/', '/bundles', '/compare', '/profile', '/partner-dashboard', '/admin'],
        failureRedirects: ['/login'],
        genericError: 'الخادم رفض بيانات تسجيل الدخول.'
      });
    }
    throw error;
  }
};

// Register Expo push token for push notifications
export const registerPushToken = async (token, deviceId = null) => {
  try {
    const { data } = await request('/api/mobile/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, deviceId })
    });
    console.log('[API] registerPushToken:success');
    return data;
  } catch (error) {
    console.log('[API] registerPushToken:error', error?.message);
    // Don't throw - push token registration failure shouldn't block the app
    return { success: false };
  }
};

// Remove Expo push token (on logout)
export const removePushToken = async (token) => {
  try {
    const { data } = await request('/api/mobile/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token })
    });
    console.log('[API] removePushToken:success');
    return data;
  } catch (error) {
    console.log('[API] removePushToken:error', error?.message);
    return { success: false };
  }
};

const buildQueryString = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (!entries.length) {
    return '';
  }
  const qs = new URLSearchParams();
  entries.forEach(([key, value]) => {
    qs.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return `?${qs.toString()}`;
};

export const fetchBundlesOverview = async () => {
  const { data } = await request('/api/mobile/bundles/overview');
  return data;
};

export const fetchBundlesList = async (params = {}) => {
  const query = buildQueryString({ include_details: '1', ...params });
  const { data } = await request(`/api/mobile/bundles${query}`);
  return data;
};

export const fetchBundleDetails = async (cardId) => {
  if (!cardId) {
    throw new Error('رقم الباقة مطلوب.');
  }
  const { data } = await request(`/api/mobile/bundles/${cardId}`);
  return data;
};

export const fetchProfileOverview = async () => {
  const { data } = await request('/api/mobile/profile');
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تحميل بيانات الملف الشخصي.');
  }
  return data;
};

export const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const { data } = await request('/api/user/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تغيير كلمة المرور.');
  }
  return data;
};

export const uploadProfileImage = async ({ uri, mimeType = 'image/jpeg', name }) => {
  const formData = new FormData();
  formData.append('profileImage', {
    uri,
    type: mimeType,
    name: name || `profile-${Date.now()}.jpg`
  });

  const { data } = await request('/api/user/profile-image', {
    method: 'POST',
    body: formData,
    headers: { Accept: 'application/json' }
  });

  if (!data?.success) {
    throw new Error(data?.message || 'تعذر رفع صورة الملف الشخصي.');
  }

  return data;
};

export const fetchUserFavorites = async () => {
  const { data } = await request('/api/user/favorites');
  if (!data) {
    throw new Error('تعذر تحميل المفضلات.');
  }
  return data;
};

export const toggleFavorite = async (cardId) => {
  const { data } = await request(`/api/favorites/toggle/${cardId}`, { method: 'POST' });
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تحديث قائمة المفضلة.');
  }
  return data;
};

export const logoutUser = async () => {
  const { data } = await request('/api/mobile/logout', { method: 'POST' });
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تسجيل الخروج.');
  }
  return data;
};

export const deleteAccount = async ({ password, reason }) => {
  const payload = { password };
  if (reason) {
    payload.reason = reason;
  }

  const { data } = await request('/api/mobile/profile/delete', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!data?.success) {
    throw new Error(data?.message || 'تعذر حذف الحساب في الوقت الحالي.');
  }

  return data;
};

export const ensureChatThread = async (cardId) => {
  if (!cardId) {
    throw new Error('رقم الباقة مطلوب لفتح المحادثة.');
  }
  const { data } = await request('/api/chat/thread', {
    method: 'POST',
    body: JSON.stringify({ cardId })
  });
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر فتح المحادثة.');
  }
  return data;
};

export const fetchChatMessages = async (threadId, params = {}) => {
  if (!threadId) {
    throw new Error('معرف المحادثة مطلوب.');
  }
  const query = buildQueryString(params);
  const { data } = await request(`/api/chat/thread/${threadId}/messages${query}`);
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تحميل الرسائل.');
  }
  return data;
};

export const sendChatMessage = async (threadId, { message, clientMessageId }) => {
  if (!threadId) {
    throw new Error('معرف المحادثة مطلوب.');
  }
  if (!message) {
    throw new Error('لا يمكن إرسال رسالة فارغة.');
  }
  const { data } = await request(`/api/chat/thread/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, clientMessageId })
  });
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر إرسال الرسالة.');
  }
  return data;
};

export const fetchChatThreads = async (scope = 'viewer') => {
  const query = buildQueryString({ scope });
  const { data } = await request(`/api/chat/threads${query}`);
  if (!data?.success) {
    throw new Error(data?.message || 'تعذر تحميل المحادثات.');
  }
  return data;
};

const isRedirectStatus = (status) => [301, 302, 303, 307, 308].includes(status);

const extractReservationIdFromHtml = (html = '') => {
  if (!html) return null;
  const spanMatch = html.match(/reservation-number[^>]*>([^<]+)/i);
  if (spanMatch?.[1]) {
    return spanMatch[1].trim();
  }

  const literalMatch = html.match(/reservationNumber\s*[:=]\s*['"]([^'"]+)['"]/i);
  if (literalMatch?.[1]) {
    return literalMatch[1].trim();
  }

  const pathMatch = html.match(/\/payment\/([A-Za-z0-9_-]+)/i);
  if (pathMatch?.[1]) {
    return pathMatch[1].trim();
  }

  return null;
};

export const submitBundleReservation = async ({
  cardId,
  username,
  phoneNumber,
  peopleCount,
  roomType,
  note
}) => {
  if (!cardId) {
    throw new Error('معرف الباقة غير متوفر.');
  }
  const payload = new URLSearchParams();
  payload.set('cardId', String(cardId));
  payload.set('username', username?.trim() || '');
  payload.set('phoneNumber', phoneNumber?.trim() || '');
  payload.set('peopleCount', String(peopleCount ?? 1));
  payload.set('roomType', roomType?.trim() || '');
  if (note !== undefined && note !== null) {
    payload.set('note', note.trim());
  }

  console.log('[API] submitBundleReservation:request', {
    cardId,
    usernameLength: username?.length,
    phoneNumber,
    peopleCount,
    roomType,
    noteLength: note?.length
  });

  const response = await fetch(buildUrl('/reserve'), {
    method: 'POST',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: buildUrl('/bundles'),
      'User-Agent': 'REHLATTY_APP/1.0'
    },
    body: payload.toString(),
    credentials: 'include',
    redirect: 'manual'
  });

  console.log('[API] submitBundleReservation:response', {
    status: response.status,
    redirected: response.redirected
  });

  if (isRedirectStatus(response.status)) {
    const locationHeader = response.headers.get('location') || '';
    const normalizedLocation = normalizeLocationPath(locationHeader);
    console.log('[API] submitBundleReservation:redirect', {
      locationHeader,
      normalizedLocation
    });
    if (normalizedLocation?.startsWith('/payment/')) {
      const paymentUrl = buildUrl(normalizedLocation);
      const reservationId = normalizedLocation.split('/').pop();
      console.log('[API] submitBundleReservation:success', {
        paymentUrl,
        reservationId
      });
      return {
        success: true,
        paymentPath: normalizedLocation,
        paymentUrl,
        reservationId
      };
    }

    if (normalizedLocation?.startsWith('/login')) {
      console.log('[API] submitBundleReservation:login-required');
      throw new ApiError('يرجى تسجيل الدخول قبل التقديم على الباقة.', 401);
    }

    throw new ApiError('تعذر تأكيد الحجز، يرجى مراجعة البيانات والمحاولة مجدداً.', response.status);
  }

  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();
  const trimmedBody = rawBody?.trim?.() || '';

  console.log('[API] submitBundleReservation:nonRedirectBody', {
    status: response.status,
    contentType,
    preview: trimmedBody.slice(0, 200)
  });

  if (looksLikeHtmlDocument(contentType, trimmedBody)) {
    const reservationId = extractReservationIdFromHtml(rawBody);
    if (reservationId) {
      const paymentPath = `/payment/${reservationId}`;
      const paymentUrl = buildUrl(paymentPath);
      console.log('[API] submitBundleReservation:htmlSuccess', { reservationId, paymentPath });
      return {
        success: true,
        paymentPath,
        paymentUrl,
        reservationId
      };
    }
  }

  let data = null;
  if (trimmedBody) {
    try {
      data = JSON.parse(trimmedBody);
    } catch (_error) {
      data = { message: trimmedBody };
    }
  }

  const message = deriveErrorMessage(data, 'تعذر إرسال طلب الحجز.');
  throw new ApiError(message, response.status, data);
};

export const fetchReservationPaymentSummary = async (reservationId) => {
  if (!reservationId) {
    throw new Error('معرف الحجز مطلوب.');
  }
  const { data } = await request(`/api/mobile/reservations/${reservationId}/payment-summary`);
  if (!data?.success || !data?.reservation) {
    throw new Error(data?.message || 'تعذر تحميل تفاصيل الدفع.');
  }
  return data;
};

// Bundle Travel Request - submit multi-step form to backend
export const submitBundleRequest = async (formData) => {
  try {
    const { data } = await request('/api/mobile/bundle-request', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    if (!data?.success) {
      throw new Error(data?.message || 'تعذر إرسال الطلب.');
    }
    return data;
  } catch (error) {
    console.log('[API] submitBundleRequest:error', error?.message);
    throw error;
  }
};

// Airport API calls
export const fetchAirports = async () => {
  try {
    const { data } = await request('/api/airports');
    if (!data?.success) {
      throw new Error(data?.message || 'تعذر تحميل قائمة المطارات.');
    }
    return data?.data || [];
  } catch (error) {
    console.log('[API] fetchAirports:error', error?.message);
    throw error;
  }
};

export const fetchAirportById = async (airportId) => {
  if (!airportId) {
    throw new Error('معرف المطار مطلوب.');
  }
  try {
    const { data } = await request(`/api/airports/${airportId}`);
    if (!data?.success) {
      throw new Error(data?.message || 'تعذر تحميل بيانات المطار.');
    }
    return data?.data;
  } catch (error) {
    console.log('[API] fetchAirportById:error', error?.message);
    throw error;
  }
};

// Airline API calls
export const fetchAirlines = async () => {
  try {
    const { data } = await request('/api/airlines');
    if (!data?.success) {
      throw new Error(data?.message || 'تعذر تحميل قائمة شركات الطيران.');
    }
    return data?.data || [];
  } catch (error) {
    console.log('[API] fetchAirlines:error', error?.message);
    throw error;
  }
};

export const fetchAirlineById = async (airlineId) => {
  if (!airlineId) {
    throw new Error('معرف شركة الطيران مطلوب.');
  }
  try {
    const { data } = await request(`/api/airlines/${airlineId}`);
    if (!data?.success) {
      throw new Error(data?.message || 'تعذر تحميل بيانات شركة الطيران.');
    }
    return data?.data;
  } catch (error) {
    console.log('[API] fetchAirlineById:error', error?.message);
    throw error;
  }
};

export const searchBundles = async (query = '') => {
  const types = ['omrah', 'internal_tour', 'external_tour', '7ag', 'ramadan'];
  try {
    const promises = types.map(type => 
      fetchBundlesList({ type, going_route: query, limit: 50 }).catch(err => {
        console.log(`[API] searchBundles error for type ${type}:`, err?.message);
        return { success: false, cards: [] };
      })
    );
    const results = await Promise.all(promises);
    let allCards = [];
    results.forEach(res => {
      if (res && res.success && Array.isArray(res.cards)) {
        allCards = allCards.concat(res.cards);
      }
    });

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      allCards = allCards.filter(card => {
        return (
          String(card.name || '').toLowerCase().includes(q) ||
          String(card.going_route || '').toLowerCase().includes(q) ||
          String(card.plane_company || '').toLowerCase().includes(q) ||
          String(card.code || '').toLowerCase().includes(q)
        );
      });
    }

    return { success: true, cards: allCards };
  } catch (error) {
    console.log('[API] searchBundles:error', error?.message);
    return { success: false, cards: [] };
  }
};

export default {
  signupUser,
  loginUser,
  fetchBundlesOverview,
  fetchBundlesList,
  fetchBundleDetails,
  fetchProfileOverview,
  changePassword,
  uploadProfileImage,
  fetchUserFavorites,
  toggleFavorite,
  logoutUser,
  ensureChatThread,
  fetchChatMessages,
  sendChatMessage,
  fetchChatThreads,
  submitBundleReservation,
  fetchReservationPaymentSummary,
  submitBundleRequest,
  fetchAirports,
  fetchAirportById,
  fetchAirlines,
  fetchAirlineById,
  searchBundles
};
