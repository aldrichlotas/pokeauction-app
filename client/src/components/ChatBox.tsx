import { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface ChatBoxProps {
  room: any;
  socket: Socket;
  playerId: string;
}

export function ChatBox({ room, socket, playerId }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room.chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    socket.emit('send_chat', { roomId: room.id, text: inputText });
    setInputText('');
  };

  return (
    <div className="glass-panel" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '400px',
      width: '100%',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        fontWeight: 600,
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        Room Chat
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {room.chatMessages?.map((msg: ChatMessage) => {
          const isMe = msg.senderId === playerId;
          return (
            <div key={msg.id} style={{
              alignSelf: isMe ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {!isMe && msg.senderId !== 'SYSTEM' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  {msg.senderName}
                </div>
              )}
              <div style={{
                background: msg.senderId === 'SYSTEM' ? 'rgba(247, 37, 133, 0.2)' : isMe ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : 'rgba(255, 255, 255, 0.1)',
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                borderBottomRightRadius: msg.senderId === 'SYSTEM' ? '12px' : isMe ? '4px' : '12px',
                borderBottomLeftRadius: msg.senderId === 'SYSTEM' ? '12px' : !isMe ? '4px' : '12px',
                fontSize: '0.9rem',
                wordBreak: 'break-word',
                color: msg.senderId === 'SYSTEM' ? 'var(--accent-color)' : 'inherit',
                fontWeight: msg.senderId === 'SYSTEM' ? 600 : 400,
                textAlign: msg.senderId === 'SYSTEM' ? 'center' : 'left'
              }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{
        padding: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            color: 'white',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          Send
        </button>
      </form>
    </div>
  );
}
