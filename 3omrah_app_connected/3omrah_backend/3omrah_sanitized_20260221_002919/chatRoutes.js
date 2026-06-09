const router = require('express').Router();
const mongoose = require('mongoose');
const { isLoggedIn } = require('./middlware');
const Card = require('./models/Cards');
const CardChatThread = require('./models/CardChatThread');
const CardChatMessage = require('./models/CardChatMessage');
const {
    THREAD_POPULATE,
    MESSAGE_POPULATE,
    loadThreadForUser,
    markThreadReadByUser,
    serializeThread,
    serializeMessage,
    appendMessage,
    idsEqual,
    isOwnerUser,
    emitChatMessage
} = require('./services/chatService');

const buildOwnerDetails = (card) => {
    if (!card) return { ownerType: 'admin', ownerId: null };
    if (card.createdBy === 'partner') {
        return {
            ownerType: 'partner',
            ownerId: card.partnerId
        };
    }
    return { ownerType: 'admin', ownerId: null };
};

const fetchLatestMessages = async (threadId, limit = 50) => {
    return CardChatMessage.find({ thread: threadId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate(MESSAGE_POPULATE)
        .then(messages => messages.reverse());
};

router.post('/thread', isLoggedIn, async (req, res) => {
    try {
        const { cardId } = req.body || {};
        if (!cardId || !mongoose.Types.ObjectId.isValid(cardId)) {
            return res.status(400).json({ success: false, message: 'معرف البطاقة غير صالح' });
        }

        const card = await Card.findById(cardId).select('code type thumbnail createdBy partnerId company plane_company going_route returning_route');
        if (!card) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على البطاقة المطلوبة' });
        }

        const { ownerType, ownerId } = buildOwnerDetails(card);
        if (ownerType === 'partner' && !ownerId) {
            return res.status(400).json({ success: false, message: 'لا يمكن فتح محادثة لبطاقة شريك غير معرّفة' });
        }

        let thread = await CardChatThread.findOne({ card: card._id, viewer: req.user._id });
        if (!thread) {
            thread = await CardChatThread.create({
                card: card._id,
                viewer: req.user._id,
                ownerType,
                owner: ownerType === 'partner' ? ownerId : undefined,
                lastMessagePreview: '',
                lastMessageAt: new Date()
            });
        } else if (ownerType === 'partner' && !thread.owner && ownerId) {
            thread.owner = ownerId;
            await thread.save();
        }

        await thread.populate(THREAD_POPULATE);
        await markThreadReadByUser(thread, req.user);
        const messages = await fetchLatestMessages(thread._id);

        return res.json({
            success: true,
            thread: serializeThread(thread, req.user),
            messages: messages.map(message => serializeMessage(message, req.user))
        });
    } catch (error) {
        console.error('Failed to create/fetch chat thread:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء فتح المحادثة' });
    }
});

router.get('/thread/:threadId', isLoggedIn, async (req, res) => {
    try {
        const { threadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(threadId)) {
            return res.status(400).json({ success: false, message: 'معرف المحادثة غير صالح' });
        }

        const thread = await loadThreadForUser(threadId, req.user);
        if (!thread) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على المحادثة' });
        }

        await markThreadReadByUser(thread, req.user);
        const messages = await fetchLatestMessages(thread._id);

        return res.json({
            success: true,
            thread: serializeThread(thread, req.user),
            messages: messages.map(message => serializeMessage(message, req.user))
        });
    } catch (error) {
        console.error('Failed to load chat thread:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحميل المحادثة' });
    }
});

router.get('/thread/:threadId/messages', isLoggedIn, async (req, res) => {
    try {
        const { threadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(threadId)) {
            return res.status(400).json({ success: false, message: 'معرف المحادثة غير صالح' });
        }

        const thread = await loadThreadForUser(threadId, req.user);
        if (!thread) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على المحادثة' });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        let query = CardChatMessage.find({ thread: thread._id });

        if (req.query.before && mongoose.Types.ObjectId.isValid(req.query.before)) {
            query = query.where('_id').lt(req.query.before);
        }

        const messages = await query
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate(MESSAGE_POPULATE)
            .then(list => list.reverse());

        await markThreadReadByUser(thread, req.user);

        return res.json({
            success: true,
            messages: messages.map(message => serializeMessage(message, req.user))
        });
    } catch (error) {
        console.error('Failed to list chat messages:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحميل الرسائل' });
    }
});

router.post('/thread/:threadId/messages', isLoggedIn, async (req, res) => {
    try {
        const { threadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(threadId)) {
            return res.status(400).json({ success: false, message: 'معرف المحادثة غير صالح' });
        }

        const thread = await loadThreadForUser(threadId, req.user);
        if (!thread) {
            return res.status(404).json({ success: false, message: 'لم يتم العثور على المحادثة' });
        }

        const clientMessageId = req.body?.clientMessageId;
        const message = await appendMessage(thread, req.user, req.body?.message || req.body?.body || '');
        const payload = serializeMessage(message, req.user);
        if (clientMessageId) {
            payload.clientMessageId = clientMessageId;
        }

        const io = req.app.get('io');
        emitChatMessage(io, thread, payload);

        return res.status(201).json({ success: true, message: payload });
    } catch (error) {
        if (error.code === 'EMPTY_MESSAGE') {
            return res.status(400).json({ success: false, message: 'لا يمكن إرسال رسالة فارغة' });
        }
        if (error.code === 'NOT_AUTHORIZED') {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية لهذه المحادثة' });
        }
        console.error('Failed to send chat message:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء إرسال الرسالة' });
    }
});

router.get('/threads', isLoggedIn, async (req, res) => {
    try {
        const scope = req.query.scope === 'owner' ? 'owner' : 'viewer';
        let query;

        if (scope === 'viewer') {
            query = { viewer: req.user._id };
        } else {
            const role = (req.user.role || '').toLowerCase();
            if (role === 'partner') {
                query = { ownerType: 'partner', owner: req.user._id };
            } else if (role === 'admin') {
                query = { ownerType: 'admin' };
            } else {
                return res.status(403).json({ success: false, message: 'لا تملك صلاحية الاطلاع على صندوق المحادثات' });
            }
        }

        const threads = await CardChatThread.find(query)
            .sort({ updatedAt: -1 })
            .limit(100)
            .populate(THREAD_POPULATE);

        return res.json({
            success: true,
            threads: threads.map(thread => serializeThread(thread, req.user))
        });
    } catch (error) {
        console.error('Failed to list chat threads:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحميل المحادثات' });
    }
});

module.exports = router;
