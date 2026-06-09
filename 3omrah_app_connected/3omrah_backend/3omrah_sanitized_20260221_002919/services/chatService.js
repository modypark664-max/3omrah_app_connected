const sanitizeHtml = require('sanitize-html');
const CardChatThread = require('../models/CardChatThread');
const CardChatMessage = require('../models/CardChatMessage');
const User = require('../models/User');

// Expo Push API endpoint
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Use global fetch if available, otherwise try node-fetch (for older Node versions)
let fetchFn = global.fetch;
if (!fetchFn) {
    try {
        // node-fetch v2/v3 compatibility
        // eslint-disable-next-line global-require
        const nf = require('node-fetch');
        fetchFn = nf.default || nf;
    } catch (err) {
        console.warn('[Push] node-fetch not available; push notifications may fail on this server runtime');
        fetchFn = null;
    }
}

// Send push notification via Expo Push API
const sendExpoPushNotification = async (tokens, title, body, data = {}) => {
    if (!tokens || tokens.length === 0) {
        console.log('[Push] No tokens to send to');
        return;
    }

    const messages = tokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        priority: 'high'
    }));

    try {
        if (!fetchFn) {
            console.warn('[Push] No fetch available to call Expo API');
            return;
        }
        const response = await fetchFn(EXPO_PUSH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        });

        const result = await response.json();
        console.log('[Push] Expo API response:', JSON.stringify(result));

        // Handle any errors in the tickets
        if (result.data) {
            result.data.forEach((ticket, idx) => {
                if (ticket.status === 'error') {
                    console.error(`[Push] Error for token ${tokens[idx]}: ${ticket.message}`);
                }
            });
        }
    } catch (error) {
        console.error('[Push] Failed to send notification:', error.message);
    }
};

// Send push notification for new chat message
const sendChatPushNotification = async (thread, message, senderId) => {
    if (!thread || !message) {
        console.log('[Push] sendChatPushNotification: missing thread or message');
        return;
    }

    try {
        // Determine recipient: if sender is viewer, notify owner; if sender is owner, notify viewer
        const senderIdStr = senderId?.toString();
        const viewerIdStr = (thread.viewer?._id || thread.viewer)?.toString();
        const ownerIdStr = (thread.owner?._id || thread.owner)?.toString();

        console.log('[Push] Determining recipient:', {
            senderId: senderIdStr,
            viewerId: viewerIdStr,
            ownerId: ownerIdStr,
            ownerType: thread.ownerType
        });

        let recipientId = null;
        if (senderIdStr === viewerIdStr) {
            // Sender is viewer, notify owner (but admin doesn't have push tokens on mobile)
            if (thread.ownerType === 'partner' && ownerIdStr) {
                recipientId = ownerIdStr;
                console.log('[Push] Sender is viewer, will notify partner owner');
            } else {
                console.log('[Push] Sender is viewer, owner is admin (no mobile push)');
            }
        } else {
            // Sender is owner/admin, notify viewer
            recipientId = viewerIdStr;
            console.log('[Push] Sender is owner/admin, will notify viewer');
        }

        if (!recipientId) {
            console.log('[Push] No recipient to notify');
            return;
        }

        // Get recipient's push tokens
        const recipient = await User.findById(recipientId).select('username expoPushTokens');
        console.log('[Push] Recipient lookup:', {
            recipientId,
            found: Boolean(recipient),
            username: recipient?.username,
            tokenCount: recipient?.expoPushTokens?.length || 0
        });
        
        if (!recipient?.expoPushTokens?.length) {
            console.log(`[Push] Recipient ${recipientId} has no push tokens registered`);
            return;
        }

        const tokens = recipient.expoPushTokens.map((t) => t.token);
        const senderName = message.sender?.username || message.sender?.companyName || 'رسالة جديدة';
        const messagePreview = message.body?.slice(0, 100) || 'رسالة جديدة';

        await sendExpoPushNotification(
            tokens,
            senderName,
            messagePreview,
            {
                type: 'chat_message',
                threadId: thread._id.toString(),
                cardId: thread.card?._id?.toString() || thread.card?.toString()
            }
        );

        console.log(`[Push] Sent notification to ${recipient.username} for thread ${thread._id}`);
    } catch (error) {
        console.error('[Push] sendChatPushNotification error:', error.message);
    }
};

