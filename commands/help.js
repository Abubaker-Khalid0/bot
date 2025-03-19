const settings = require('../settings');
const fs = require('fs');
const path = require('path');

// Define commands dynamically
const commands = [
    { name: '.kick', description: 'Kick a user from the group (mention or reply)', category: 'Admin Commands' },
    { name: '.ban', description: 'Ban users from the group (mention or reply)', category: 'Admin Commands' },
    { name: '.warn', description: 'Warn a user (mention or reply)', category: 'Admin Commands' },
    { name: '.warnings', description: 'Check a user\'s warnings (mention or reply)', category: 'Admin Commands' },
    { name: '.antilink', description: 'Toggle link protection', category: 'Admin Commands' },
    { name: '.tag', description: 'Tag up to 50 members with a message', category: 'Admin Commands' },
    { name: '.toggleadmins', description: 'Toggle admin access for all admins', category: 'Admin Commands' },
    { name: '.allowgroup', description: 'Allow a group to use the bot', category: 'Owner Commands' },
    { name: '.disallowgroup', description: 'Disallow a group from using the bot', category: 'Owner Commands' },
    { name: '.listallowed', description: 'List all allowed groups', category: 'Owner Commands' },
    { name: '.close', description: 'Shut down the bot', category: 'Owner Commands' },
    { name: '.topmembers', description: 'View top 5 active members', category: 'Group Stats' },
    { name: '.bot', description: 'Show this help menu', category: 'General' }
];

async function helpCommand(sock, chatId) {
    // Format admin number for display
    const adminNumber = global.adminNumber.split('@')[0]; // "971504991237"
    const formattedNumber = `+${adminNumber.slice(0, 3)} ${adminNumber.slice(3, 5)} ${adminNumber.slice(5)}`; // "+971 50 499 1237"

    // Group commands by category
    const groupedCommands = commands.reduce((acc, cmd) => {
        acc[cmd.category] = acc[cmd.category] || [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    // Build the help message dynamically
    let helpMessage = `
╔═══════════════════╗
   *${settings.botName || 'Dragunov'}🤖*  
   Version: *${settings.version || '1.0.0'}*
   by ${settings.botOwner || '𝕓𝕖𝕜𝕠'}
╚═══════════════════╝

*Available Commands:*
`;

    for (const [category, cmds] of Object.entries(groupedCommands)) {
        helpMessage += `
*${category}* ${category === 'Admin Commands' ? '🛡️' : category === 'Owner Commands' ? '🔑' : category === 'Group Stats' ? '📊' : 'ℹ️'}:
╔═══════════════════╗
`;
        cmds.forEach(cmd => {
            const aliases = cmd.aliases ? ` (${cmd.aliases.join(', ')})` : '';
            helpMessage += `║ ➤ ${cmd.name}${aliases} - ${cmd.description}\n`;
        });
        helpMessage += '╚═══════════════════╝\n';
    }

    helpMessage += `
ℹ️ *Notes*:
• Admin commands require bot to be admin
• Owner commands are restricted to bot owner
• Some commands can be used by replying to messages


📞 *Contact with Beko*: ${formattedNumber}`;

    try {
        const imagePath = path.join(__dirname, '../assets/bot_image.jpg');
        const maxImageSize = 5 * 1024 * 1024;

        const messageOptions = {
            forwardingScore: 1, // Simple forwarding indicator
            isForwarded: true
        };

        if (fs.existsSync(imagePath)) {
            const imageStats = fs.statSync(imagePath);
            if (imageStats.size <= maxImageSize) {
                const imageBuffer = Buffer.from(fs.readFileSync(imagePath));
                await sock.sendMessage(chatId, {
                    image: imageBuffer,
                    caption: helpMessage,
                    contextInfo: messageOptions
                });
            } else {
                await sock.sendMessage(chatId, { text: helpMessage, contextInfo: messageOptions });
                console.warn('Bot image exceeds size limit (5MB), sending text only.');
            }
        } else {
            await sock.sendMessage(chatId, { text: helpMessage, contextInfo: messageOptions });
        }
    } catch (error) {
        console.error('Error in help command:', error);
        await sock.sendMessage(chatId, { text: helpMessage });
    }
}

module.exports = helpCommand;