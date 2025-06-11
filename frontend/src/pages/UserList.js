import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function UserList() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const username = params.get('username');
  const room = params.get('room');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(room)}/users`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUsers(data);
        
      } catch (error) {
        console.error("Fetch error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (room) loadUsers();
  }, [room]);

  if (loading) return <div className="loading">Loading participants...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  return (
    <div className="userlist-container modal-overlay">
      <header>
        <button onClick={() => navigate(-1)}>← Back</button>
        <h2>Participants in {room}</h2>
      </header>
      <div className="user-grid">
        {users.map(user => (
          <div key={user.username} className={`user-card ${user.status}`}>
            {user.avatar && (
              <img src={user.avatar} alt={user.username} className="user-avatar" />
            )}
            <div className="user-info">
              <strong>
                {user.username}
                {user.username === username && " (You)"}
              </strong>
              <small>
                {user.status === 'online' 
                  ? 'Online now' 
                  : `Last seen ${new Date(user.lastSeen).toLocaleString()}`
                }
              </small>
            </div>
          </div>
        ))}
      </div>
      <button 
        className="enter-chat"
        onClick={() => navigate(`/chat?username=${username}&room=${encodeURIComponent(room)}`)}
      >
        Enter Chat Room
      </button>
    </div>
  );
}