const THREAD_POPULATE = [
    {
        path: 'card',
        select: 'code type thumbnail createdBy partnerId company plane_company going_route returning_route'
    },
    {
        path: 'viewer',
        select: 'username companyName phoneNumber role'
    },
    {
        path: 'owner',
        select: 'username companyName companyRepresentative phoneNumber role'
    }
];

const MESSAGE_POPULATE = {
    path: 'sender',
    select: 'username companyName role'
};

const sanitizeMessage = (body = '') => {
    const clean = sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })
        .replace(/\s+/g, ' ')
        .trim();
    if (!clean) {
        const error = new Error('EMPTY_MESSAGE');
        error.code = 'EMPTY_MESSAGE';
        throw error;
    }
    return clean.slice(0, 2000);
};

const idsEqual = (a, b) => {
    if (!a || !b) return false;
    const aId = a._id ? a._id : a;
    const bId = b._id ? b._id : b;
    return aId.toString() === bId.toString();
};

const isOwnerUser = (thread, user) => {
    if (!thread || !user) return false;
    if (thread.ownerType === 'partner') {
        return idsEqual(thread.owner, user._id);
    }
    return (user.role || '').toLowerCase() === 'admin';
};

const loadThreadForUser = async (threadId, user) => {
    if (!threadId || !user) return null;
    const thread = await CardChatThread.findById(threadId).populate(THREAD_POPULATE);
    if (!thread) return null;
    if (idsEqual(thread.viewer, user._id) || isOwnerUser(thread, user)) {
        return thread;
    }
    return null;
};

const markThreadReadByUser = async (thread, user) => {
    if (!thread || !user) return;
    if (idsEqual(thread.viewer, user._id)) {
        if (thread.unreadByViewer !== 0) {
            thread.unreadByViewer = 0;
            await CardChatThread.updateOne({ _id: thread._id }, { unreadByViewer: 0 });
        }
        return;
    }
    if (isOwnerUser(thread, user) && thread.unreadByOwner !== 0) {
        thread.unreadByOwner = 0;
        await CardChatThread.updateOne({ _id: thread._id }, { unreadByOwner: 0 });
    }
};

const buildOwnerDisplay = (thread) => {
    if (thread.ownerType === 'partner') {
        return thread.owner?.companyName || thread.owner?.username || 'شريك سياحي';
    }
    return 'فريق منصة رحلة عمرة';
};

const serializeThread = (thread, currentUser) => {
    const viewer = thread.viewer ? {
        _id: thread.viewer._id,
        username: thread.viewer.username,
        companyName: thread.viewer.companyName,
        phoneNumber: thread.viewer.phoneNumber
    } : null;

    const owner = thread.ownerType === 'partner' ? {
        _id: thread.owner?._id,
        username: thread.owner?.username,
        companyName: thread.owner?.companyName,
        role: 'partner'
    } : {
        role: 'admin',
        displayName: 'فريق منصة رحلة عمرة'
    };

    const card = thread.card ? {
        _id: thread.card._id,
        code: thread.card.code,
        type: thread.card.type,
        thumbnail: thread.card.thumbnail,
        createdBy: thread.card.createdBy,
        partnerId: thread.card.partnerId,
        company: thread.card.company,
        plane_company: thread.card.plane_company,
        going_route: thread.card.going_route,
        returning_route: thread.card.returning_route
    } : null;

    const isOwner = isOwnerUser(thread, currentUser);
    const isViewer = idsEqual(thread.viewer, currentUser?._id);

    return {
        _id: thread._id,
        card,
        viewer,
        owner,
        ownerType: thread.ownerType,
        lastMessagePreview: thread.lastMessagePreview,
        lastMessageAt: thread.lastMessageAt,
        unreadCount: isOwner ? thread.unreadByOwner : (isViewer ? thread.unreadByViewer : 0),
        isOwner,
        isViewer,
        ownerDisplayName: buildOwnerDisplay(thread)
    };
};

