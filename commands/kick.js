const isAdmin = require('../helpers/isAdmin');
const sayGoodbye = require('./goodbye');

async function kickCommand(sock, chatId, senderId, mentionedJidList, replyMessage, userMessage) {
    try {
        const { isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' });
            return;
        }

        let kickedMembers = [];

        // If the command was a reply to a user
        if (replyMessage && replyMessage.participant) {
            kickedMembers = [replyMessage.participant];
        }
        // If the command mentioned users
        else if (mentionedJidList && mentionedJidList.length > 0) {
            kickedMembers = mentionedJidList;
        } else {
            await sock.sendMessage(chatId, { text: 'Please reply to a user or tag a user to kick (e.g., "Get out @user .kick").' });
            return;
        }

        // Send the custom message (if provided) before kicking
        if (userMessage && userMessage.includes('.kick')) {
            const customMessage = userMessage.split('.kick')[0].trim();
            if (customMessage) {
                await sock.sendMessage(chatId, {
                    text: `${customMessage}`,
                    mentions: kickedMembers
                });
            }
        }

        // Perform the kick
        await sock.groupParticipantsUpdate(chatId, kickedMembers, 'remove');

        // Send goodbye message in the group and private messages
        await sayGoodbye(sock, chatId, kickedMembers);

    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, { text: 'Failed to kick user. Please try again later.' });
    }
}

module.exports = kickCommand;