import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { User } from "@/api/entities";
import { Message } from "@/api/entities";
import { Conversation } from "@/api/entities";
import { UserProfile } from "@/api/entities";
import { TypingIndicator } from "@/api/entities";

function formatMsgTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;
  if (diff < oneDay && date.getDate() === now.getDate()) return "Today";
  if (diff < 2 * oneDay) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function Avatar({ profile, size = "sm" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-10 h-10 text-base" };
  const initials = (profile?.username || "?")[0].toUpperCase();
  const colors = ["#25D366", "#075e54", "#128C7E", "#34B7F1"];
  const colorIdx = (profile?.username?.charCodeAt(0) || 0) % colors.length;

  if (profile?.profile_picture) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0`}>
        <img src={profile.profile_picture} alt={profile.username} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: colors[colorIdx] }}>
      {initials}
    </div>
  );
}

function StatusTicks({ status, isOwn }) {
  if (!isOwn) return null;
  if (status === "read") return <span className="text-[#34b7f1] text-xs">✓✓</span>;
  if (status === "delivered") return <span className="text-gray-400 text-xs">✓✓</span>;
  return <span className="text-gray-400 text-xs">✓</span>;
}

function ImageLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white text-3xl" onClick={onClose}>✕</button>
      <img src={src} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
    </div>
  );
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    init();
    return () => {
      clearInterval(pollRef.current);
      clearTyping();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const init = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const conv = await Conversation.get(conversationId);
      const otherId = conv?.participant_ids?.find(id => id !== user.id);
      if (otherId) {
        const allProfiles = await UserProfile.filter({ user_id: otherId });
        setOtherProfile(allProfiles?.[0] || { username: "Unknown", user_id: otherId });
      }

      await loadMessages();
      await markRead(user.id);

      pollRef.current = setInterval(async () => {
        await loadMessages();
        await checkTyping(user.id, otherId);
      }, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await Message.filter({ conversation_id: conversationId });
      setMessages((msgs || []).sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    } catch (e) {}
  };

  const markRead = async (userId) => {
    try {
      await fetch("/functions/markMessagesRead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
    } catch (e) {}
  };

  const checkTyping = async (myId, otherId) => {
    if (!otherId) return;
    try {
      const indicators = await TypingIndicator.filter({ conversation_id: conversationId, user_id: otherId, is_typing: true });
      if (indicators?.length > 0) {
        const latest = indicators[0];
        const expired = new Date(latest.expires_at) < new Date();
        setOtherTyping(!expired);
      } else {
        setOtherTyping(false);
      }
    } catch (e) {}
  };

  const clearTyping = async () => {
    if (!currentUser) return;
    try {
      const existing = await TypingIndicator.filter({ conversation_id: conversationId, user_id: currentUser.id });
      for (const t of (existing || [])) {
        await TypingIndicator.update(t.id, { is_typing: false });
      }
    } catch (e) {}
  };

  const handleTyping = async (val) => {
    setNewMessage(val);
    if (!currentUser) return;
    try {
      const existing = await TypingIndicator.filter({ conversation_id: conversationId, user_id: currentUser.id });
      const expires = new Date(Date.now() + 4000).toISOString();
      if (existing?.length > 0) {
        await TypingIndicator.update(existing[0].id, { is_typing: val.length > 0, expires_at: expires });
      } else if (val.length > 0) {
        await TypingIndicator.create({ conversation_id: conversationId, user_id: currentUser.id, is_typing: true, expires_at: expires });
      }
    } catch (e) {}
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => clearTyping(), 4000);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    try {
      const conv = await Conversation.get(conversationId);
      const recipientId = conv?.participant_ids?.find(id => id !== currentUser?.id);
      await fetch("/functions/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          content: text,
          message_type: "text",
          recipient_id: recipientId,
        }),
      });
      await clearTyping();
      await loadMessages();
    } catch (e) {
      setNewMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        const conv = await Conversation.get(conversationId);
        const recipientId = conv?.participant_ids?.find(id => id !== currentUser?.id);
        await fetch("/functions/sendMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            message_type: "image",
            image_url: base64,
            content: "📷 Image",
            recipient_id: recipientId,
          }),
        });
        await loadMessages();
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setUploading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const label = formatDateLabel(msg.created_date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-[#e5ddd5] items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto shadow-2xl" style={{ background: "#e5ddd5" }}>
      {lightboxImg && <ImageLightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

      {/* Header */}
      <div className="bg-[#075e54] text-white flex items-center gap-3 px-3 py-2.5 flex-shrink-0">
        <button onClick={() => navigate("/chats")} className="text-white text-xl p-1">←</button>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <Avatar profile={otherProfile} size="sm" />
            {otherProfile?.is_online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-[#075e54] rounded-full"></span>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{otherProfile?.username || "Chat"}</p>
            <p className="text-[11px] text-white/70">
              {otherProfile?.is_online
                ? "online"
                : otherProfile?.last_seen
                ? `last seen ${formatMsgTime(otherProfile.last_seen)}`
                : "offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {Object.entries(groupedMessages).map(([label, msgs]) => (
          <div key={label}>
            <div className="flex justify-center my-3">
              <span className="bg-white/80 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">{label}</span>
            </div>
            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUser?.id;
              const prevMsg = msgs[idx - 1];
              const showTail = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5`}>
                  <div
                    className={`max-w-[75%] ${isOwn
                      ? "bg-[#dcf8c6] rounded-tl-2xl rounded-bl-2xl rounded-tr-sm"
                      : "bg-white rounded-tr-2xl rounded-br-2xl rounded-tl-sm"
                    } ${showTail ? "rounded-lg" : ""} px-3 py-1.5 shadow-sm relative`}
                  >
                    {msg.message_type === "image" ? (
                      <div>
                        <img
                          src={msg.image_url}
                          alt="Shared"
                          className="rounded-lg max-w-full cursor-pointer"
                          style={{ maxHeight: 220 }}
                          onClick={() => setLightboxImg(msg.image_url)}
                        />
                      </div>
                    ) : (
                      <p className="text-gray-800 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_date)}</span>
                      <StatusTicks status={msg.status} isOwn={isOwn} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {otherTyping && (
          <div className="flex justify-start mb-1">
            <div className="bg-white rounded-2xl px-4 py-2 shadow-sm flex gap-1 items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="text-5xl mb-3">👋</div>
            <p className="text-gray-500 text-sm">Say hello to {otherProfile?.username}!</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="bg-[#f0f0f0] flex items-end gap-2 px-2 py-2 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-full hover:bg-gray-200 flex-shrink-0"
        >
          {uploading ? "⏳" : "📎"}
        </button>
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />

        <textarea
          value={newMessage}
          onChange={e => handleTyping(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-white rounded-2xl px-4 py-2.5 text-sm text-gray-800 outline-none resize-none shadow-sm max-h-28"
          style={{ overflowY: "auto" }}
        />

        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            newMessage.trim() ? "bg-[#25D366] text-white shadow-md" : "bg-gray-300 text-gray-400"
          }`}
        >
          {sending ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}
