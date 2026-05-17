import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User } from "@/api/entities";
import Layout from "./Layout";
import ChatsPage from "./ChatsPage";
import ChatPage from "./ChatPage";
import UsersPage from "./UsersPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import AuthPage from "./AuthPage";

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#075e54]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💬</div>
          <p className="text-white/80 text-sm animate-pulse">Loading ChatApp...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/chat/:conversationId" element={
          <ProtectedRoute><ChatPage /></ProtectedRoute>
        } />
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/chats" element={<ChatsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/chats" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}
