async function sayGoodbye(sock, chatId, removedMembers) {
    try {
        if (!removedMembers || removedMembers.length === 0) {
            console.log('No members to say goodbye to.');
            return;
        }

        const maxMentions = 50;
        const membersToMention = removedMembers.slice(0, maxMentions);
        const mentionsText = membersToMention.map(member => `@${member.split('@')[0]}`).join(', ');
        const goodbyeText = `Goodbye ${mentionsText} 👋 We will never miss you!${removedMembers.length > maxMentions ? ' (and others)' : ''}`;

        // Send goodbye message in the group
        await sock.sendMessage(chatId, {
            text: goodbyeText,
            mentions: membersToMention
        });

        // // Send private message to each removed member
        // for (const member of removedMembers) {
        //     try {
        //         await sock.sendMessage(member, {
        //             text: 'لن نشتاق لك! تم طردك من المجموعة.'
        //         });
        //     } catch (error) {
        //         console.error(`Failed to send private message to ${member}:`, error);
        //     }
        // }
    } catch (error) {
        console.error('Error in sayGoodbye:', error);
    }
}

module.exports = sayGoodbye;