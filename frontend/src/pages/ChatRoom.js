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
  const avatar = queryParams.get('avatar'); // Optional avatar URL

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);

  // For delete-confirmation modal:
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  // For random message highlight
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const ws = useRef(null);
  const typingTimeout = useRef(null);
  
  useEffect(() => {
    const encodedRoom = encodeURIComponent(room);
    ws.current = new WebSocket(`ws://localhost:8000/ws/chat/${encodedRoom}/`);

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

      if (data.id && data.username && data.message && !data.action) {
        setMessages((prev) => {
          const updated = [...prev, data];

          // Random highlight logic (30% chance)
          if (Math.random() < 0.3) {
            setHighlightedMessageId(data.id);
            setTimeout(() => setHighlightedMessageId(null), 3000);
          }

          return updated;
        });
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
    ws.current.onerror = () => setIsConnected(false);

    return () => ws.current?.close();
  }, [room, username]);

  // Send new or edited message
  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = editingMessageId
      ? { id: editingMessageId, message: input, action: 'edit' }
      : { message: input, username, avatar };

    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }

    setInput('');
    setEditingMessageId(null);
    setTypingUser(null);
  };

  // Notify “typing”
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

  const handleEdit = (id, text) => {
    setInput(text);
    setEditingMessageId(id);
  };

  // Open the delete-confirmation modal
  const handleDeleteRequest = (id) => {
    setMessageToDelete(id);
    setShowDeleteModal(true);
  };

  // If user confirms deletion, send “delete_confirmed”
  const confirmDelete = () => {
    if (ws.current.readyState === WebSocket.OPEN && messageToDelete) {
      ws.current.send(
        JSON.stringify({
          action: 'delete_confirmed',
          id: messageToDelete,
        })
      );
    }
    setShowDeleteModal(false);
    setMessageToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setMessageToDelete(null);
  };

  const handleLeaveRoom = () => {
    ws.current?.close();
    navigate('/');
  };

  return (
    <div className="chat-room">
      <h2>Room: {room}</h2>
      <p>Status: {isConnected ? '🟢 Online' : '🔴 Offline'}</p>

      {typingUser && (
        <p className="typing-indicator">{typingUser} is typing...</p>
      )}

      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.username === username ? 'self' : 'other'} ${
              msg.id === highlightedMessageId ? 'highlighted' : ''
            }`}
          >
            <div className="message-header">
              {msg.avatar && (
                <img
                  src={msg.avatar}
                  alt="avatar"
                  className="avatar"
                />
              )}
              <strong>{msg.username}</strong>
              <span className="timestamp">{msg.timestamp}</span>
            </div>
            <p>{msg.message}</p>
            {msg.username === username && (
              <div className="message-controls">
                <button
                  onClick={() => handleEdit(msg.id, msg.message)}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDeleteRequest(msg.id)}
                >
                  🗑️ Delete
                </button>
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

      <button onClick={handleLeaveRoom} className="leave-btn">
        Leave Room
      </button>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <p>Are you sure you want to delete this message?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="confirm-btn" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
