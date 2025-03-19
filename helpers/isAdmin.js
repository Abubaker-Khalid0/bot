/**
 * Checks if both the bot and the message sender have admin privileges in a group
 * @param {Object} sock - The WhatsApp socket connection
 * @param {string} chatId - The group chat ID
 * @param {string} senderId - The sender's WhatsApp ID
 * @returns {Promise<{isSenderAdmin: boolean, isBotAdmin: boolean}>} Object containing admin status
 */
async function isAdmin(sock, chatId, senderId) {
    try {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        
        if (!groupMetadata || !groupMetadata.participants) {
            console.error('Failed to get group metadata or participants list');
            return { isSenderAdmin: false, isBotAdmin: false };
        }

        // Normalize the bot's JID (remove any device-specific info)
        const botJidNormalized = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        // Find the sender and bot in the group participant list
        const participant = groupMetadata.participants.find(p => p.id === senderId);
        const bot = groupMetadata.participants.find(p => p.id === botJidNormalized);

        if (!bot) {
            console.error('Bot not found in group participants list');
            return { isSenderAdmin: false, isBotAdmin: false };
        }

        // Check admin status
        const isBotAdmin = bot.admin === 'admin' || bot.admin === 'superadmin';
        const isSenderAdmin = participant && (participant.admin === 'admin' || participant.admin === 'superadmin');

        return { isSenderAdmin, isBotAdmin };
    } catch (error) {
        console.error('Error checking admin status:', error);
        return { isSenderAdmin: false, isBotAdmin: false };
    }
}

module.exports = isAdmin;