import React, { useState, useEffect, useRef } from 'react';

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [value, setValue] = useState('');
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws/chat/room1');

    ws.current.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    return () => {
      ws.current.close();
    };
  }, []);

  const sendMessage = () => {
    if (ws.current && value.trim() !== '') {
      ws.current.send(value);
      setValue('');
    }
  };

  return (
    <div>
      <h2>Chat Room</h2>
      <div style={{ height: '300px', overflowY: 'scroll', border: '1px solid gray' }}>
        {messages.map((msg, index) => (
          <div key={index}><strong>Message:</strong> {msg}</div>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatRoom;
