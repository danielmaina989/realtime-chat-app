import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import './ChatRoom.css';

export default function ChatRoom() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const username = queryParams.get('username');
  const [allUsers, setAllUsers] = useState([]);
  const room = queryParams.get('room');
  const avatar = queryParams.get('avatar');

  const [messages, setMessages] = useState([]);
  const [usersOnline, setUsersOnline] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);

  const ws = useRef(null);
  const typingTimeout = useRef(null);
  const reconnectInterval = useRef(null);
  const messageRefs = useRef({});
  const emojiPickerRef = useRef(null);

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const connectWebSocket = useCallback(() => {
    const encodedRoom = encodeURIComponent(room);
    ws.current = new WebSocket(`ws://localhost:8000/ws/chat/${encodedRoom}/`);

    ws.current.onopen = () => {
      setIsConnected(true);
      clearInterval(reconnectInterval.current);
      // Request undelivered messages only if socket is open
      // Use setTimeout to ensure the socket is fully open before sending
      setTimeout(() => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'get_undelivered' }));
        }
      }, 0);
    };

    ws.current.onmessage = (e) => {
      const data = JSON.parse(e.data);

      // Handle different message types
      switch (data.type) {
      case 'typing':
        if (data.is_typing && data.username !== username) {
        setTypingUser(data.username);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTypingUser(null), 2000);
        } else if (!data.is_typing && data.username === typingUser) {
        setTypingUser(null);
        }
        break;

      case 'presence':
        setUsersOnline(prev => {
        const userExists = prev.includes(data.username);
        if (data.online && !userExists) {
          return [...prev, data.username];
        } else if (!data.online && userExists) {
          return prev.filter(u => u !== data.username);
        }
        return prev;
        });
        break;
      
      case 'user.list':
        const users = Object.entries(data.users).map(([username, status]) => ({
          username,
          status
        }));
        setAllUsers(users);
        break;

      case 'message':
        setMessages((prev) => {
        const exists = prev.some(msg => msg.id === data.id);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
        });
        break;

      case 'reaction_update':
        setMessages(prev => prev.map(msg => 
        msg.id === data.message_id ? { ...msg, reactions: data.reactions } : msg
        ));
        break;

      case 'message_status':
        setMessages(prev => prev.map(msg => {
        if (msg.id !== data.message_id) return msg;
        
        const newMsg = {...msg};
        if (data.status === 'delivered') {
          newMsg.delivered = true;
        } else if (data.status === 'read') {
          newMsg.read_by = [...(msg.read_by || []), data.username];
        }
        return newMsg;
        }));
        break;

      case 'edit':
        setMessages(prev =>
        prev.map((msg) => (msg.id === data.id ? { ...msg, content: data.message } : msg))
        );
        break;

      case 'delete':
        setMessages(prev => prev.filter((msg) => msg.id !== data.id));
        break;

      default:
        // Backward compatibility for old message format
        if (data.id && data.username && data.content) {
        setMessages((prev) => {
          const exists = prev.some(msg => msg.id === data.id);
          if (!exists) return [...prev, data];
          return prev;
        });
        }
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      reconnectInterval.current = setInterval(connectWebSocket, 3000);
    };

    ws.current.onerror = () => {
      setIsConnected(false);
      ws.current.close();
    };
  }, [room, username, typingUser]);

  // Set up intersection observer for read receipts
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageId = entry.target.dataset.messageId;
            const message = messages.find(m => m.id === messageId);
            
            if (message && 
                message.username !== username && 
                (!message.read_by || !message.read_by.includes(username))) {
              if (ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({
                  type: 'mark_read',
                  message_id: messageId
                }));
              }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all message elements
    Object.values(messageRefs.current).forEach(el => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [messages, username]);

  // Close websocket on unmount
  useEffect(() => {
    connectWebSocket();

    return () => {
      ws.current?.close();
      clearTimeout(typingTimeout.current);
      clearInterval(reconnectInterval.current);
    };
  }, [connectWebSocket]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = (e) => {
      e.preventDefault();
      const safeInput = typeof input === 'string' ? input : '';
      if (!safeInput.trim()) return;

      const payload = editingMessageId
        ? { 
            id: editingMessageId, 
            message: safeInput.trim(), 
            action: 'edit',
            type: 'edit'
          }
        : { 
            message: safeInput.trim(), 
            username, 
            avatar,
            type: 'message'
          };

      if (ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify(payload));
        setMessages(prev => [...prev, {
          ...payload,
          id: Date.now().toString(), // Temporary ID until we get the real one from server
          reactions: {},
          read_by: [],
          delivered: false
        }]);
      }

      setInput('');
      setEditingMessageId(null);
      setTypingUser(null);
      setShowEmojiPicker(false);
    };

  

  const PresenceIndicator = () => (
    <div className="presence-indicator">
      <span>Online ({usersOnline.length}): </span>
      {usersOnline.map(user => (
        <span 
          key={user} 
          className={`user-badge ${user === username ? 'you' : ''}`}
        >
          {user}
        </span>
      ))}
    </div>
  );
  const ChatSearch = () => (
    <div className="chat-search">
      <input
        type="text"
        placeholder="🔍 Search messages..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button 
          onClick={() => setSearchTerm('')}
          className="clear-search"
        >
          Clear
        </button>
      )}
    </div>
  );

  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    
    const term = searchTerm.toLowerCase();
    return messages.filter(msg => 
      (msg.content || '').toLowerCase().includes(term) ||
      msg.username.toLowerCase().includes(term)
    );
  }, [messages, searchTerm]);

  const highlightText = (text) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) => 
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ 
        typing: true,
        is_typing: e.target.value.length > 0,
        username 
      }));
    }
  };

  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleAddReaction = (messageId, emoji) => {
    if (ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'reaction',
        message_id: messageId,
        emoji: emoji
      }));
    }
    setActiveReactionMessage(null);
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
      ws.current.send(JSON.stringify({
        type: 'delete',
        action: 'delete_confirmed',
        id: messageToDelete,
      }));
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

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>Room: {room}</h2>
        <p className="connection-status">
          Connection Status: {isConnected ? '🟢 Online' : '🔴 Offline (reconnecting...)'}
        </p>
        <button onClick={() => navigate(`/userlist?username=${username}&room=${encodeURIComponent(room)}`)}>
          👥 Participants
        </button>
        <PresenceIndicator />
      </div>
      {typingUser && (
        <p className="typing-indicator">
          {typingUser} is typing...
          <span className="typing-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      )}
      <div className="chat-container">
        <ChatSearch />
        {searchTerm && (
          <div className="search-results-info">
            Found {filteredMessages.length} matches
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              ref={el => messageRefs.current[msg.id] = el}
              data-message-id={msg.id}
              className={`message ${msg.username === username ? 'self' : 'other'}`}
            >
              <div className="message-header">
                {(msg.avatar || msg.avatar_url) && (
                  <img src={msg.avatar || msg.avatar_url} alt="avatar" className="avatar" />
                )}
                <div className="message-meta">
                  <strong>{msg.username}</strong>
                  <span className="timestamp">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
             <div className="message-content">
              {msg.content || msg.message || ''}
              {highlightText(msg.content || msg.message)}
            </div>
              {/* Reactions */}
              <div className="message-reactions">
                {Object.entries(msg.reactions || {}).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    className={`reaction ${users.includes(username) ? 'active' : ''}`}
                    onClick={() => handleAddReaction(msg.id, emoji)}
                    title={users.join(', ')}
                  >
                    {emoji} {users.length > 1 ? users.length : ''}
                  </button>
                ))}
              </div>

              {/* Quick reaction buttons */}
              {activeReactionMessage === msg.id ? (
                <div className="quick-reactions">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      className="quick-reaction"
                      onClick={() => handleAddReaction(msg.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button 
                    className="quick-reaction more"
                    onClick={() => setShowEmojiPicker(true)}
                  >
                    ⋮
                  </button>
                </div>
              ) : (
                <button 
                  className="add-reaction"
                  onClick={() => setActiveReactionMessage(msg.id)}
                >
                  Add Reaction
                </button>
              )}

              {/* Message status */}
              {msg.username === username && (
                <div className="message-status">
                  {msg.delivered && (
                    <span className="status-icon delivered">✓</span>
                  )}
                  {msg.read_by && msg.read_by.length > 0 && (
                    <>
                      <span className="status-icon read">✓✓</span>
                      <span className="read-by">
                        {msg.read_by.length === 1 ? 'Seen' : `Seen by ${msg.read_by.length}`}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Message controls */}
              {msg.username === username && (
                <div className="message-controls">
                  <button 
                    onClick={() => handleEdit(msg.id, msg.content)} 
                    disabled={!isConnected}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteRequest(msg.id)} 
                    disabled={!isConnected}
                  >
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
          <div className="emoji-picker-container" ref={emojiPickerRef}>
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              width="100%"
              height="350px"
            />
          </div>
        )}

        <button 
          className="send-btn" 
          type="submit" 
          disabled={!((typeof input === 'string' ? input : '').trim()) || !isConnected}
        >
          {editingMessageId ? 'Update' : 'Send'}
        </button>
        <button onClick={handleLeaveRoom} className="leave-btn">
          Leave Room
        </button>
      </form>

      {showDeleteModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
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