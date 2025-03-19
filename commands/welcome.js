const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

async function welcomeNewMembers(sock, chatId, newMembers) {
    try {
        for (const member of newMembers) {
            // Format the member's number
            const phoneNumber = member.split('@')[0];
            const formattedNumber = `+${phoneNumber.slice(0, 3)} ${phoneNumber.slice(3, 5)} ${phoneNumber.slice(5)}`;
            const welcomeText = `Welcome @${member.split('@')[0]} (${formattedNumber}) to the group! 🎉`;

            // Try to get profile picture URL
            let profilePicUrl;
            try {
                profilePicUrl = await sock.profilePictureUrl(member, 'image');
            } catch (error) {
                console.warn(`Could not fetch profile picture for ${member}: ${error.message}`);
            }

            if (profilePicUrl) {
                // Download the profile picture
                const response = await axios.get(profilePicUrl, { responseType: 'arraybuffer' });
                const profilePicBuffer = Buffer.from(response.data, 'binary');

                // Send welcome message with profile picture
                await sock.sendMessage(chatId, {
                    image: profilePicBuffer,
                    caption: welcomeText,
                    mentions: [member]
                });
                console.log(`Sent welcome with profile picture for ${member} in group ${chatId}`);
            } else {
                // Send text-only welcome if no profile picture
                await sock.sendMessage(chatId, {
                    text: welcomeText,
                    mentions: [member]
                });
                console.log(`Sent text-only welcome for ${member} in group ${chatId} (no profile picture)`);
            }
        }

        // Optional: Send welcome sticker
        const stickerPath = path.join(__dirname, '../assets/stickintro.webp');
        const maxStickerSize = 1 * 1024 * 1024; // 1MB limit

        try {
            const stickerStats = await fs.stat(stickerPath);
            if (stickerStats.size <= maxStickerSize) {
                const stickerBuffer = await fs.readFile(stickerPath);
                await sock.sendMessage(chatId, { sticker: stickerBuffer });
                console.log(`Sent welcome sticker to group ${chatId}`);
            } else {
                console.warn(`Sticker at ${stickerPath} exceeds 1MB limit (${stickerStats.size} bytes)`);
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error(`Sticker not found at: ${stickerPath}`);
            } else {
                console.error(`Error reading sticker: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`Error in welcomeNewMembers for group ${chatId}:`, error);
    }
}

module.exports = welcomeNewMembers;