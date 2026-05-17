# ChatApp 💬

A full-featured real-time messaging app inspired by WhatsApp, built with React and Base44.

## Features

- 🔐 Authentication (signup/login)
- 👤 User profiles with photo, bio, username
- 💬 Real-time one-on-one messaging
- ⌨️ Typing indicators (animated dots)
- ✓✓ Message read receipts (blue ticks)
- 📷 Image sharing with lightbox preview
- 🟢 Online/offline presence + last seen
- 🔔 In-app notifications with badge counter
- 🔍 Search users and chats
- 📱 Mobile-first WhatsApp-style UI

## Pages

| Page | Description |
|------|-------------|
| `ChatsPage.jsx` | Conversation list with unread badges |
| `ChatPage.jsx` | Real-time chat with typing, images, ticks |
| `UsersPage.jsx` | User directory (online/offline) |
| `ProfilePage.jsx` | Edit name, bio, profile photo |
| `SettingsPage.jsx` | Account settings + logout |
| `Layout.jsx` | Bottom nav + notification bell |

## Backend Functions

| Function | Description |
|----------|-------------|
| `updatePresence.ts` | Track online/offline + last seen |
| `sendMessage.ts` | Send messages + trigger notifications |
| `startConversation.ts` | Find or create 1-on-1 conversation |
| `markMessagesRead.ts` | Mark messages read (blue ticks) |

## Entities

- **UserProfile** — username, bio, photo, online status
- **Conversation** — participants, last message, timestamp
- **Message** — content, type, status, read_by
- **TypingIndicator** — real-time typing state
- **Notification** — in-app alerts

## Built with

- React (JSX)
- Base44 platform
- Deno (backend functions)
- TailwindCSS
