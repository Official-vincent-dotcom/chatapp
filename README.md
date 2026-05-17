# 💬 ChatApp

A full-featured WhatsApp-like real-time messaging application built with React and Base44.

## Features

- 🔐 **Authentication** — Sign up & login with email/password
- 👤 **User Profiles** — Username, bio, profile picture
- 💬 **Real-time Chat** — One-on-one messaging with live polling
- ✓✓ **Read Receipts** — Blue double ticks when messages are read
- ⌨️ **Typing Indicator** — Animated dots when someone is typing
- 📷 **Image Sharing** — Send and preview images in chat
- 🟢 **Online Presence** — See who's online and last seen time
- 🔔 **In-app Notifications** — Badge alerts for new messages
- 🔍 **Search** — Search chats and users
- 📱 **Mobile-first UI** — WhatsApp-inspired green/teal design

## Project Structure

```
pages/
  App.jsx              # Router & page wiring
  Layout.jsx           # Bottom nav + notification bell
  ChatsPage.jsx        # Conversation list
  ChatPage.jsx         # Real-time chat UI
  UsersPage.jsx        # User directory (online/offline)
  ProfilePage.jsx      # Edit profile
  SettingsPage.jsx     # Settings + logout

functions/
  updatePresence.ts    # Online/offline tracking
  sendMessage.ts       # Send messages + trigger notifications
  startConversation.ts # Create or find 1-on-1 conversations
  markMessagesRead.ts  # Mark messages read (blue ticks)

entities/
  UserProfile          # username, bio, photo, online status
  Conversation         # participants, last message, timestamp
  Message              # content, type, status, read_by
  TypingIndicator      # real-time typing state
  Notification         # in-app alerts
```

## Tech Stack

- **Frontend:** React (JSX), Tailwind CSS
- **Backend:** Deno (TypeScript serverless functions)
- **Database:** Base44 managed entities
- **Auth:** Base44 built-in authentication
- **Real-time:** Polling (3–8s intervals)

## Getting Started

1. Clone this repo
2. Import into [Base44](https://app.base44.com)
3. Deploy backend functions
4. Share your app URL and start chatting!

---

Built by Faluyi Funmilayo Toyin
