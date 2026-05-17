import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/api/entities";
import { UserProfile } from "@/api/entities";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      const profiles = await UserProfile.filter({ user_id: user.id });
      if (profiles?.length > 0) setProfile(profiles[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/functions/updatePresence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: false }),
      });
      await User.logout();
      navigate("/");
    } catch (e) {
      await User.logout();
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-gray-50 p-4 space-y-4 animate-pulse">
        <div className="h-20 bg-white rounded-2xl"></div>
        <div className="h-40 bg-white rounded-2xl"></div>
      </div>
    );
  }

  const SettingRow = ({ icon, label, sublabel, onClick, rightEl, danger }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100 transition-colors ${danger ? "text-red-500" : "text-gray-700"}`}
    >
      <span className="text-xl w-8">{icon}</span>
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${danger ? "text-red-500" : "text-gray-800"}`}>{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
      {rightEl || <span className="text-gray-300">›</span>}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Profile summary card */}
      <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="bg-[#075e54] h-16"></div>
        <div className="px-4 pb-4 -mt-8">
          <div className="flex items-end gap-3">
            <div className="w-16 h-16 rounded-full border-4 border-white shadow bg-[#25D366] flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
              {profile?.profile_picture
                ? <img src={profile.profile_picture} alt="" className="w-full h-full object-cover" />
                : (profile?.username || currentUser?.email || "?")[0].toUpperCase()
              }
            </div>
            <div className="pb-1">
              <p className="font-bold text-gray-900">{profile?.username || currentUser?.full_name || "User"}</p>
              <p className="text-xs text-gray-400">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account settings */}
      <div className="bg-white rounded-2xl shadow-sm mx-4 mb-4 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
        </div>
        <SettingRow icon="👤" label="Edit Profile" sublabel="Change name, bio, photo" onClick={() => navigate("/profile")} />
        <SettingRow icon="📧" label="Email" sublabel={currentUser?.email} onClick={() => {}} rightEl={null} />
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-2xl shadow-sm mx-4 mb-4 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preferences</p>
        </div>
        <SettingRow icon="🔔" label="Notifications" sublabel="In-app alerts enabled" onClick={() => {}} />
        <SettingRow icon="🌙" label="Dark Mode" sublabel="Coming soon" onClick={() => {}} rightEl={<span className="text-xs text-gray-300 bg-gray-100 px-2 py-0.5 rounded">Soon</span>} />
        <SettingRow icon="🔒" label="Privacy" sublabel="Manage who can see your info" onClick={() => {}} />
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl shadow-sm mx-4 mb-4 overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">About</p>
        </div>
        <SettingRow icon="ℹ️" label="App Version" sublabel="1.0.0" onClick={() => {}} />
        <SettingRow icon="📜" label="Terms of Service" onClick={() => {}} />
        <SettingRow icon="🛡️" label="Privacy Policy" onClick={() => {}} />
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-sm mx-4 mb-8 overflow-hidden">
        <SettingRow
          icon="🚪"
          label="Logout"
          sublabel="Sign out of your account"
          onClick={() => setShowLogoutConfirm(true)}
          danger
        />
      </div>

      {/* Logout confirm modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">👋</div>
              <h3 className="text-lg font-bold text-gray-900">Logout?</h3>
              <p className="text-sm text-gray-500 mt-1">You'll need to sign in again to access your chats.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-gray-200 py-3 rounded-full text-sm text-gray-600 font-medium">
                Cancel
              </button>
              <button onClick={handleLogout}
                className="flex-1 bg-red-500 text-white py-3 rounded-full text-sm font-semibold">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
