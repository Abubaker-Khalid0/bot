const isAdmin = require('../helpers/isAdmin');

async function tagCommand(sock, chatId, senderId, messageText, replyMessage) {
    try {
        const { isBotAdmin, isSenderAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Please make the bot an admin first.' });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;
        let mentionList = [];

        const isTagAdmin = messageText.toLowerCase().startsWith('admin');
        if (isTagAdmin) {
            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { text: '❌ Only admins can use .tagadmin!' });
                return;
            }
            mentionList = participants.filter(p => p.admin).map(p => p.id);
        } else {
            mentionList = participants.map(p => p.id);
        }

        if (mentionList.length === 0) {
            await sock.sendMessage(chatId, { text: '❌ No members to tag!' });
            return;
        }

        // بناء النص بطريقة الكود الأول
        let teks = isTagAdmin
            ? `🌟 ━━━━━━ *إشعار المشرفين* ━━━━━━ 🌟\n\n`
            : `✨ ━━━━━━ *إشعار جماعي* ━━━━━━ ✨\n\n`;

        // إضافة الرسالة أو الرد
        if (replyMessage) {
            if (replyMessage.conversation || replyMessage.extendedTextMessage?.text) {
                const repliedText = replyMessage.conversation || replyMessage.extendedTextMessage.text;
                teks += `📢 *رسالة مُعادة*: \n"${repliedText.slice(0, 100)}${repliedText.length > 100 ? '...' : ''}"\n\n`;
            } else if (replyMessage.imageMessage) {
                teks += `📸 *صورة مُعادة*: \n${replyMessage.imageMessage.caption ? `"${replyMessage.imageMessage.caption.slice(0, 50)}${replyMessage.imageMessage.caption.length > 50 ? '...' : ''}"` : 'بدون تعليق'}\n\n`;
            } else if (replyMessage.videoMessage) {
                teks += `🎥 *فيديو مُعاد*: \n${replyMessage.videoMessage.caption ? `"${replyMessage.videoMessage.caption.slice(0, 50)}${replyMessage.videoMessage.caption.length > 50 ? '...' : ''}"` : 'بدون تعليق'}\n\n`;
            } else if (replyMessage.documentMessage) {
                teks += `📄 *مستند مُعاد*: \n${replyMessage.documentMessage.fileName ? `"${replyMessage.documentMessage.fileName.slice(0, 50)}${replyMessage.documentMessage.fileName.length > 50 ? '...' : ''}"` : 'ملف بدون اسم'}\n\n`;
            } else {
                await sock.sendMessage(chatId, { text: '❌ Unsupported message type for tagging.' });
                return;
            }
        } else {
            const tagText = messageText.replace('admin', '').trim() || (isTagAdmin ? 'استدعاء المشرفين!' : 'تم استدعاء الجميع!');
            teks += `📢 *رسالة*: \n"${tagText}"\n\n`;
        }

        // إضافة قائمة الأعضاء بطريقة الكود الأول
        for (let mem of participants) {
            if (isTagAdmin && !mem.admin) continue; // تخطي غير المشرفين إذا كان tagadmin
            teks += `┃⊹ @${mem.id.split('@')[0]}\n`;
        }

        // إضافة التذييل
        teks += `┃\n`;
        teks += `┃ Powered by DragunovBot\n`;
        teks += isTagAdmin
            ? `🌟 ━━━━━━━━━━━━━━━━━━━━━━━━ 🌟`
            : `✨ ━━━━━━━━━━━━━━━━━━━━━━━━ ✨`;

        // إرسال الرسالة دفعة واحدة
        if (replyMessage && (replyMessage.imageMessage || replyMessage.videoMessage || replyMessage.documentMessage)) {
            const media = replyMessage.imageMessage ? { image: { url: replyMessage.imageMessage.url, mimetype: replyMessage.imageMessage.mimetype } }
                : replyMessage.videoMessage ? { video: { url: replyMessage.videoMessage.url, mimetype: replyMessage.videoMessage.mimetype } }
                : { document: { url: replyMessage.documentMessage.url, mimetype: replyMessage.documentMessage.mimetype }, fileName: replyMessage.documentMessage.fileName || 'Tagged file' };
            await sock.sendMessage(chatId, {
                ...media,
                caption: teks,
                mentions: mentionList
            });
        } else {
            await sock.sendMessage(chatId, {
                text: teks,
                mentions: mentionList
            });
        }

        console.log(`Tagged ${mentionList.length} ${isTagAdmin ? 'admins' : 'members'} in group ${chatId} in a single message`);
    } catch (error) {
        console.error('Error in tag command:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to tag members. Please try again later.' });
    }
}

module.exports = tagCommand;