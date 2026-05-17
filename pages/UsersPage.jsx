import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { UserProfile } from "@/api/entities";

function Avatar({ profile, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-sm", md: "w-12 h-12 text-lg", lg: "w-14 h-14 text-xl" };
  const initials = (profile?.username || "?")[0].toUpperCase();
  const colors = ["#25D366", "#075e54", "#128C7E", "#34B7F1", "#9C27B0"];
  const colorIdx = (profile?.username?.charCodeAt(0) || 0) % colors.length;
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

function formatLastSeen(isoString) {
  if (!isoString) return "Long ago";
  const date = new Date(isoString);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function UsersPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState(null);

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadUsers = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      const all = await UserProfile.list();
      setProfiles((all || []).filter(p => p.user_id !== user.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (otherUserId) => {
    setStarting(otherUserId);
    try {
      const res = await fetch("/functions/startConversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: otherUserId }),
      });
      const data = await res.json();
      if (data.conversation?.id) {
        navigate(`/chat/${data.conversation.id}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(null);
    }
  };

  const filtered = profiles.filter(p => {
    if (!search) return true;
    return (
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const online = filtered.filter(p => p.is_online);
  const offline = filtered.filter(p => !p.is_online);

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-[#075e54] px-3 pb-3">
          <div className="h-9 bg-white/20 rounded-full animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-28 mb-1"></div>
                <div className="h-3 bg-gray-100 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const UserRow = ({ profile }) => (
    <div
      key={profile.id}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 cursor-pointer transition-colors"
      onClick={() => startChat(profile.user_id)}
    >
      <Avatar profile={profile} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{profile.username || "Unknown"}</p>
        <p className="text-xs text-gray-400 truncate">
          {profile.is_online
            ? <span className="text-green-500 font-medium">● Online</span>
            : `Last seen ${formatLastSeen(profile.last_seen)}`}
        </p>
        {profile.bio && <p className="text-xs text-gray-500 truncate mt-0.5 italic">"{profile.bio}"</p>}
      </div>
      <button
        disabled={starting === profile.user_id}
        className="bg-[#25D366] text-white text-xs px-3 py-1.5 rounded-full font-medium flex-shrink-0"
      >
        {starting === profile.user_id ? "..." : "Chat"}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-[#075e54] px-3 pb-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 rounded-full bg-white text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-gray-600 font-semibold text-lg mb-2">No users found</h3>
            <p className="text-gray-400 text-sm">Try a different search or invite friends to join</p>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-[#25D366] uppercase tracking-wider">
                    Online — {online.length}
                  </p>
                </div>
                {online.map(p => <UserRow key={p.id} profile={p} />)}
              </div>
            )}
            {offline.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Offline — {offline.length}
                  </p>
                </div>
                {offline.map(p => <UserRow key={p.id} profile={p} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
