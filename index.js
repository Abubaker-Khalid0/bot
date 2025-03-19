const settings = require('./settings');
const chalk = require('chalk');
const fs = require('fs'); // استيراد fs العادي للوظائف المتزامنة
const fsPromises = require('fs').promises; // استيراد fs.promises للوظائف غير المتزامنة
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');

// استيراد الأوامر
const helpCommand = require('./commands/help');
const welcomeNewMembers = require('./commands/welcome');
const sayGoodbye = require('./commands/goodbye'); // لا يزال مستوردًا لكن لن يُستخدم
const banCommand = require('./commands/ban');
const isAdmin = require('./helpers/isAdmin');
const warnCommand = require('./commands/warn');
const warningsCommand = require('./commands/warnings');
const { incrementMessageCount, topMembers } = require('./commands/topmembers');
const { handleAntilinkCommand, handleLinkDetection } = require('./commands/antilink');
const tagCommand = require('./commands/tag');
const kickCommand = require('./commands/kick');
const { allowGroupCommand, disallowGroupCommand, listAllowedGroupsCommand, toggleAdminsCommand, isGroupAllowed, areAllAdminsAllowed } = require('./commands/groupControl');

// مسار تخزين البيانات
const dataDirectory = path.join(__dirname, './data');
const dataFile = path.join(dataDirectory, './userGroupData.json');

// التأكد من وجود مجلد البيانات
if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory);
}

// تهيئة بيانات المستخدمين والمجموعات
let userGroupData = { users: [], groups: [] };
if (fs.existsSync(dataFile)) {
    userGroupData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
} else {
    fs.writeFileSync(dataFile, JSON.stringify(userGroupData, null, 2));
}

// حفظ بيانات المستخدمين والمجموعات
function saveUserGroupData() {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(userGroupData, null, 2));
    } catch (error) {
        console.error('Error Creating Database:', error);
    }
}

// أمر إيقاف البوت
async function handleShutdown(sock, chatId, senderId) {
    if (senderId !== global.adminNumber) {
        return;
    }
    await sock.sendMessage(chatId, { text: 'Bot is shutting down...' });
    process.exit(0);
}

// تهيئة المسجل
const logger = P({ level: 'warn', enabled: true });

