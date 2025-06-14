// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import JoinRoom from './pages/JoinRoom';
import ChatRoom from './pages/ChatRoom';
import UserList from './pages/UserList';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/userlist" element={<UserList />} />
        <Route path="/chat" element={<ChatRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
