'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/hooks/useSocket';
import Navbar from '@/components/Navbar';

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  fileUrl?: string;
  sender: { id: string; nickname: string; profileImage: string | null };
  createdAt: string;
}

export default function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // 이전 메시지 로드
  useEffect(() => {
    if (!user) return;
    const loadMessages = async () => {
      try {
        const data = await apiFetch('/api/chat/rooms/' + roomId + '/messages');
        setMessages(data);
      } catch {
        router.push('/chat');
      }
    };
    loadMessages();
  }, [user, roomId, router]);

  // Socket.IO 이벤트
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join_room', { roomId });

    const handleMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setTyping(data.isTyping ? data.userId : null);
      }
    };

    socket.on('message_received', handleMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('message_received', handleMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [socket, isConnected, roomId, user?.id]);

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    socket.emit('send_message', {
      roomId,
      content: input.trim(),
      type: 'TEXT',
    });

    setInput('');
    socket.emit('typing', { roomId, isTyping: false });
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (!socket) return;

    socket.emit('typing', { roomId, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId, isTyping: false });
    }, 2000);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* 헤더 */}
        <div className="p-4 border-b flex items-center gap-3">
          <button onClick={() => router.push('/chat')} className="text-gray-500 hover:text-gray-700">
            &larr; 뒤로
          </button>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="w-2 h-2 bg-green-500 rounded-full" />
            ) : (
              <span className="w-2 h-2 bg-gray-300 rounded-full" />
            )}
            <span className="text-sm text-gray-500">{isConnected ? '연결됨' : '연결 중...'}</span>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            if (msg.type === 'SYSTEM') {
              return (
                <div key={msg.id} className="text-center">
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{msg.content}</span>
                </div>
              );
            }

            const isMine = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={isMine ? 'flex justify-end' : 'flex justify-start'}>
                <div className={isMine ? 'flex flex-row-reverse items-end gap-2' : 'flex items-end gap-2'}>
                  {!isMine && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold shrink-0">
                      {msg.sender.profileImage ? (
                        <img src={msg.sender.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        msg.sender.nickname[0]
                      )}
                    </div>
                  )}
                  <div>
                    {!isMine && <p className="text-xs text-gray-500 mb-1">{msg.sender.nickname}</p>}
                    <div
                      className={
                        isMine
                          ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-xs'
                          : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-2 max-w-xs'
                      }
                    >
                      {msg.type === 'IMAGE' && msg.fileUrl ? (
                        <img src={msg.fileUrl} alt="" className="rounded-lg max-w-full" />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <p className={isMine ? 'text-xs text-gray-400 mt-1 text-right' : 'text-xs text-gray-400 mt-1'}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          {typing && <p className="text-xs text-gray-400 italic">상대방이 입력 중...</p>}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="메시지를 입력하세요..."
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="bg-purple-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