// مساعدات طباعة السجلات
const printLog = {
    success: (msg) => console.log(chalk.green(`\n[✓] ${msg}`)),
    info: (msg) => console.log(chalk.blue(`\n[i] ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`\n[!] ${msg}`)),
    error: (msg) => console.log(chalk.red(`\n[x] ${msg}`))
};

// حالة الاتصال العامة
let connectionState = {
    isConnected: false,
    qrDisplayed: false,
    retryCount: 0,
    sessionExists: false,
    lastPing: Date.now(),
    hasSentPing: false
};

global.adminNumber = '971504991237@s.whatsapp.net';

async function startBot() {
    try {
        // مسار بيانات المصادقة والنسخ الاحتياطي
        const authDir = './auth_info';
        const backupDir = './auth_info_backup';

        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        connectionState.sessionExists = state?.creds?.registered || false;

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger,
            browser: ['DragunovBot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 40000,
            defaultQueryTimeoutMs: 60000,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 20000,
            retryRequestDelayMs: 2000,
            emitOwnEvents: true,
            syncFullHistory: false
        });

        // مراقبة الاتصال
        const connectionMonitor = setInterval(async () => {
            if (!connectionState.isConnected) return;

            try {
                if (!connectionState.hasSentPing) {
                    await sock.sendMessage(sock.user.id, { text: '11' }, { ephemeral: true });
                    connectionState.hasSentPing = true;
                }
                connectionState.lastPing = Date.now();
            } catch (err) {
                if (Date.now() - connectionState.lastPing > 30000) {
                    printLog.warn('Connection check failed, attempting reconnect...');
                    clearInterval(connectionMonitor);
                    sock.end();
                }
            }
        }, 20000);

        // حفظ بيانات المصادقة مع نسخة احتياطية
        sock.ev.on('creds.update', async () => {
            await saveCreds();
            try {
                await fsPromises.cp(authDir, backupDir, { recursive: true });
            } catch (err) {
                printLog.warn('Failed to backup auth info:', err);
            }
        });

        // التعامل مع تحديثات الاتصال
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !connectionState.qrDisplayed && !connectionState.isConnected) {
                connectionState.qrDisplayed = true;
                printLog.info('Scan the QR code to connect (Valid for 40 seconds)');
            }

            if (connection === 'close') {
                clearInterval(connectionMonitor);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.output?.payload?.error || 'Unknown';
                printLog.error(`Connection closed: ${reason}`);

                if (statusCode === 515 || statusCode === DisconnectReason.badSession) {
                    printLog.warn('Detected stream error or bad session, reinitializing...');
                    try {
                        await fsPromises.rm(authDir, { recursive: true, force: true });
                        await fsPromises.cp(backupDir, authDir, { recursive: true });
                    } catch (err) {
                        printLog.error('Failed to restore backup, starting fresh:', err);
                        await fsPromises.rm(authDir, { recursive: true, force: true });
                    }
                    setTimeout(startBot, 2000);
                } else if (statusCode !== DisconnectReason.loggedOut && connectionState.retryCount < 5) {
                    connectionState.retryCount++;
                    const delay = Math.min(connectionState.retryCount * 2000, 10000);
                    printLog.warn(`Reconnecting in ${delay / 1000}s... (Attempt ${connectionState.retryCount}/5)`);
                    setTimeout(startBot, delay);
                } else {
                    printLog.error('Max retries reached or logged out. Sending alert to admin...');
                    await sock.sendMessage(global.adminNumber, { text: '⚠️ Bot disconnected permanently. Please restart manually.' });
                    process.exit(1);
                }
            } else if (connection === 'open') {
                connectionState.isConnected = true;
                connectionState.qrDisplayed = false;
                connectionState.retryCount = 0;
                connectionState.lastPing = Date.now();
                printLog.success('Successfully connected to WhatsApp!');
                await sock.sendMessage(sock.user.id, { text: '🎉 Bot connected successfully!' });
            }
        });

        // معالجة الرسائل
        sock.ev.on('messages.upsert', async (messageUpdate) => {
            try {
                const message = messageUpdate.messages[0];
                const chatId = message.key.remoteJid;
                const senderId = message.key.participant || message.key.remoteJid;

                if (!message.message) return;

                const isGroup = chatId.endsWith('@g.us');

                if (isGroup && isGroupAllowed(chatId)) {
                    await incrementMessageCount(chatId, senderId);
                }

                if (isGroup && !isGroupAllowed(chatId)) {
                    if (senderId === global.adminNumber) {
                        let userMessage = message.message?.conversation?.trim().toLowerCase() ||
                            message.message?.extendedTextMessage?.text?.trim().toLowerCase() || '';
                        if (userMessage === '.allowgroup') {
                            await allowGroupCommand(sock, chatId, senderId);
                        } else if (userMessage === '.disallowgroup') {
                            await disallowGroupCommand(sock, chatId, senderId);
                        } else if (userMessage === '.listallowed') {
                            await listAllowedGroupsCommand(sock, chatId, senderId);
                        } else if (userMessage === '.close') {
                            await handleShutdown(sock, chatId, senderId);
                        } else if (userMessage === '.toggleadmins') {
                            await toggleAdminsCommand(sock, chatId, senderId);
                        }
                    }
                    return;
                }

                let userMessage = message.message?.conversation?.trim().toLowerCase() ||
                    message.message?.extendedTextMessage?.text?.trim().toLowerCase() || '';
                const originalMessage = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
                userMessage = userMessage.replace(/\.\s+/g, '.').trim();

                if (!userMessage.startsWith('.')) return;

                let isSenderAdmin = false;
                let isBotAdmin = false;

                if (isGroup) {
                    if (!userGroupData.groups.includes(chatId)) {
                        userGroupData.groups.push(chatId);
                        printLog.info(`Added new group: ${chatId}`);
                        saveUserGroupData();
                    }

                    const adminStatus = await isAdmin(sock, chatId, senderId);
                    isSenderAdmin = adminStatus.isSenderAdmin;
                    isBotAdmin = adminStatus.isBotAdmin;

                    if (!areAllAdminsAllowed() && senderId !== global.adminNumber) return;
                    if (areAllAdminsAllowed() && !isSenderAdmin) return;
                } else {
                    if (senderId !== global.adminNumber) return;
                    if (!userGroupData.users.includes(chatId)) {
                        userGroupData.users.push(chatId);
                        printLog.info(`Added new user: ${chatId}`);
                        saveUserGroupData();
                    }
                }

                const adminCommands = ['.ban', '.kick', '.antilink'];
                const isAdminCommand = adminCommands.some(cmd => userMessage.startsWith(cmd));

                if (isGroup && isAdminCommand && !isBotAdmin) {
                    await sock.sendMessage(chatId, { text: 'Bot needs to be an admin for this command to work fully.' });
                }

                switch (true) {
                    case userMessage.startsWith('.kick'):
                        const mentionedJidListKick = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                        const replyMessageKick = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                        if (mentionedJidListKick.length > 0 || replyMessageKick) {
                            await kickCommand(sock, chatId, senderId, mentionedJidListKick, replyMessageKick, originalMessage);
                        } else {
                            await sock.sendMessage(chatId, { text: 'Please mention a user or reply to a message to kick.' });
                        }
                        break;
                    case userMessage.startsWith('.ban'):
                        const mentionedJidListBan = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                        const replyMessageBan = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                        if (mentionedJidListBan.length > 0 || replyMessageBan) {
                            await banCommand(sock, chatId, senderId, mentionedJidListBan, replyMessageBan);
                        } else {
                            await sock.sendMessage(chatId, { text: 'Please mention users or reply to a message to ban.' });
                        }
                        break;
                    case userMessage === '.bot':
                        await helpCommand(sock, chatId);
                        break;
                    case userMessage.startsWith('.warnings'):
                        const mentionedJidListWarnings = message.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
                        await warningsCommand(sock, chatId, mentionedJidListWarnings);
                        break;
                    case userMessage.startsWith('.warn'):
                        const mentionedJidListWarn = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                        await warnCommand(sock, chatId, senderId, mentionedJidListWarn);
                        break;
                    case userMessage.startsWith('.tag'): // دعم .tag و .tagadmin
                        const tagMessageText = userMessage.slice(4).trim();
                        const tagReplyMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
                        await tagCommand(sock, chatId, senderId, tagMessageText, tagReplyMessage);
                        break;
                    case userMessage.startsWith('.antilink'):
                        await handleAntilinkCommand(sock, chatId, userMessage, senderId, isSenderAdmin);
                        break;
                    case userMessage.startsWith('.topmembers'):
                        await topMembers(sock, chatId, isGroup);
                        break;
                    case userMessage === '.close':
                        await handleShutdown(sock, chatId, senderId);
                        break;
                    case userMessage === '.allowgroup':
                        await allowGroupCommand(sock, chatId, senderId);
                        break;
                    case userMessage === '.disallowgroup':
                        await disallowGroupCommand(sock, chatId, senderId);
                        break;
                    case userMessage === '.listallowed':
                        await listAllowedGroupsCommand(sock, chatId, senderId);
                        break;
                    case userMessage === '.toggleadmins':
                        await toggleAdminsCommand(sock, chatId, senderId);
                        break;
                    default:
                        if (isBotAdmin) {
                            await handleLinkDetection(sock, chatId, message, userMessage, senderId);
                        }
                        break;
                }
            } catch (err) {
                if (err.message?.includes('No SenderKeyRecord')) {
                    printLog.warn('Decryption error detected, reinitializing session...');
                    await fsPromises.rm(authDir, { recursive: true, force: true });
                    setTimeout(startBot, 2000);
                } else {
                    printLog.error('Failed to process message:', err);
                }
            }
        });

        // تحديثات أعضاء المجموعة (تم تعطيل كود المغادرة)
        sock.ev.on('group-participants.update', async (update) => {
            const chatId = update.id;
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

            if (!isGroupAllowed(chatId)) return;

            try {
                // تعطيل كود المغادرة
                /*
                if (update.action === 'remove') {
                    const removedMembers = update.participants;
                    if (removedMembers.length > 0 && !removedMembers.includes(botNumber)) {
                        await sayGoodbye(sock, chatId, removedMembers);
                    }
                }
                */
                if (update.action === 'add') {
                    const newMembers = update.participants;
                    if (newMembers.length > 0) {
                        await welcomeNewMembers(sock, chatId, newMembers);
                    }
                }
            } catch (error) {
                printLog.error('Error handling group update:', error);
            }
        });

    } catch (err) {
        printLog.error('Error in bot initialization:', err);
        const delay = Math.min(2000 * Math.pow(2, connectionState.retryCount), 60000);
        connectionState.retryCount++;
        await new Promise(resolve => setTimeout(resolve, delay));
        startBot();
    }
}

startBot();