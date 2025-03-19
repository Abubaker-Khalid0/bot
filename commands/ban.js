const isAdmin = require('../helpers/isAdmin');

async function banCommand(sock, chatId, senderId, mentionedJidList, replyMessage) {
    try {
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
            return;
        }

        // If the command was a reply to a user
        if (replyMessage && replyMessage.participant) {
            const userToBan = replyMessage.participant;
            await sock.groupParticipantsUpdate(chatId, [userToBan], 'remove');
            await sock.sendMessage(chatId, { 
                text: `User @${userToBan.split('@')[0]} has been banned from the group.`,
                mentions: [userToBan]
            });
            return;
        }

        // If the command mentioned users
        if (mentionedJidList && mentionedJidList.length > 0) {
            await sock.groupParticipantsUpdate(chatId, mentionedJidList, 'remove');
            const mentions = mentionedJidList.map(jid => `@${jid.split('@')[0]}`).join(', ');
            await sock.sendMessage(chatId, { 
                text: `User(s) ${mentions} have been banned from the group.`,
                mentions: mentionedJidList
            });
        } else {
            await sock.sendMessage(chatId, { text: 'Please reply to a user or tag a user to ban.' });
        }
    } catch (error) {
        console.error('Error in ban command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to ban user. Please try again later.' });
    }
}

module.exports = banCommand;