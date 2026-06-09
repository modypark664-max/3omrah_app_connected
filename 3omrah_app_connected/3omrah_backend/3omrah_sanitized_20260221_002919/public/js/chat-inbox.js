(function () {
  if (typeof window === 'undefined') return;

  const inboxStates = new Set();
  let socket = null;
  let socketListenersBound = false;
  let ownerRoomSubscribed = false;

  const ready = () => {
    const containers = document.querySelectorAll('[data-chat-inbox]');
    if (!containers.length) return;
    containers.forEach((root) => setupInbox(root));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }

  function setupInbox(root) {
    const user = window.__appUser || null;
    const state = {
      root,
      user,
      scope: root.getAttribute('data-scope') || 'owner',
      threads: [],
      searchQuery: '',
      messages: new Map(),
      activeThreadId: null,
      activeThreadMeta: null,
      joinedThreads: new Set(),
      pendingThreadReload: null,
      refs: collectRefs(root),
    };

    inboxStates.add(state);

    if (!user) {
      markDisabled(state, 'يجب تسجيل الدخول للرد على استفسارات العملاء.');
      return;
    }

    attachEvents(state);
    ensureSocket();
    subscribeOwnerChannel(state);
    loadThreads(state);
  }

  function collectRefs(root) {
    return {
      search: root.querySelector('[data-thread-search]'),
      refreshBtn: root.querySelector('[data-action="refreshThreads"]'),
      list: root.querySelector('[data-thread-list]'),
      empty: root.querySelector('[data-thread-empty]'),
      loader: root.querySelector('[data-inbox-loader]'),
      toast: root.querySelector('[data-chat-toast]'),
      conversation: root.querySelector('[data-conversation]'),
      placeholder: root.querySelector('[data-conversation-placeholder]'),
      messages: root.querySelector('[data-messages]'),
      form: root.querySelector('[data-message-form]'),
      input: root.querySelector('[data-message-input]'),
      sendBtn: root.querySelector('[data-send-button]'),
      cardCode: root.querySelector('[data-active-card-code]'),
      cardRoute: root.querySelector('[data-active-card-route]'),
      viewerMeta: root.querySelector('[data-active-viewer]'),
      openCardBtn: root.querySelector('[data-open-card]'),
    };
  }

  function attachEvents(state) {
    const { search, refreshBtn, list, form, input } = state.refs;

    if (search) {
      search.addEventListener('input', (event) => {
        state.searchQuery = event.target.value.trim();
        renderThreadList(state);
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => loadThreads(state));
    }

    if (list) {
      list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-thread-id]');
        if (!button) return;
        const threadId = button.getAttribute('data-thread-id');
        if (threadId) {
          selectThread(state, threadId);
        }
      });
    }

    if (form) {
      form.addEventListener('submit', (event) => handleSendMessage(event, state));
    }

    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (state.refs.form) {
            state.refs.form.requestSubmit();
          }
        }
      });
      input.disabled = true;
    }

    toggleConversation(state, false);
  }

  function ensureSocket() {
    if (socket || typeof io === 'undefined') return socket;
    socket = io();
    console.log('[chat-inbox] Socket created, connecting...');

    if (!socketListenersBound) {
      socketListenersBound = true;
      socket.on('chat:message', (payload) => {
        console.log('[chat-inbox] chat:message received', payload?.threadId);
        inboxStates.forEach((state) => handleIncomingMessage(state, payload));
      });
      socket.on('chat:thread-update', (payload) => {
        console.log('[chat-inbox] chat:thread-update received', payload?.threadId);
        inboxStates.forEach((state) => handleThreadUpdate(state, payload));
      });
      socket.on('chat:error', (payload) => {
        console.warn('[chat-inbox] chat:error', payload);
        inboxStates.forEach((state) => showToast(state, payload?.message || 'حدث خطأ في المحادثة', 'error'));
      });
      socket.on('connect', () => {
        console.log('[chat-inbox] Socket connected, id:', socket.id);
        ownerRoomSubscribed = false;
        inboxStates.forEach((state) => {
          if (state.scope === 'owner') {
            subscribeOwnerChannel(state, true);
          }
          if (state.joinedThreads) {
            state.joinedThreads.clear();
            autoJoinThreads(state);
          }
        });
      });
      socket.on('disconnect', () => {
        console.warn('[chat-inbox] Socket disconnected');
        ownerRoomSubscribed = false;
      });
      socket.on('connect_error', (error) => {
        console.error('[chat-inbox] connect_error', error?.message || error);
      });
    }

    return socket;
  }

  async function loadThreads(state) {
    if (!state.user) return;
    setLoading(state, true, 'جاري تحديث قائمة المحادثات...');
    try {
      const response = await fetch(`/api/chat/threads?scope=${encodeURIComponent(state.scope)}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('FAILED_TO_LOAD_THREADS');
      }
  const data = await response.json();
  state.threads = Array.isArray(data.threads) ? data.threads : [];
  console.log('[chat-inbox] Threads loaded', state.threads.length, 'scope:', state.scope);
    autoJoinThreads(state);
      renderThreadList(state);

      if (state.activeThreadId) {
        const refreshed = state.threads.find((thread) => thread._id === state.activeThreadId);
        if (refreshed) {
          state.activeThreadMeta = refreshed;
          updateConversationHeader(state, refreshed);
        } else {
          clearConversation(state);
        }
      } else {
        const firstThread = state.threads.find((thread) => thread.unreadCount > 0) || state.threads[0];
        if (firstThread) {
          selectThread(state, firstThread._id);
        }
      }
    } catch (error) {
      console.error('Chat inbox load error:', error);
      showToast(state, 'تعذر تحميل المحادثات الآن', 'error');
    } finally {
      setLoading(state, false);
    }
  }

  function renderThreadList(state) {
    const { list, empty } = state.refs;
    if (!list || !empty) return;

    const query = (state.searchQuery || '').toLowerCase();
    let filtered = state.threads.slice();

    if (query) {
      filtered = filtered.filter((thread) => matchesQuery(thread, query));
    }

    list.innerHTML = filtered
      .map((thread) => buildThreadTemplate(thread, state.activeThreadId))
      .join('');

    if (!filtered.length) {
      empty.hidden = false;
      empty.textContent = state.threads.length
        ? 'لا توجد نتائج مطابقة لبحثك'
        : 'لا توجد محادثات بعد';
    } else {
      empty.hidden = true;
    }
  }

  function matchesQuery(thread, query) {
    if (!thread) return false;
    const card = thread.card || {};
    const viewer = thread.viewer || {};
    const haystack = [
      card.code,
      card.company,
      card.going_route,
      card.returning_route,
      viewer.username,
      viewer.companyName,
      viewer.phoneNumber,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    return haystack.some((value) => value.includes(query));
  }

  function buildThreadTemplate(thread, activeThreadId) {
    const isActive = thread._id === activeThreadId;
    const card = thread.card || {};
    const viewer = thread.viewer || {};
    const timeLabel = formatRelativeTime(thread.lastMessageAt);
    const unread = thread.unreadCount || 0;
    const preview = thread.lastMessagePreview || 'لا توجد رسائل بعد';

    return `
      <li>
        <button type="button" class="${isActive ? 'active' : ''}" data-thread-id="${thread._id}">
          <div class="chat-thread-top-row">
            <span>${card.code ? `عرض ${card.code}` : 'عرض خاص'}</span>
            <span>${timeLabel}</span>
          </div>
          <div class="chat-thread-viewer">${viewer.username || viewer.companyName || 'مستخدم'}</div>
          <div class="chat-thread-preview">
            <span>${preview}</span>
          </div>
          ${unread ? `<span class="chat-thread-unread">${unread}</span>` : ''}
        </button>
      </li>
    `;
  }

  async function selectThread(state, threadId) {
    if (!threadId || state.loadingThread === threadId) return;
    state.loadingThread = threadId;
    setLoading(state, true, 'جاري فتح المحادثة...');

    try {
      const response = await fetch(`/api/chat/thread/${threadId}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error('THREAD_NOT_FOUND');
      }
      const data = await response.json();
      const messages = Array.isArray(data.messages)
        ? data.messages.map((message) => normalizeMessage(message, state)).filter(Boolean)
        : [];

      state.activeThreadId = threadId;
      state.activeThreadMeta = data.thread;
      state.messages.set(threadId, messages);

      renderThreadList(state);
      updateConversationHeader(state, data.thread);
      renderMessages(state, messages);
      toggleConversation(state, true);
      markThreadRead(state, threadId);
      joinThreadRoom(state, threadId);
    } catch (error) {
      console.error('Failed to open thread:', error);
      showToast(state, 'تعذر فتح هذه المحادثة', 'error');
    } finally {
      state.loadingThread = null;
      setLoading(state, false);
    }
  }

  function renderMessages(state, messages) {
    const container = state.refs.messages;
    if (!container) return;
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();
    messages.forEach((message) => {
      const wrapper = document.createElement('div');
      const classes = ['chat-message', message.isMine ? 'mine' : 'theirs'];
      if (message.pending) {
        classes.push('pending');
      }
      wrapper.className = classes.join(' ');
      const senderLabel = message.isMine ? 'أنت' : message.sender?.username || 'العميل';
      const metaText = `${senderLabel} · ${formatMessageTime(message.sentAt)}`;
      const status = message.pending ? '<span class="chat-message-status">جارٍ الإرسال...</span>' : '';
      wrapper.innerHTML = `
        <div>${message.body}</div>
        <div class="chat-message-meta">
          ${metaText}
          ${status}
        </div>
      `;
      fragment.appendChild(wrapper);
    });

    container.appendChild(fragment);
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });

    setComposerEnabled(state, Boolean(state.activeThreadId));
  }

  function normalizeMessage(message, state) {
    if (!message) return null;
    const senderId = message.sender?._id || message.sender;
    const userId = state.user?._id;
    const isMine = senderId && userId ? String(senderId) === String(userId) : false;
    return {
      ...message,
      sentAt: message.sentAt || message.createdAt || new Date().toISOString(),
      isMine,
    };
  }

  function toggleConversation(state, isVisible) {
    const { conversation, placeholder } = state.refs;
    if (!conversation || !placeholder) return;
    conversation.hidden = !isVisible;
    placeholder.hidden = isVisible;
    if (!isVisible) {
      setComposerEnabled(state, false);
      if (state.refs.messages) {
        state.refs.messages.innerHTML = '';
      }
    }
  }

  function setComposerEnabled(state, enabled) {
    if (state.refs.input) {
      state.refs.input.disabled = !enabled;
    }
    if (state.refs.sendBtn) {
      state.refs.sendBtn.disabled = !enabled;
    }
  }

  function setLoading(state, isLoading, label) {
    const loader = state.refs.loader;
    if (!loader) return;
    loader.textContent = label || loader.textContent || 'جاري التحميل...';
    loader.hidden = !isLoading;
    state.root.classList.toggle('chat-inbox--loading', Boolean(isLoading));
  }

  function showToast(state, message, variant = 'info') {
    const toast = state.refs.toast;
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('error', 'success');
    if (variant === 'error') {
      toast.classList.add('error');
    } else if (variant === 'success') {
      toast.classList.add('success');
    }
    toast.hidden = false;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  function updateConversationHeader(state, thread) {
    if (!thread) return;
    const card = thread.card || {};
    const viewer = thread.viewer || {};
    if (state.refs.cardCode) {
      state.refs.cardCode.textContent = card.code ? `عرض ${card.code}` : 'عرض خاص';
    }
    if (state.refs.cardRoute) {
      const routeParts = [card.going_route, card.returning_route].filter(Boolean);
      state.refs.cardRoute.textContent = routeParts.length ? routeParts.join(' ⇆ ') : (card.type || '—');
    }
    if (state.refs.viewerMeta) {
      const phone = viewer.phoneNumber || 'بدون رقم';
      state.refs.viewerMeta.textContent = `${viewer.username || 'مستخدم'} • ${phone}`;
    }
    if (state.refs.openCardBtn) {
      if (card._id) {
        state.refs.openCardBtn.hidden = false;
        state.refs.openCardBtn.href = `/card/${card._id}`;
      } else {
        state.refs.openCardBtn.hidden = true;
      }
    }
  }

  function markThreadRead(state, threadId) {
    const thread = state.threads.find((item) => item._id === threadId);
    if (thread) {
      thread.unreadCount = 0;
      renderThreadList(state);
    }
  }

  function joinThreadRoom(state, threadId) {
    const instance = ensureSocket();
    if (!instance || !threadId) return;
    if (state.joinedThreads.has(threadId)) return;
    instance.emit('chat:join', { threadId });
    console.log('[chat-inbox] chat:join emitted', threadId, 'scope:', state.scope);
    state.joinedThreads.add(threadId);
  }

  function autoJoinThreads(state) {
    if (!Array.isArray(state.threads) || !state.threads.length) return;
    state.threads.forEach((thread) => {
      if (thread?._id) {
        joinThreadRoom(state, thread._id);
      }
    });
  }

  async function handleSendMessage(event, state) {
    event.preventDefault();
    if (!state.activeThreadId) {
      showToast(state, 'اختر محادثة لكتابة رسالة', 'error');
      return;
    }
    const textarea = state.refs.input;
    if (!textarea) return;
    const body = textarea.value.trim();
    if (!body) {
      showToast(state, 'لا يمكن إرسال رسالة فارغة', 'error');
      return;
    }

    setComposerWorking(state, true);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const pendingMessage = {
      _id: tempId,
      clientMessageId: tempId,
      body,
      sentAt: new Date().toISOString(),
      isMine: true,
      pending: true,
    };
    textarea.value = '';
    const list = state.messages.get(state.activeThreadId) || [];
    list.push(pendingMessage);
    state.messages.set(state.activeThreadId, list);
    renderMessages(state, list);
    updateThreadPreview(state, state.activeThreadId, pendingMessage);
    try {
      const response = await fetch(`/api/chat/thread/${state.activeThreadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: body, clientMessageId: tempId }),
      });
      if (!response.ok) {
        throw new Error('FAILED_TO_SEND');
      }
      const data = await response.json();
      const normalized = normalizeMessage(data.message, state);
      if (!normalized) {
        throw new Error('EMPTY_MESSAGE');
      }
      normalized.pending = false;
      const current = state.messages.get(state.activeThreadId) || [];
      const matchByClient = normalized.clientMessageId
        ? current.findIndex((message) => message.clientMessageId === normalized.clientMessageId)
        : -1;
      const matchByTemp = matchByClient === -1 ? current.findIndex((message) => message._id === tempId) : -1;
      const targetIndex = matchByClient !== -1 ? matchByClient : matchByTemp;
      if (targetIndex !== -1) {
        current[targetIndex] = normalized;
      } else {
        current.push(normalized);
      }
      state.messages.set(state.activeThreadId, current);
      renderMessages(state, current);
      updateThreadPreview(state, state.activeThreadId, normalized);
    } catch (error) {
      console.error('Send message error:', error);
      const current = state.messages.get(state.activeThreadId) || [];
      const index = current.findIndex(
        (message) => message._id === tempId || message.clientMessageId === tempId
      );
      if (index !== -1) {
        current.splice(index, 1);
        state.messages.set(state.activeThreadId, current);
        renderMessages(state, current);
      }
      textarea.value = body;
      showToast(state, 'تعذر إرسال الرسالة الآن', 'error');
    } finally {
      setComposerWorking(state, false);
    }
  }

  function setComposerWorking(state, isWorking) {
    if (state.refs.sendBtn) {
      state.refs.sendBtn.disabled = isWorking;
      state.refs.sendBtn.textContent = isWorking ? 'جارٍ الإرسال...' : 'إرسال';
    }
    if (state.refs.input && isWorking) {
      state.refs.input.setAttribute('data-busy', 'true');
    } else if (state.refs.input) {
      state.refs.input.removeAttribute('data-busy');
    }
  }

  function updateThreadPreview(state, threadId, message) {
    const thread = state.threads.find((item) => item._id === threadId);
    if (!thread) return;
    thread.lastMessagePreview = message.body;
    thread.lastMessageAt = message.sentAt;
    thread.unreadCount = 0;
    renderThreadList(state);
  }

  function handleIncomingMessage(state, payload) {
    const threadId = payload?.threadId;
    const rawMessage = payload?.message;
  if (!threadId || !rawMessage) return;
  console.log('[chat-inbox] handleIncomingMessage for thread', threadId);

    const normalized = normalizeMessage(rawMessage, state);
    if (!normalized) return;
    const resolvedMessage = { ...normalized, pending: false };
    const messages = state.messages.get(threadId) || [];

    let handled = false;
    if (resolvedMessage.clientMessageId) {
      const clientIndex = messages.findIndex(
        (message) => message.clientMessageId && message.clientMessageId === resolvedMessage.clientMessageId
      );
      if (clientIndex !== -1) {
        messages[clientIndex] = resolvedMessage;
        handled = true;
      }
    }

    if (!handled && resolvedMessage._id) {
      const existingIndex = messages.findIndex((message) => message._id === resolvedMessage._id);
      if (existingIndex !== -1) {
        messages[existingIndex] = resolvedMessage;
        handled = true;
      }
    }

    if (!handled) {
      messages.push(resolvedMessage);
    }
    state.messages.set(threadId, messages);

    const thread = state.threads.find((item) => item._id === threadId);

    if (state.activeThreadId === threadId) {
      renderMessages(state, messages);
      markThreadRead(state, threadId);
    } else {
      if (thread && !normalized.isMine) {
        thread.unreadCount = (thread.unreadCount || 0) + 1;
      }
      if (state.scope === 'owner' && !normalized.isMine) {
        notifyOwnerNewMessage(state, thread, normalized.body);
      }
    }

    if (thread) {
      thread.lastMessagePreview = normalized.body;
      thread.lastMessageAt = normalized.sentAt;
      renderThreadList(state);
    } else {
      queueThreadReload(state);
    }
  }

  function subscribeOwnerChannel(state, force = false) {
    if (state.scope !== 'owner') return;
    const role = (state.user?.role || '').toLowerCase();
    if (role !== 'partner' && role !== 'admin') return;
    const instance = ensureSocket();
    if (!instance) return;
    if (!instance.connected) {
      ownerRoomSubscribed = false;
      return;
    }
    if (ownerRoomSubscribed && !force) return;
    instance.emit('chat:subscribeOwner');
    console.log('[chat-inbox] chat:subscribeOwner emitted for role', role);
    ownerRoomSubscribed = true;
  }

  function handleThreadUpdate(state, payload) {
    if (state.scope !== 'owner') return;
    const threadId = payload?.threadId;
    if (!threadId) return;

    const thread = state.threads.find((item) => item._id === threadId);
    if (!thread) {
      queueThreadReload(state, 'وصلتك رسالة جديدة ويتم تحديث القائمة الآن...');
      return;
    }

    if (payload.lastMessagePreview) {
      thread.lastMessagePreview = payload.lastMessagePreview;
    }
    if (payload.lastMessageAt) {
      thread.lastMessageAt = payload.lastMessageAt;
    }

    const isMine = payload.senderId && state.user?._id && String(payload.senderId) === String(state.user._id);

    if (state.activeThreadId !== threadId && !isMine) {
      thread.unreadCount = (thread.unreadCount || 0) + 1;
      notifyOwnerNewMessage(state, thread, payload.lastMessagePreview);
    }

    renderThreadList(state);

    if (!state.joinedThreads.has(threadId)) {
      joinThreadRoom(state, threadId);
    }
  }

  function notifyOwnerNewMessage(state, thread, preview) {
    if (state.scope !== 'owner') return;
  const base = typeof preview === 'string' ? preview : (preview ? String(preview) : 'لديك رسالة جديدة');
  const text = base.trim();
    const clipped = text.length > 120 ? `${text.slice(0, 120)}…` : text;
    if (!thread) {
      showToast(state, `محادثة جديدة: ${clipped}`);
      return;
    }
    const viewerLabel = thread.viewer?.username || thread.viewer?.companyName || 'عميل';
    const cardLabel = thread.card?.code ? `عرض ${thread.card.code}` : 'عرض خاص';
    showToast(state, `${viewerLabel} • ${cardLabel}: ${clipped}`);
  }

  function queueThreadReload(state, toastMessage) {
    if (!state || state.pendingThreadReload) return;
    if (toastMessage) {
      showToast(state, toastMessage);
    }
    state.pendingThreadReload = true;
    Promise.resolve(loadThreads(state)).finally(() => {
      state.pendingThreadReload = null;
      console.log('[chat-inbox] Thread reload finished');
    });
  }

  function clearConversation(state) {
    state.activeThreadId = null;
    state.activeThreadMeta = null;
    toggleConversation(state, false);
  }

  function markDisabled(state, message) {
    state.root.classList.add('chat-inbox--disabled');
    if (state.refs.placeholder) {
      state.refs.placeholder.hidden = false;
      state.refs.placeholder.innerHTML = `<p style="color:#ef4444; font-weight:600;">${message}</p>`;
    }
  }

  function formatRelativeTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes === 1) return 'منذ دقيقة';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return 'منذ ساعة';
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  }

  function formatMessageTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  }
})();
