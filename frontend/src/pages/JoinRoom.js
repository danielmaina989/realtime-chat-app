import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinRoom.css';

export default function JoinRoom() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !room.trim()) {
      setError('Please enter both your name and the room name.');
      return;
    }
    setError('');
    navigate(`/chat?username=${encodeURIComponent(username)}&room=${encodeURIComponent(room)}`);
  };

  return (
    <div className="join-room">
      <h1>Join Chat Room</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="username">Your Name</label>
        <input
          id="username"
          type="text"
          placeholder="Enter your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
        />

        <label htmlFor="room">Room Name</label>
        <input
          id="room"
          type="text"
          placeholder="Enter room name"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          autoComplete="off"
        />

        <button type="submit">Join</button>
      </form>
    </div>
  );
}
