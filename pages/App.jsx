import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import ChatsPage from "./ChatsPage";
import ChatPage from "./ChatPage";
import UsersPage from "./UsersPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Chat view — full screen, no nav bar */}
        <Route path="/chat/:conversationId" element={<ChatPage />} />

        {/* Main app with bottom nav */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/chats" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}
