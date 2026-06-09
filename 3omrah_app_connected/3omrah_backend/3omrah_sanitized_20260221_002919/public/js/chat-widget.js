(function () {
  if (typeof window === 'undefined') return;

  const state = {
    user: window.__appUser || null,
    root: null,
    socket: null,
    activeThreadId: null,
    cardThreadMap: new Map(),
    threadCache: new Map(),
    toastTimer: null,
    refs: {}
  };

  const STYLE_ID = 'card-chat-widget-styles';
  const DEFAULT_CARD_IMAGE = '/imgs/logo.png';

  const TEMPLATE = `
    <div class="ccw-header">
      <div>
        <p class="ccw-header-title">محادثة حول هذه الباقة</p>
        <p class="ccw-header-subtitle">تواصل مباشر مع فريق المنصة</p>
      </div>
      <button type="button" class="ccw-close" aria-label="إغلاق المحادثة">&times;</button>
    </div>
    <div class="ccw-card-preview">
      <img class="ccw-card-image" src="${DEFAULT_CARD_IMAGE}" alt="عرض سياحي" />
      <div class="ccw-card-meta">
        <span class="ccw-card-code">جاري تحميل بيانات العرض...</span>
        <span class="ccw-card-route">سنقوم بتحديث تفاصيل الرحلة خلال لحظات</span>
      </div>
    </div>
    <div class="ccw-owner-line">
      <span class="ccw-owner">فريق منصة رحلة عمرة</span>
      <span class="ccw-status">محادثة خاصة وآمنة</span>
    </div>
    <div class="ccw-body">
      <div class="ccw-empty">أرسل أول رسالة لطرح سؤالك حول هذه الباقة ✨</div>
      <div class="ccw-messages"></div>
    </div>
    <form class="ccw-form" autocomplete="off">
      <textarea class="ccw-textarea" rows="2" placeholder="اكتب رسالتك هنا..." maxlength="2000"></textarea>
      <div class="ccw-input-row">
        <small class="ccw-hint">اضغط Enter للإرسال وShift+Enter لسطر جديد</small>
        <button type="submit" class="ccw-send-btn">إرسال</button>
      </div>
    </form>
    <div class="ccw-toast" hidden></div>
    <div class="ccw-loader">
      <span>جاري التحميل...</span>
    </div>
  `;

  const STYLES = `
.card-chat-widget {
  position: fixed;
  bottom: 24px;
  left: 24px;
  width: min(380px, calc(100% - 32px));
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
  font-family: 'Cairo', 'Tajawal', sans-serif;
  direction: rtl;
  z-index: 2500;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(calc(100% + 40px));
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.25s ease;
}
.card-chat-widget.is-open {
  transform: translateY(0);
  opacity: 1;
}
.card-chat-widget .ccw-header {
  background: linear-gradient(135deg, #1e5470, #34729c);
  color: #fff;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.card-chat-widget .ccw-header-title {
  font-size: 1.1rem;
  margin: 0;
}
.card-chat-widget .ccw-header-subtitle {
  margin: 4px 0 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
.card-chat-widget .ccw-close {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: background 0.2s ease;
}
.card-chat-widget .ccw-close:hover {
  background: rgba(255, 255, 255, 0.3);
}
.card-chat-widget .ccw-card-preview {
  display: flex;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  align-items: center;
}
.card-chat-widget .ccw-card-image {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(15, 23, 42, 0.1);
}
.card-chat-widget .ccw-card-code {
  font-weight: 700;
  color: #0f172a;
  display: block;
}
.card-chat-widget .ccw-card-route {
  font-size: 0.85rem;
  color: #475569;
}
.card-chat-widget .ccw-owner-line {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
  font-size: 0.9rem;
  border-bottom: 1px solid #f1f5f9;
}
.card-chat-widget .ccw-owner {
  font-weight: 600;
  color: #1e5470;
}
.card-chat-widget .ccw-status {
  color: #059669;
}
.card-chat-widget .ccw-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow: hidden;
}
.card-chat-widget .ccw-messages {
  flex: 1;
  overflow-y: auto;
  padding-left: 4px;
}
.card-chat-widget .ccw-empty {
  text-align: center;
  color: #94a3b8;
  font-size: 0.9rem;
}
.card-chat-widget .ccw-message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 16px;
  margin-bottom: 12px;
  line-height: 1.6;
  font-size: 0.95rem;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
}
.card-chat-widget .ccw-message.mine {
  background: linear-gradient(135deg, #1e5470, #2f6a8c);
  color: #fff;
  margin-left: auto;
}
.card-chat-widget .ccw-message.theirs {
  background: #f8fafc;
  color: #0f172a;
  margin-right: auto;
}
.card-chat-widget .ccw-message.pending {
  opacity: 0.75;
}
.card-chat-widget .ccw-message-meta {
  margin-top: 6px;
  font-size: 0.75rem;
  opacity: 0.8;
  display: flex;
  gap: 10px;
}
.card-chat-widget .ccw-message-status {
  color: #facc15;
  font-weight: 600;
}
.card-chat-widget .ccw-form {
  border-top: 1px solid #f1f5f9;
  padding: 16px 20px 20px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card-chat-widget .ccw-textarea {
  resize: none;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 0.95rem;
  min-height: 70px;
  font-family: inherit;
  transition: border 0.2s ease, box-shadow 0.2s ease;
}
.card-chat-widget .ccw-textarea:focus {
  border-color: #1e5470;
  box-shadow: 0 0 0 2px rgba(30, 84, 112, 0.2);
  outline: none;
}
.card-chat-widget .ccw-input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.card-chat-widget .ccw-hint {
  font-size: 0.8rem;
  color: #94a3b8;
}
.card-chat-widget .ccw-send-btn {
  background: linear-gradient(135deg, #1e5470, #34729c);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card-chat-widget .ccw-send-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.card-chat-widget .ccw-send-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(30, 84, 112, 0.3);
}
.card-chat-widget .ccw-toast {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 20px;
  right: 20px;
  background: #1e5470;
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.85rem;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.25);
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.card-chat-widget .ccw-toast.visible {
  opacity: 1;
  transform: translateY(0);
}
.card-chat-widget .ccw-toast.error { background: #dc2626; }
.card-chat-widget .ccw-toast.warning { background: #d97706; }
.card-chat-widget .ccw-loader {
  position: absolute;
  inset: 0;
  background: rgba(248, 250, 252, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #1e5470;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.card-chat-widget.is-loading .ccw-loader {
  opacity: 1;
  pointer-events: auto;
}
.card-chat-widget.is-loading .ccw-body,
.card-chat-widget.is-loading .ccw-form {
  filter: blur(1px);
  pointer-events: none;
}
@media (max-width: 640px) {
  .card-chat-widget {
    width: calc(100% - 20px);
    left: 10px;
    bottom: 10px;
    border-radius: 16px;
  }
}
`;

  function parseUserFromDom() {
    const container = document.querySelector('[data-current-user]');
    if (!container) return null;
    const payload = container.getAttribute('data-current-user');
    if (!payload) return null;
    try {
      const parsed = JSON.parse(payload.replace(/&quot;/g, '"'));
      window.__appUser = parsed;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function ensureUser() {
    if (!state.user) {
      state.user = window.__appUser || parseUserFromDom();
    }
    return state.user;
  }

  function redirectToLogin() {
    const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/login?next=${next}`;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function buildWidget() {
    if (state.root) return;
    injectStyles();
    const wrapper = document.createElement('div');
    wrapper.className = 'card-chat-widget';
    wrapper.setAttribute('dir', 'rtl');
    wrapper.innerHTML = TEMPLATE;
    document.body.appendChild(wrapper);

    state.root = wrapper;
    state.refs = {
      closeBtn: wrapper.querySelector('.ccw-close'),
      headerSubtitle: wrapper.querySelector('.ccw-header-subtitle'),
      owner: wrapper.querySelector('.ccw-owner'),
      status: wrapper.querySelector('.ccw-status'),
      cardImage: wrapper.querySelector('.ccw-card-image'),
      cardCode: wrapper.querySelector('.ccw-card-code'),
      cardRoute: wrapper.querySelector('.ccw-card-route'),
      messages: wrapper.querySelector('.ccw-messages'),
      empty: wrapper.querySelector('.ccw-empty'),
      textarea: wrapper.querySelector('.ccw-textarea'),
      sendBtn: wrapper.querySelector('.ccw-send-btn'),
      form: wrapper.querySelector('.ccw-form'),
      toast: wrapper.querySelector('.ccw-toast'),
      loader: wrapper.querySelector('.ccw-loader')
    };

    state.refs.closeBtn.addEventListener('click', closeWidget);
    state.refs.form.addEventListener('submit', handleSubmit);
    state.refs.textarea.addEventListener('keydown', handleTextareaKey);
  }

  function showWidget() {
    buildWidget();
    state.root.classList.add('is-open');
    requestAnimationFrame(() => state.refs.textarea.focus());
  }

  function closeWidget() {
    if (state.activeThreadId) {
      leaveRoom(state.activeThreadId);
    }
    state.activeThreadId = null;
    if (state.root) {
      state.root.classList.remove('is-open');
    }
  }

  function setLoading(isLoading, label) {
    if (!state.root) return;
    state.root.classList.toggle('is-loading', Boolean(isLoading));
    if (label && state.refs.loader) {
      state.refs.loader.querySelector('span').textContent = label;
    }
  }

  function setStatus(text) {
    if (state.refs.status) {
      state.refs.status.textContent = text;
    }
  }

  function updateThreadUI(thread) {
    if (!thread || !state.refs.cardCode) return;
    const card = thread.card || {};
    state.refs.cardCode.textContent = card.code ? `عرض ${card.code}` : 'عرض خاص';
    const routeParts = [card.going_route, card.returning_route].filter(Boolean);
    state.refs.cardRoute.textContent = routeParts.length ? routeParts.join(' → ') : (card.type || 'تفاصيل الرحلة ستظهر هنا');
    state.refs.cardImage.src = card.thumbnail || DEFAULT_CARD_IMAGE;
    state.refs.cardImage.alt = card.code || 'عرض سياحي';
    const ownerName = thread.ownerDisplayName || 'فريق منصة رحلة عمرة';
    if (state.refs.owner) {
      state.refs.owner.textContent = ownerName;
    }
    if (state.refs.headerSubtitle) {
      state.refs.headerSubtitle.textContent = `تواصل مع ${ownerName}`;
    }
  }

  function ensureSocket() {
    if (state.socket || typeof io === 'undefined') return state.socket;
    state.socket = io();
    state.socket.on('connect_error', () => {
      showToast('تعذر الاتصال بالخادم، سيتم إعادة المحاولة تلقائياً', 'warning');
    });
    state.socket.on('chat:error', (payload) => {
      if (payload?.message) {
        showToast(payload.message, 'error');
      }
    });
    state.socket.on('chat:message', handleIncomingMessage);
    return state.socket;
  }

  function joinRoom(threadId) {
    if (!state.socket || !threadId) return;
    state.socket.emit('chat:join', { threadId });
  }

  function leaveRoom(threadId) {
    if (!state.socket || !threadId) return;
    state.socket.emit('chat:leave', { threadId });
  }

  function normalizeMessage(message) {
    if (!message) return null;
    const user = ensureUser();
    const senderId = message?.sender?._id || message?.sender;
    const mine = user && senderId && senderId.toString() === user._id?.toString();
    return {
      ...message,
      isMine: mine
    };
  }

  function handleIncomingMessage(payload) {
    const threadId = payload?.threadId;
    const message = normalizeMessage(payload?.message);
    if (!threadId || !message) return;
    const resolvedMessage = { ...message, pending: false };
    const existing = state.threadCache.get(threadId);
    const nextMessages = [...(existing?.messages || [])];

    let handled = false;
    if (resolvedMessage.clientMessageId) {
      const clientIndex = nextMessages.findIndex(
        (msg) => msg.clientMessageId && msg.clientMessageId === resolvedMessage.clientMessageId
      );
      if (clientIndex !== -1) {
        nextMessages[clientIndex] = resolvedMessage;
        handled = true;
      }
    }

    if (!handled && resolvedMessage._id) {
      const idx = nextMessages.findIndex((msg) => msg._id === resolvedMessage._id);
      if (idx !== -1) {
        nextMessages[idx] = resolvedMessage;
        handled = true;
      }
    }

    if (!handled) {
      nextMessages.push(resolvedMessage);
    }
    const entry = {
      thread: existing?.thread || null,
      messages: nextMessages
    };
    state.threadCache.set(threadId, entry);
    if (state.activeThreadId === threadId) {
      renderMessages(threadId);
    }
  }

  function escapeHtml(text = '') {
    return text.replace(/[&<>"']/g, (char) => (
      {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char] || char
    ));
  }

  function renderMessages(threadId) {
    if (!state.refs.messages) return;
    const entry = state.threadCache.get(threadId);
    const messages = entry?.messages || [];
    if (messages.length === 0) {
      if (state.refs.empty) state.refs.empty.style.display = 'block';
      state.refs.messages.innerHTML = '';
      return;
    }
    if (state.refs.empty) state.refs.empty.style.display = 'none';
    const formatter = new Intl.DateTimeFormat('ar-EG', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const html = messages.map((message) => {
      const safeBody = escapeHtml(message.body || '').replace(/\n/g, '<br>');
      const senderLabel = message.isMine ? 'أنا' : (message.sender?.username || message.sender?.companyName || 'المستخدم');
      const timestamp = message.sentAt || message.createdAt;
      const timeText = timestamp ? formatter.format(new Date(timestamp)) : '';
      const status = message.pending ? '<span class="ccw-message-status">جارٍ الإرسال...</span>' : '';
      return `
        <div class="ccw-message ${message.isMine ? 'mine' : 'theirs'} ${message.pending ? 'pending' : ''}">
          <div class="ccw-message-body">${safeBody}</div>
          <div class="ccw-message-meta">
            <span>${senderLabel}</span>
            <span>${timeText}</span>
            ${status}
          </div>
        </div>
      `;
    }).join('');
    state.refs.messages.innerHTML = html;
    state.refs.messages.scrollTop = state.refs.messages.scrollHeight;
  }

  async function requestThread(cardId) {
    const response = await fetch('/api/chat/thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ cardId })
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      const error = new Error(payload.message || 'يجب تسجيل الدخول لبدء المحادثة');
      error.code = 'AUTH_REQUIRED';
      throw error;
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'تعذر فتح المحادثة');
    }

    return payload;
  }

  async function openThread(cardId) {
    if (!cardId) return;
    if (!ensureUser()) {
      showToast('يرجى تسجيل الدخول لبدء المحادثة', 'warning');
      setTimeout(redirectToLogin, 1000);
      return;
    }

    showWidget();
    setLoading(true, 'جاري فتح المحادثة...');

    try {
      const cachedThreadId = state.cardThreadMap.get(cardId);
      if (cachedThreadId && state.threadCache.has(cachedThreadId)) {
        const cachedEntry = state.threadCache.get(cachedThreadId);
        state.activeThreadId = cachedThreadId;
        updateThreadUI(cachedEntry.thread);
        renderMessages(cachedThreadId);
        setStatus(cachedEntry.messages?.length ? 'تم تحديث المحادثة' : 'ابدأ محادثتك برسالة ترحيب ✨');
        ensureSocket();
        joinRoom(cachedThreadId);
        setLoading(false);
        return;
      }

      const data = await requestThread(cardId);
      const thread = data.thread;
      const messages = (data.messages || []).map(normalizeMessage);
      state.activeThreadId = thread._id;
      state.cardThreadMap.set(cardId, thread._id);
      state.threadCache.set(thread._id, { thread, messages });
      updateThreadUI(thread);
      renderMessages(thread._id);
      setStatus(messages.length ? 'تم تحديث المحادثة' : 'ابدأ محادثتك برسالة ترحيب ✨');
      ensureSocket();
      joinRoom(thread._id);
    } catch (error) {
      if (error.code === 'AUTH_REQUIRED') {
        showToast(error.message, 'warning');
        setTimeout(redirectToLogin, 1000);
      } else {
        showToast(error.message || 'تعذر فتح المحادثة', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!state.activeThreadId || !state.refs.textarea) return;
    const body = state.refs.textarea.value.trim();
    if (!body) {
      showToast('اكتب رسالة قبل الإرسال', 'warning');
      return;
    }
    await sendMessage(body);
  }

  async function sendMessage(body) {
    if (state.refs.sendBtn.disabled) return;
    state.refs.sendBtn.disabled = true;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pendingMessage = {
      _id: tempId,
      clientMessageId: tempId,
      body,
      sentAt: new Date().toISOString(),
      isMine: true,
      pending: true
    };
    const currentEntry = state.threadCache.get(state.activeThreadId) || { thread: state.threadCache.get(state.activeThreadId)?.thread || null, messages: [] };
    const optimisticMessages = [...(currentEntry.messages || []), pendingMessage];
    state.threadCache.set(state.activeThreadId, { thread: currentEntry.thread, messages: optimisticMessages });
    renderMessages(state.activeThreadId);
    state.refs.textarea.value = '';
    try {
      const response = await fetch(`/api/chat/thread/${state.activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ message: body, clientMessageId: tempId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'تعذر إرسال الرسالة');
      }
      const message = normalizeMessage(payload.message);
      message.pending = false;
      const existing = state.threadCache.get(state.activeThreadId) || { thread: null, messages: [] };
      const nextMessages = [...(existing.messages || [])];
      const matchByClient = message.clientMessageId
        ? nextMessages.findIndex((msg) => msg.clientMessageId === message.clientMessageId)
        : -1;
      const matchByTemp = matchByClient === -1 ? nextMessages.findIndex((msg) => msg._id === tempId) : -1;
      const targetIdx = matchByClient !== -1 ? matchByClient : matchByTemp;
      if (targetIdx !== -1) {
        nextMessages[targetIdx] = message;
      } else {
        nextMessages.push(message);
      }
      state.threadCache.set(state.activeThreadId, { thread: existing.thread, messages: nextMessages });
      renderMessages(state.activeThreadId);
    } catch (error) {
      const existing = state.threadCache.get(state.activeThreadId);
      if (existing?.messages?.length) {
        const filtered = existing.messages.filter(
          (msg) => msg._id !== tempId && msg.clientMessageId !== tempId
        );
        state.threadCache.set(state.activeThreadId, { thread: existing.thread, messages: filtered });
        renderMessages(state.activeThreadId);
      }
      state.refs.textarea.value = body;
      showToast(error.message || 'تعذر إرسال الرسالة', 'error');
    } finally {
      state.refs.sendBtn.disabled = false;
      state.refs.textarea.focus();
    }
  }

  function handleTextareaKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  function showToast(message, variant = 'info') {
    if (!state.refs.toast) return;
    const toast = state.refs.toast;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.remove('error', 'warning', 'visible');
    if (variant !== 'info') {
      toast.classList.add(variant);
    }
    requestAnimationFrame(() => toast.classList.add('visible'));

    if (state.toastTimer) {
      clearTimeout(state.toastTimer);
    }
    state.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => (toast.hidden = true), 200);
    }, 3500);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.root?.classList.contains('is-open')) {
      closeWidget();
    }
  });

  window.CardChatWidget = {
    open(cardId) {
      openThread(cardId);
    },
    close: closeWidget
  };
})();
