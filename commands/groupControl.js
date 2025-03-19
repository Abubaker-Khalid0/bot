const fs = require('fs');
const path = require('path');

// Define the path for allowed groups file
const dataDirectory = path.join(__dirname, '../data');
const allowedGroupsFile = path.join(dataDirectory, 'allowedGroups.json');

// Initialize or load allowed groups and settings
let allowedGroups = new Set();
let allowAllAdmins = false;
if (fs.existsSync(allowedGroupsFile)) {
    const data = JSON.parse(fs.readFileSync(allowedGroupsFile, 'utf-8'));
    allowedGroups = new Set(data.groups || []);
    allowAllAdmins = data.allowAllAdmins || false;
} else {
    fs.writeFileSync(allowedGroupsFile, JSON.stringify({ groups: [], allowAllAdmins: false }, null, 2));
}

// Function to save allowed groups and settings to file
function saveAllowedGroups() {
    try {
        fs.writeFileSync(allowedGroupsFile, JSON.stringify({ groups: Array.from(allowedGroups), allowAllAdmins }, null, 2));
    } catch (error) {
        console.error('Error saving allowed groups:', error);
    }
}

// Command to allow a group (admin only)
async function allowGroupCommand(sock, chatId, senderId) {
    if (senderId !== global.adminNumber) {
        await sock.sendMessage(chatId, { text: 'Only the bot owner can allow groups!' });
        return;
    }

    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, { text: 'This command must be used in a group!' });
        return;
    }

    if (allowedGroups.has(chatId)) {
        await sock.sendMessage(chatId, { text: 'This group is already allowed!' });
        return;
    }

    allowedGroups.add(chatId);
    saveAllowedGroups();
    await sock.sendMessage(chatId, { text: `Group ${chatId} is now allowed to use the bot!` });
}

// Command to disallow a group (admin only)
async function disallowGroupCommand(sock, chatId, senderId) {
    if (senderId !== global.adminNumber) {
        await sock.sendMessage(chatId, { text: 'Only the bot owner can disallow groups!' });
        return;
    }

    if (!allowedGroups.has(chatId)) {
        await sock.sendMessage(chatId, { text: 'This group is not in the allowed list!' });
        return;
    }

    allowedGroups.delete(chatId);
    saveAllowedGroups();
    await sock.sendMessage(chatId, { text: `Group ${chatId} is no longer allowed to use the bot!` });
}

// Command to list allowed groups (admin only)
async function listAllowedGroupsCommand(sock, chatId, senderId) {
    if (senderId !== global.adminNumber) {
        await sock.sendMessage(chatId, { text: 'Only the bot owner can view allowed groups!' });
        return;
    }

    if (allowedGroups.size === 0) {
        await sock.sendMessage(chatId, { text: 'No groups are allowed yet.' });
        return;
    }

    let message = 'Allowed Groups:\n';
    allowedGroups.forEach(groupId => {
        message += `- ${groupId}\n`;
    });
    message += `\nAllow all admins: ${allowAllAdmins ? 'Yes' : 'No'}`;
    await sock.sendMessage(chatId, { text: message });
}

// Command to toggle allowing all admins (admin only)
async function toggleAdminsCommand(sock, chatId, senderId) {
    if (senderId !== global.adminNumber) {
        await sock.sendMessage(chatId, { text: 'Only the bot owner can toggle admin access!' });
        return;
    }

    allowAllAdmins = !allowAllAdmins;
    saveAllowedGroups();
    await sock.sendMessage(chatId, { text: `All admins can now ${allowAllAdmins ? 'use commands like .antilink' : 'not use the bot.'}` });
}

// Function to check if a group is allowed
function isGroupAllowed(chatId) {
    return allowedGroups.has(chatId);
}

// Function to check if all admins are allowed
function areAllAdminsAllowed() {
    return allowAllAdmins;
}

// Export the functions
module.exports = {
    allowGroupCommand,
    disallowGroupCommand,
    listAllowedGroupsCommand,
    toggleAdminsCommand,
    isGroupAllowed,
    areAllAdminsAllowed
};