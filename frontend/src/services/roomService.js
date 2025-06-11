// src/services/roomService.js
export const fetchRoomUsers = async (roomName) => {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomName)}/users`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch room users');
  }

  return response.json();
};