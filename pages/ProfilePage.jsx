import { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { UserProfile } from "@/api/entities";

function Avatar({ profile, size = "xl" }) {
  const sizes = { xl: "w-24 h-24 text-3xl" };
  const initials = (profile?.username || "?")[0].toUpperCase();
  const colors = ["#25D366", "#075e54", "#128C7E", "#34B7F1", "#9C27B0"];
  const colorIdx = (profile?.username?.charCodeAt(0) || 0) % colors.length;
  if (profile?.profile_picture) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden`}>
        <img src={profile.profile_picture} alt={profile.username} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ backgroundColor: colors[colorIdx] }}>
      {initials}
    </div>
  );
}

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", profile_picture: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      const profiles = await UserProfile.filter({ user_id: user.id });
      if (profiles?.length > 0) {
        const p = profiles[0];
        setProfile(p);
        setForm({ username: p.username || "", bio: p.bio || "", profile_picture: p.profile_picture || "" });
      } else {
        const defaultName = user.full_name || user.email?.split("@")[0] || "User";
        setForm({ username: defaultName, bio: "", profile_picture: "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, profile_picture: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!form.username.trim()) return;
    setSaving(true);
    try {
      const user = await User.me();
      const profiles = await UserProfile.filter({ user_id: user.id });
      const data = {
        user_id: user.id,
        username: form.username.trim(),
        bio: form.bio.trim(),
        profile_picture: form.profile_picture,
        email: user.email,
        is_online: true,
        last_seen: new Date().toISOString(),
      };
      if (profiles?.length > 0) {
        await UserProfile.update(profiles[0].id, data);
      } else {
        await UserProfile.create(data);
      }
      await loadProfile();
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="bg-[#075e54] h-40 animate-pulse"></div>
        <div className="flex-1 p-4 space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mx-auto"></div>
          <div className="h-4 bg-gray-100 rounded w-64 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
      {/* Header */}
      <div className="bg-[#075e54] pb-8 pt-4 flex flex-col items-center relative">
        <div className="relative">
          <Avatar profile={profile || form} size="xl" />
          {editing && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-sm font-medium"
            >
              📷 Change
            </button>
          )}
        </div>
        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />

        {!editing && (
          <div className="mt-3 text-center">
            <h2 className="text-white text-xl font-bold">{profile?.username || form.username || "Your Name"}</h2>
            <p className="text-white/70 text-sm mt-1">{currentUser?.email}</p>
          </div>
        )}
      </div>

      {/* Profile card */}
      <div className="mx-4 -mt-4 bg-white rounded-2xl shadow-md p-4 mb-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Username</label>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full border-b-2 border-[#25D366] py-2 text-gray-800 text-sm outline-none bg-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full border-b-2 border-[#25D366] py-2 text-gray-800 text-sm outline-none bg-transparent resize-none"
                placeholder="Something about you..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-full text-sm text-gray-500 font-medium">
                Cancel
              </button>
              <button onClick={saveProfile} disabled={saving}
                className="flex-1 bg-[#25D366] text-white py-2.5 rounded-full text-sm font-semibold">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">About</span>
              <button onClick={() => setEditing(true)}
                className="text-xs text-[#075e54] font-semibold">Edit</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-400">👤</span>
                <div>
                  <p className="text-xs text-gray-400">Name</p>
                  <p className="text-gray-800 text-sm font-medium">{profile?.username || "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">📧</span>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-gray-800 text-sm">{currentUser?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">💬</span>
                <div>
                  <p className="text-xs text-gray-400">Bio</p>
                  <p className="text-gray-800 text-sm italic">{profile?.bio || "Hey there! I'm using ChatApp."}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">🟢</span>
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <p className="text-green-500 text-sm font-medium">Online</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {saved && (
        <div className="mx-4 mb-4 bg-green-100 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-xl text-center">
          ✅ Profile saved successfully!
        </div>
      )}

      {!editing && (
        <div className="mx-4 bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-3">Member Since</p>
          <p className="text-gray-700 text-sm">
            {currentUser?.created_date
              ? new Date(currentUser.created_date).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })
              : "Recently"}
          </p>
        </div>
      )}
    </div>
  );
}
