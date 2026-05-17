import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { Message } from "@/api/entities";
import { Conversation } from "@/api/entities";
import { UserProfile } from "@/api/entities";
import { TypingIndicator } from "@/api/entities";

function formatMsgTime(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function Avatar({ profile, size = "sm" }) {
  const sizes = { sm: "w-9 h-9 text-sm", md: "w-10 h-10 text-base" };
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
  if (status === "read") return <span className="text-[#34b7f1] text-xs ml-1">✓✓</span>;
  if (status === "delivered") return <span className="text-gray-300 text-xs ml-1">✓✓</span>;
  return <span className="text-gray-300 text-xs ml-1">✓</span>;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
    </div>
  );
}

function Lightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-5 right-5 text-white text-3xl bg-black/40 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
      <img src={src} alt="Preview" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
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
  const [otherTyping, setOtherTyping] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const pollRef = useRef(null);
  const currentUserRef = useRef(null);
  const otherIdRef = useRef(null);

  useEffect(() => {
    init();
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(typingTimeoutRef.current);
      stopTyping();
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
      currentUserRef.current = user;

      const conv = await Conversation.get(conversationId);
      const otherId = conv?.participant_ids?.find(id => id !== user.id);
      otherIdRef.current = otherId;

      if (otherId) {
        const profiles = await UserProfile.filter({ user_id: otherId });
        setOtherProfile(profiles?.[0] || { username: "Unknown", user_id: otherId });
      }

      await loadMessages();
      await markRead();

      pollRef.current = setInterval(async () => {
        await loadMessages();
        if (otherIdRef.current) await checkTyping(otherIdRef.current);
        await markRead();
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

  const markRead = async () => {
    try {
      await fetch("/functions/markMessagesRead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
    } catch (e) {}
  };

  const checkTyping = async (otherId) => {
    try {
      const indicators = await TypingIndicator.filter({
        conversation_id: conversationId,
        user_id: otherId,
        is_typing: true,
      });
      if (indicators?.length > 0 && new Date(indicators[0].expires_at) > new Date()) {
        setOtherTyping(true);
      } else {
        setOtherTyping(false);
      }
    } catch (e) {}
  };

  const stopTyping = async () => {
    const user = currentUserRef.current;
    if (!user) return;
    try {
      const existing = await TypingIndicator.filter({ conversation_id: conversationId, user_id: user.id });
      for (const t of (existing || [])) {
        await TypingIndicator.update(t.id, { is_typing: false });
      }
    } catch (e) {}
  };

  const handleTyping = async (val) => {
    setNewMessage(val);
    const user = currentUserRef.current;
    if (!user) return;
    try {
      const existing = await TypingIndicator.filter({ conversation_id: conversationId, user_id: user.id });
      const expires = new Date(Date.now() + 5000).toISOString();
      if (existing?.length > 0) {
        await TypingIndicator.update(existing[0].id, { is_typing: val.length > 0, expires_at: expires });
      } else if (val.length > 0) {
        await TypingIndicator.create({ conversation_id: conversationId, user_id: user.id, is_typing: true, expires_at: expires });
      }
    } catch (e) {}
    clearTimeout(typingTimeoutRef.current);
    if (val.length > 0) {
      typingTimeoutRef.current = setTimeout(stopTyping, 5000);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      const conv = await Conversation.get(conversationId);
      const recipientId = conv?.participant_ids?.find(id => id !== currentUserRef.current?.id);
      await fetch("/functions/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, content: text, message_type: "text", recipient_id: recipientId }),
      });
      await stopTyping();
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
        try {
          const base64 = ev.target.result;
          const conv = await Conversation.get(conversationId);
          const recipientId = conv?.participant_ids?.find(id => id !== currentUserRef.current?.id);
          await fetch("/functions/sendMessage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conversationId, message_type: "image", image_url: base64, content: "📷 Image", recipient_id: recipientId }),
          });
          await loadMessages();
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setUploading(false);
    }
    e.target.value = "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Group by date
  const grouped = messages.reduce((acc, msg) => {
    const label = formatDateLabel(msg.created_date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(msg);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-[#e5ddd5] items-center justify-center">
        <div className="text-4xl animate-bounce">💬</div>
        <p className="text-gray-500 text-sm mt-2 animate-pulse">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto shadow-2xl" style={{ background: "#e5ddd5 url('https://i.imgur.com/q9oBFJM.png')" }}>
      {lightboxImg && <Lightbox src={lightboxImg} onClose={() => setLightboxImg(null)} />}

      {/* Header */}
      <div className="bg-[#075e54] text-white flex items-center gap-3 px-3 py-2 flex-shrink-0 shadow-md">
        <button onClick={() => navigate("/chats")} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative flex-shrink-0">
          <Avatar profile={otherProfile} size="sm" />
          {otherProfile?.is_online && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-[#075e54] rounded-full"></span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{otherProfile?.username || "Chat"}</p>
          <p className="text-[11px] text-white/70 leading-tight">
            {otherTyping ? (
              <span className="text-[#25D366] font-medium">typing...</span>
            ) : otherProfile?.is_online ? (
              "online"
            ) : otherProfile?.last_seen ? (
              `last seen ${formatMsgTime(otherProfile.last_seen)}`
            ) : "offline"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </button>
          <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-10">
            <div className="bg-white/80 backdrop-blur rounded-2xl px-6 py-5 shadow">
              <div className="text-4xl mb-2">👋</div>
              <p className="text-gray-600 font-semibold text-sm">Say hello to {otherProfile?.username || "them"}!</p>
              <p className="text-gray-400 text-xs mt-1">This is the beginning of your conversation.</p>
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([label, msgs]) => (
          <div key={label}>
            {/* Date divider */}
            <div className="flex justify-center my-3">
              <span className="bg-white/80 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">{label}</span>
            </div>

            {msgs.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUser?.id;
              const showAvatar = !isOwn && (idx === 0 || msgs[idx - 1]?.sender_id !== msg.sender_id);

              return (
                <div key={msg.id} className={`flex items-end gap-1.5 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  {!isOwn && (
                    <div className="w-6 flex-shrink-0">
                      {showAvatar && <Avatar profile={otherProfile} size="sm" />}
                    </div>
                  )}

                  <div className={`max-w-[72%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                    {msg.message_type === "image" && msg.image_url ? (
                      <div
                        className={`rounded-2xl overflow-hidden shadow-sm cursor-pointer ${isOwn ? "rounded-br-sm" : "rounded-bl-sm"}`}
                        onClick={() => setLightboxImg(msg.image_url)}
                      >
                        <img
                          src={msg.image_url}
                          alt="Image"
                          className="max-w-[220px] max-h-56 object-cover"
                          loading="lazy"
                        />
                        <div className={`px-2 py-1 flex items-center justify-end gap-1 ${isOwn ? "bg-[#dcf8c6]" : "bg-white"}`}>
                          <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_date)}</span>
                          <StatusTicks status={msg.status} isOwn={isOwn} />
                        </div>
                      </div>
                    ) : (
                      <div className={`px-3 py-2 rounded-2xl shadow-sm ${
                        isOwn ? "bg-[#dcf8c6] rounded-br-sm" : "bg-white rounded-bl-sm"
                      }`}>
                        <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] text-gray-400">{formatMsgTime(msg.created_date)}</span>
                          <StatusTicks status={msg.status} isOwn={isOwn} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex items-end gap-1.5">
            <div className="w-6 flex-shrink-0">
              <Avatar profile={otherProfile} size="sm" />
            </div>
            <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm px-1 py-1">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="bg-[#f0f0f0] px-2 py-2 flex items-end gap-2 flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow text-gray-500 flex-shrink-0 hover:bg-gray-50 transition-colors"
        >
          {uploading ? (
            <svg className="animate-spin w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        <div className="flex-1 bg-white rounded-2xl px-4 py-2.5 shadow flex items-end gap-2 min-h-[42px]">
          <textarea
            value={newMessage}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="flex-1 text-sm text-gray-800 outline-none resize-none bg-transparent max-h-28 leading-relaxed placeholder-gray-400"
            style={{ overflowY: newMessage.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button className="text-gray-400 p-0.5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow transition-all ${
            newMessage.trim() ? "bg-[#25D366] text-white hover:bg-[#1da851] active:scale-95" : "bg-gray-300 text-gray-400"
          }`}
        >
          {sending ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
