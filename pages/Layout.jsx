import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";
import { UserProfile } from "@/api/entities";

const NAV_ITEMS = [
  { path: "/chats", icon: "💬", label: "Chats" },
  { path: "/users", icon: "👥", label: "Users" },
  { path: "/profile", icon: "👤", label: "Profile" },
  { path: "/settings", icon: "⚙️", label: "Settings" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const presenceInterval = useRef(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      updatePresence(true);
      loadNotifications();
      presenceInterval.current = setInterval(() => {
        updatePresence(true);
        loadNotifications();
      }, 15000);

      const handleBeforeUnload = () => updatePresence(false);
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        clearInterval(presenceInterval.current);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        updatePresence(false);
      };
    }
  }, [currentUser]);

  const loadUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (e) {
      console.error("Not logged in");
    }
  };

  const updatePresence = async (isOnline) => {
    try {
      await fetch("/functions/updatePresence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: isOnline }),
      });
    } catch (e) {}
  };

  const loadNotifications = async () => {
    try {
      const user = await User.me();
      const notifs = await Notification.filter({ recipient_id: user.id, is_read: false });
      setNotifications(notifs || []);
      setUnreadCount(notifs?.length || 0);
    } catch (e) {}
  };

  const isInChat = location.pathname.startsWith("/chat/");
  if (isInChat) return <>{children}</>;

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Top bar */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-xl font-bold tracking-wide">
          {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || "ChatApp"}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="relative"
          >
            <span className="text-xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification panel */}
      {showNotifPanel && (
        <div className="absolute top-14 right-0 z-50 bg-white shadow-xl rounded-bl-xl w-80 max-h-96 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-semibold text-gray-700">Notifications</span>
            <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">No new notifications</div>
          ) : (
            notifications.map(n => (
              <Link
                key={n.id}
                to={`/chat/${n.conversation_id}`}
                onClick={() => setShowNotifPanel(false)}
                className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b"
              >
                <span className="text-2xl">💬</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">New message</p>
                  <p className="text-xs text-gray-500 truncate">{n.message_preview}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-gray-200 flex flex-shrink-0 shadow-lg">
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                active ? "text-[#075e54] font-semibold" : "text-gray-400"
              }`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
              {item.path === "/chats" && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1 min-w-[16px] h-4 flex items-center justify-center mt-0.5">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
