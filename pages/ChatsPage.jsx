import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "@/api/entities";
import { Conversation } from "@/api/entities";
import { UserProfile } from "@/api/entities";
import { Notification } from "@/api/entities";

function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;
  if (diff < oneDay && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 2 * oneDay) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Avatar({ profile, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-lg", lg: "w-14 h-14 text-xl" };
  const initials = (profile?.username || "?")[0].toUpperCase();
  if (profile?.profile_picture) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 relative`}>
        <img src={profile.profile_picture} alt={profile.username} className="w-full h-full object-cover" />
        {profile.is_online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
        )}
      </div>
    );
  }
  const colors = ["#25D366", "#075e54", "#128C7E", "#34B7F1", "#ECE5DD"];
  const colorIdx = (profile?.username?.charCodeAt(0) || 0) % colors.length;
  return (
    <div className={`${sizes[size]} rounded-full flex-shrink-0 relative flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: colors[colorIdx] }}>
      {initials}
      {profile?.is_online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
      )}
    </div>
  );
}

export default function ChatsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [notifications, setNotifications] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [allConvs, allProfiles] = await Promise.all([
        Conversation.list(),
        UserProfile.list(),
      ]);

      const myConvs = (allConvs || []).filter(c =>
        c.participant_ids?.includes(user.id)
      ).sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));

      const profileMap = {};
      (allProfiles || []).forEach(p => { profileMap[p.user_id] = p; });
      setProfiles(profileMap);

      // Load unread notification counts
      const notifList = await Notification.filter({ recipient_id: user.id, is_read: false });
      const notifMap = {};
      (notifList || []).forEach(n => {
        notifMap[n.conversation_id] = (notifMap[n.conversation_id] || 0) + 1;
      });
      setNotifications(notifMap);
      setConversations(myConvs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const otherId = c.participant_ids?.find(id => id !== currentUser?.id);
    const p = profiles[otherId];
    return p?.username?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 bg-[#075e54]">
          <div className="h-9 bg-white/20 rounded-full animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-3 p-4 border-b animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-48"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search bar */}
      <div className="bg-[#075e54] px-3 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-gray-600 font-semibold text-lg mb-2">No conversations yet</h3>
            <p className="text-gray-400 text-sm mb-4">Go to Users tab to start a new chat</p>
            <Link to="/users"
              className="bg-[#25D366] text-white px-6 py-2.5 rounded-full font-semibold text-sm">
              Find People
            </Link>
          </div>
        ) : (
          filtered.map(conv => {
            const otherId = conv.participant_ids?.find(id => id !== currentUser?.id);
            const otherProfile = profiles[otherId];
            const unread = notifications[conv.id] || 0;
            const isMyLast = conv.last_message_sender_id === currentUser?.id;

            return (
              <Link
                key={conv.id}
                to={`/chat/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 transition-colors"
              >
                <Avatar profile={otherProfile} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-900 truncate text-sm">
                      {otherProfile?.username || "Unknown User"}
                    </span>
                    <span className={`text-xs flex-shrink-0 ml-1 ${unread > 0 ? "text-[#25D366] font-semibold" : "text-gray-400"}`}>
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-xs truncate flex-1">
                      {isMyLast && <span className="text-[#34b7f1] mr-1">✓✓</span>}
                      {conv.last_message || "No messages yet"}
                    </p>
                    {unread > 0 && (
                      <span className="bg-[#25D366] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ml-1 flex-shrink-0">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* FAB */}
      <Link to="/users"
        className="absolute bottom-20 right-4 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg text-2xl hover:bg-[#1da851] transition-colors z-10">
        ✏️
      </Link>
    </div>
  );
}
