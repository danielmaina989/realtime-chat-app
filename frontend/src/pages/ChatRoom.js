// src/pages/ChatRoom.js
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ChatRoom.css';

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const username = queryParams.get('username');
  const room = queryParams.get('room');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    const encodedRoom = encodeURIComponent(room);
    const wsUrl = `ws://localhost:8000/ws/chat/${encodedRoom}/`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setMessages((prev) => [...prev, { user: data.username, text: data.message }]);
    };

    ws.current.onclose = () => {
      console.log('WebSocket closed');
      setIsConnected(false);
    };

    ws.current.onerror = (e) => {
      console.error('WebSocket error:', e);
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [room]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const messageData = {
      message: input,
      username,
    };

    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(messageData));
    } else {
      setMessages((prev) => [
        ...prev,
        { user: username, text: `${input} (Not sent – you're offline)` },
      ]);
    }

    setInput('');
  };

  const handleLeaveRoom = () => {
    setShowModal(true);
  };

  const confirmLeave = () => {
    setShowModal(false);
    ws.current?.close();
    navigate('/');
  };

  const cancelLeave = () => {
    setShowModal(false);
  };

  return (
    <div className="chat-room">
      <h2>Room: {room}</h2>
      <p>Status: {isConnected ? '🟢 Online' : '🔴 Offline'}</p>

      <div className="messages-container">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.user === username ? 'self' : 'other'}`}
          >
            <strong>{msg.user}</strong>: {msg.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="form">
        <input
          className="input"
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="send-btn" type="submit" disabled={!input.trim()}>Send</button>
      </form>

      <button onClick={handleLeaveRoom} className="leave-btn">Leave Room</button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to leave the chat room?</p>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="cancel-btn" onClick={cancelLeave}>Cancel</button>
              <button className="confirm-btn" onClick={confirmLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
