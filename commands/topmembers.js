const fs = require('fs').promises;
const path = require('path');

const dataFilePath = path.join(__dirname, '..', 'data', 'messageCount.json');

// In-memory cache for message counts
let messageCountsCache = null;

async function loadMessageCounts() {
    if (messageCountsCache) return messageCountsCache;

    try {
        const data = await fs.readFile(dataFilePath, 'utf8');
        messageCountsCache = JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            messageCountsCache = {};
        } else {
            console.error('Error loading message counts:', error);
            messageCountsCache = {};
        }
    }
    return messageCountsCache;
}

async function saveMessageCounts(messageCounts) {
    try {
        await fs.writeFile(dataFilePath, JSON.stringify(messageCounts, null, 2));
    } catch (error) {
        console.error('Error saving message counts:', error);
    }
}

async function incrementMessageCount(groupId, userId) {
    const messageCounts = await loadMessageCounts();

    if (!messageCounts[groupId]) {
        messageCounts[groupId] = {};
    }

    if (!messageCounts[groupId][userId]) {
        messageCounts[groupId][userId] = 0;
    }

    messageCounts[groupId][userId] += 1;
    await saveMessageCounts(messageCounts);
    console.log(`Incremented message count for ${userId} in group ${groupId}`);
}

async function topMembers(sock, chatId, isGroup) {
    try {
        if (!isGroup) {
            await sock.sendMessage(chatId, { text: 'ℹ️ This command is only available in group chats.' });
            return;
        }

        const { isBotAdmin } = await isAdmin(sock, chatId, sock.user.id);
        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Bot must be an admin to use this command.' });
            return;
        }

        const messageCounts = await loadMessageCounts();
        const groupCounts = messageCounts[chatId] || {};

        const sortedMembers = Object.entries(groupCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // Top 5 members

        if (sortedMembers.length === 0) {
            await sock.sendMessage(chatId, { text: 'ℹ️ No message activity recorded yet.' });
            return;
        }

        let message = '🏆 Top Members Based on Message Count:\n\n';
        sortedMembers.forEach(([userId, count], index) => {
            message += `${index + 1}. @${userId.split('@')[0]} - ${count} messages\n`;
        });

        await sock.sendMessage(chatId, {
            text: message,
            mentions: sortedMembers.map(([userId]) => userId)
        });

        console.log(`Displayed top members for group ${chatId}`);
    } catch (error) {
        console.error('Error in topMembers:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to fetch top members. Please try again later.' });
    }
}

module.exports = { incrementMessageCount, topMembers };