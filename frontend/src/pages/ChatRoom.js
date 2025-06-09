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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const ws = useRef(null);
  const typingTimeout = useRef(null);
  const reconnectInterval = useRef(null);

  const connectWebSocket = () => {
    const encodedRoom = encodeURIComponent(room);
    ws.current = new WebSocket(`ws://localhost:8000/ws/chat/${encodedRoom}/`);

    ws.current.onopen = () => {
      setIsConnected(true);
      clearInterval(reconnectInterval.current);
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
          if (Math.random() < 0.3) {
            setHighlightedMessageId(data.id);
            setTimeout(() => setHighlightedMessageId(null), 3000);
          }
          return updated;
        });
      }

      if (data.action === 'edit') {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.id ? { ...msg, message: data.message } : msg))
        );
      }

      if (data.action === 'delete') {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.id));
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      reconnectInterval.current = setInterval(connectWebSocket, 3000); // Retry every 3 sec
    };

    ws.current.onerror = () => {
      setIsConnected(false);
      ws.current.close();
    };
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      ws.current?.close();
      clearTimeout(typingTimeout.current);
      clearInterval(reconnectInterval.current);
    };
  }, [room, username]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const payload = editingMessageId
      ? { id: editingMessageId, message: input.trim(), action: 'edit' }
      : { message: input.trim(), username, avatar };

    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }

    setInput('');
    setEditingMessageId(null);
    setTypingUser(null);
    setShowEmojiPicker(false);
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

  const handleEdit = (id, text) => {
    setInput(text);
    setEditingMessageId(id);
    setShowEmojiPicker(false);
  };

  const handleDeleteRequest = (id) => {
    setMessageToDelete(id);
    setShowDeleteModal(true);
  };

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
      <p>Status: {isConnected ? '🟢 Online' : '🔴 Offline (reconnecting...)'}</p>

      {typingUser && <p className="typing-indicator">{typingUser} is typing...</p>}

      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.username === username ? 'self' : 'other'} ${
                msg.id === highlightedMessageId ? 'highlighted' : ''
              }`}
            >
              <div className="message-header">
                {msg.avatar && <img src={msg.avatar} alt="avatar" className="avatar" />}
                <strong>{msg.username}</strong>
                <span className="timestamp">{msg.timestamp}</span>
              </div>
              <p>{msg.message}</p>
              {msg.username === username && (
                <div className="message-controls">
                  <button onClick={() => handleEdit(msg.id, msg.message)} disabled={!isConnected}>
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleDeleteRequest(msg.id)} disabled={!isConnected}>
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="form">
        <div className="input-container">
          <input
            className="input"
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={handleInputChange}
            disabled={!isConnected}
          />
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="emoji-btn"
            disabled={!isConnected}
            aria-label="Toggle emoji picker"
          >
            😊
          </button>
        </div>

        {showEmojiPicker && (
          <div className="emoji-picker-container">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        <button className="send-btn" type="submit" disabled={!input.trim() || !isConnected}>
          {editingMessageId ? 'Update' : 'Send'}
        </button>
      </form>

      <button onClick={handleLeaveRoom} className="leave-btn">
        Leave Room
      </button>

      {showDeleteModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <div className="modal">
            <p id="delete-modal-title">Are you sure you want to delete this message?</p>
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
