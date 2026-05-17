import { useState } from "react";
import { User } from "@/api/entities";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await User.register({
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim() || form.email.split("@")[0],
        });
        // After register, log in
        await User.login({ email: form.email.trim(), password: form.password });
      } else {
        await User.login({ email: form.email.trim(), password: form.password });
      }
      // Setup presence + profile
      await fetch("/functions/updatePresence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_online: true }),
      });
      navigate("/chats");
    } catch (err) {
      setError(err?.message || (mode === "login" ? "Invalid email or password." : "Registration failed. Try a different email."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#075e54] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="text-7xl mb-3">💬</div>
        <h1 className="text-white text-3xl font-bold tracking-wide">ChatApp</h1>
        <p className="text-white/60 text-sm mt-1">Simple. Fast. Private.</p>
      </div>

      {/* Card */}
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-full p-1 mb-6">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${mode === "login" ? "bg-[#075e54] text-white shadow" : "text-gray-500"}`}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${mode === "signup" ? "bg-[#075e54] text-white shadow" : "text-gray-500"}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                required={mode === "signup"}
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your name"
                className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#25D366] transition-colors bg-gray-50"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#25D366] transition-colors bg-gray-50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              minLength={6}
              className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-[#25D366] transition-colors bg-gray-50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide hover:bg-[#1da851] active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                {mode === "login" ? "Logging in..." : "Creating account..."}
              </span>
            ) : (
              mode === "login" ? "Log In" : "Create Account"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            className="text-[#075e54] font-semibold"
          >
            {mode === "login" ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>

      <p className="text-white/40 text-xs mt-6">End-to-end encrypted · Always free</p>
    </div>
  );
}
