const { setAntilinkSetting, getAntilinkSetting } = require('../helpers/antilinkHelper');

async function handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin) {
    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: '❌ Only admins can use the .antilink command.' });
        return;
    }

    if (userMessage === '.antilink') {
        const helpMessage = `
*Antilink Commands:*
1. *.antilink off* - Disable antilink protection.
2. *.antilink whatsapp* - Block WhatsApp group links.
3. *.antilink whatsappchannel* - Block WhatsApp channel links.
4. *.antilink telegram* - Block Telegram links.
5. *.antilink all* - Block all types of links.
6. *.antilink on* - Enable antilink protection.
        `;
        await sock.sendMessage(chatId, { text: helpMessage });
        return;
    }

    if (userMessage === '.antilink off') {
        setAntilinkSetting(chatId, 'off');
        await sock.sendMessage(chatId, { text: '✅ Antilink protection is now turned off.' });
    } else if (userMessage === '.antilink whatsapp') {
        setAntilinkSetting(chatId, 'whatsappGroup');
        await sock.sendMessage(chatId, { text: '✅ WhatsApp group links are now blocked.' });
    } else if (userMessage === '.antilink whatsappchannel') {
        setAntilinkSetting(chatId, 'whatsappChannel');
        await sock.sendMessage(chatId, { text: '✅ WhatsApp channel links are now blocked.' });
    } else if (userMessage === '.antilink telegram') {
        setAntilinkSetting(chatId, 'telegram');
        await sock.sendMessage(chatId, { text: '✅ Telegram links are now blocked.' });
    } else if (userMessage === '.antilink all') {
        setAntilinkSetting(chatId, 'allLinks');
        await sock.sendMessage(chatId, { text: '✅ All types of links are now blocked.' });
    } else if (userMessage === '.antilink on') {
        setAntilinkSetting(chatId, 'allLinks');
        await sock.sendMessage(chatId, { text: '✅ Antilink protection is now turned on.' });
    }
}

async function handleLinkDetection(sock, chatId, message, userMessage, senderId) {
    const antilinkSetting = getAntilinkSetting(chatId);
    if (antilinkSetting === 'off') return;

    const { isBotAdmin } = await isAdmin(sock, chatId, sock.user.id);
    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: '❌ I need to be an admin to delete messages.' });
        return;
    }

    console.log(`Antilink Setting for ${chatId}: ${antilinkSetting}`);
    console.log(`Checking message for links: ${userMessage}`);

    let shouldDelete = false;

    const linkPatterns = {
        whatsappGroup: /https?:\/\/(www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]{20,}/,
        whatsappChannel: /https?:\/\/(www\.)?wa\.me\/channel\/[A-Za-z0-9]{20,}/,
        telegram: /https?:\/\/(www\.)?t\.me\/[A-Za-z0-9_]+/,
        allLinks: /https?:\/\/[^\s]+/,
    };

    if (antilinkSetting === 'whatsappGroup' && linkPatterns.whatsappGroup.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'whatsappChannel' && linkPatterns.whatsappChannel.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'telegram' && linkPatterns.telegram.test(userMessage)) {
        shouldDelete = true;
    } else if (antilinkSetting === 'allLinks' && linkPatterns.allLinks.test(userMessage)) {
        shouldDelete = true;
    }

    if (shouldDelete) {
        const quotedMessageId = message.key.id;
        const quotedParticipant = message.key.participant || senderId;

        console.log(`Attempting to delete message with id: ${quotedMessageId} from participant: ${quotedParticipant}`);

        try {
            await sock.sendMessage(chatId, {
                delete: { remoteJid: chatId, fromMe: false, id: quotedMessageId, participant: quotedParticipant },
            });
            console.log(`Message with ID ${quotedMessageId} deleted successfully.`);
        } catch (error) {
            console.error('Failed to delete message:', error);
        }

        const mentionedJidList = [senderId];
        await sock.sendMessage(chatId, { text: `⚠️ Warning! @${senderId.split('@')[0]}, posting links is not allowed.`, mentions: mentionedJidList });
    } else {
        console.log('No link detected or protection not enabled for this type of link.');
    }
}

module.exports = {
    handleAntilinkCommand,
    handleLinkDetection,
};