# 🤖 Dragunov bot

This is a WhatsApp bot built using the Baileys library for group management, including features like tagging all members, muting/unmuting, and many more. It's designed to help admins efficiently manage WhatsApp groups.

## ⚙️ Features

- **Tag all group members** with the `.tagall` command
- **Admin restricted usage** (Only group admins can use certain commands)
- **Anti-link detection** for group safety
- **Warn and manage group members** with admin control

---

## 📖 About

The Dragunov WhatsApp Bot assists group admins by providing them with tools to efficiently manage large WhatsApp groups. The bot uses the Baileys library to interact with the WhatsApp Web API and supports multi-device features.

It is lightweight and can be easily customized to add more commands as per your requirements. The bot runs in a Node.js environment and provides QR code-based authentication to link your WhatsApp account.

### General Commands:

- `.help` or `.menu`
- `.owner`

### Admin Commands:

- `.ban @user`
- `.promote @user`
- `.demote @user`
- `.mute <minutes>`
- `.unmute`
- `.delete` or `.del`
- `.kick @user`
- `.warnings @user`
- `.warn @user`
- `.antilink`

### Group Management:

- `.tagall`

### Other:

- `.topmembers`