const serializeMessage = (message, currentUser) => ({
    _id: message._id,
    thread: message.thread,
    sender: {
        _id: message.sender?._id || message.sender,
        username: message.sender?.username || message.sender?.companyName || 'مستخدم',
        role: message.sender?.role || 'user'
    },
    body: message.body,
    sentAt: message.sentAt || message.createdAt,
    isMine: currentUser ? idsEqual(message.sender?._id || message.sender, currentUser._id) : false
});

const appendMessage = async (thread, user, body) => {
    if (!thread || !user) {
        const error = new Error('NOT_AUTHORIZED');
        error.code = 'NOT_AUTHORIZED';
        throw error;
    }

    const cleanBody = sanitizeMessage(body);
    const viewerMatch = idsEqual(thread.viewer, user._id);
    const ownerMatch = isOwnerUser(thread, user);

    if (!viewerMatch && !ownerMatch) {
        const error = new Error('NOT_AUTHORIZED');
        error.code = 'NOT_AUTHORIZED';
        throw error;
    }

    const message = await CardChatMessage.create({
        thread: thread._id,
        sender: user._id,
        body: cleanBody
    });

    thread.lastMessageAt = message.createdAt;
    thread.lastMessagePreview = cleanBody.slice(0, 120);

    if (viewerMatch) {
        thread.unreadByOwner += 1;
    } else {
        thread.unreadByViewer += 1;
    }

    await thread.save();
    await message.populate(MESSAGE_POPULATE);
    return message;
};

const ensureAdminUser = async (userId) => {
    if (!userId) return null;
    const user = await User.findById(userId).select('username role');
    return user;
};

const buildOwnerRoom = (thread) => {
    if (!thread) return null;
    if (thread.ownerType === 'partner') {
        const ownerId = thread.owner?._id || thread.owner;
        if (!ownerId) return null;
        return `owner:partner:${ownerId.toString()}`;
    }
    return 'owner:admin';
};

const emitThreadUpdate = (io, thread, extra = {}) => {
    if (!io || !thread) return;
    const ownerRoom = buildOwnerRoom(thread);
    if (!ownerRoom) return;
    io.to(ownerRoom).emit('chat:thread-update', {
        threadId: thread._id.toString(),
        ownerType: thread.ownerType,
        owner: thread.owner?._id || thread.owner,
        lastMessagePreview: thread.lastMessagePreview,
        lastMessageAt: thread.lastMessageAt,
        ...extra
    });
};

const emitChatMessage = (io, thread, payload) => {
    if (!io || !thread || !payload) return;
    const threadId = thread._id.toString();
    io.to(threadId).emit('chat:message', {
        threadId,
        message: payload
    });
    const senderId = payload?.sender?._id || payload?.sender;
    emitThreadUpdate(io, thread, { senderId });

    // Send push notification to the recipient (async, don't block)
    sendChatPushNotification(thread, payload, senderId).catch((err) => {
        console.error('[Push] emitChatMessage push error:', err.message);
    });
};

module.exports = {
    THREAD_POPULATE,
    MESSAGE_POPULATE,
    sanitizeMessage,
    isOwnerUser,
    idsEqual,
    loadThreadForUser,
    markThreadReadByUser,
    serializeThread,
    serializeMessage,
    appendMessage,
    ensureAdminUser,
    emitChatMessage,
    sendChatPushNotification
};
