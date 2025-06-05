// src/pages/ChatRoom.js
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import './ChatRoom.css';

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const username = queryParams.get('username');
  const room = queryParams.get('room');
  const avatar = queryParams.get('avatar'); // Optional avatar

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const ws = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const encodedRoom = encodeURIComponent(room);
    const wsUrl = `ws://localhost:8000/ws/chat/${encodedRoom}/`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setIsConnected(true);
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.typing && data.username !== username) {
        setTypingUser(data.username);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
      }

      if (data.message && data.username) {
        setMessages((prev) => [...prev, data]);
      }

      if (data.action === 'edit') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.id ? { ...msg, message: data.message } : msg
          )
        );
      }

      if (data.action === 'delete') {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
      }
    };

    ws.current.onclose = () => setIsConnected(false);
    ws.current.onerror = (e) => {
      console.error('WebSocket error:', e);
      setIsConnected(false);
    };

    return () => ws.current?.close();
  }, [room, username]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = editingMessageId
      ? {
          id: editingMessageId,
          message: input,
          action: 'edit',
        }
      : {
          message: input,
          username,
          avatar,
        };

    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }

    setInput('');
    setEditingMessageId(null);
    setTypingUser(null);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);

    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ typing: true, username }));
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleLeaveRoom = () => setShowModal(true);
  const confirmLeave = () => {
    setShowModal(false);
    ws.current?.close();
    navigate('/');
  };
  const cancelLeave = () => setShowModal(false);

  const handleEdit = (id, message) => {
    setInput(message);
    setEditingMessageId(id);
  };

  const handleDelete = (id) => {
    ws.current.send(JSON.stringify({ action: 'delete', id }));
  };

  return (
    <div className="chat-room">
      <h2>Room: {room}</h2>
      <p>Status: {isConnected ? '🟢 Online' : '🔴 Offline'}</p>

      {typingUser && <p className="typing-indicator">{typingUser} is typing...</p>}

      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.username === username ? 'self' : 'other'}`}
          >
            <div className="message-header">
              {msg.avatar && (
                <img src={msg.avatar} alt="avatar" className="avatar" />
              )}
              <strong>{msg.username}</strong>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <p>{msg.message}</p>
            {msg.username === username && (
              <div className="message-controls">
                <button onClick={() => handleEdit(msg.id, msg.message)}>✏️ Edit</button>
                <button onClick={() => handleDelete(msg.id)}>🗑️ Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="form">
        <div className="input-container">
          <input
            className="input"
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="emoji-btn"
          >
            😊
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <button className="send-btn" type="submit" disabled={!input.trim()}>
          {editingMessageId ? 'Update' : 'Send'}
        </button>
      </form>

      <button onClick={handleLeaveRoom} className="leave-btn">Leave Room</button>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to leave the chat room?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelLeave}>Cancel</button>
              <button className="confirm-btn" onClick={confirmLeave}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
