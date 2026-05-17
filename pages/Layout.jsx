import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { User } from "@/api/entities";
import { Notification } from "@/api/entities";

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
      }, 12000);

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
    } catch (e) {}
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

  const clearAllNotifs = async () => {
    try {
      for (const n of notifications) {
        await Notification.update(n.id, { is_read: true });
      }
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) {}
  };

  const pageLabel = NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || "ChatApp";

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Top bar */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-md">
        <h1 className="text-xl font-bold tracking-wide">{pageLabel}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notification panel */}
      {showNotifPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
          <div className="absolute top-14 right-2 z-50 bg-white shadow-2xl rounded-2xl w-80 max-h-96 overflow-hidden border border-gray-100">
            <div className="p-3 border-b flex items-center justify-between bg-gray-50">
              <span className="font-semibold text-gray-700 text-sm">Notifications</span>
              <div className="flex gap-2">
                {notifications.length > 0 && (
                  <button onClick={clearAllNotifs} className="text-xs text-[#075e54] font-medium">Clear all</button>
                )}
                <button onClick={() => setShowNotifPanel(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🔔</div>
                  <p className="text-gray-400 text-sm">You're all caught up!</p>
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    to={`/chat/${n.conversation_id}`}
                    onClick={() => setShowNotifPanel(false)}
                    className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">New message</p>
                      <p className="text-xs text-gray-500 truncate">{n.message_preview || "You have a new message"}</p>
                    </div>
                    <span className="w-2 h-2 bg-[#25D366] rounded-full mt-1 flex-shrink-0"></span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>

      {/* Bottom Nav */}
      <div className="bg-white border-t border-gray-200 flex flex-shrink-0 shadow-lg">
        {NAV_ITEMS.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-all ${active ? "text-[#075e54]" : "text-gray-400"}`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all ${active ? "bg-[#075e54]/10" : ""}`}>
                <span className="text-xl leading-none">{item.icon}</span>
                {item.path === "/chats" && unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`mt-0.5 font-medium ${active ? "text-[#075e54]" : "text-gray-400"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
