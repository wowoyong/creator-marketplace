'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

interface ChatRoom {
  id: string;
  members: {
    user: { id: string; nickname: string; profileImage: string | null };
  }[];
  messages: { content: string; type: string; createdAt: string }[];
  transaction: { id: string; title: string; status: string } | null;
  lastMessageAt: string | null;
}

export default function ChatListPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    const loadRooms = async () => {
      try {
        const data = await apiFetch('/api/chat/rooms');
        setRooms(data);
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    };
    loadRooms();
  }, [user]);

  const getOtherUser = (room: ChatRoom) => {
    return room.members.find((m) => m.user.id !== user?.id)?.user;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return Math.floor(diff / 60000) + '분 전';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '시간 전';
    return date.toLocaleDateString('ko-KR');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto p-6 text-center text-gray-500">로딩 중...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">채팅</h1>
        {rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">아직 채팅이 없습니다</p>
            <p className="text-sm">작가에게 의뢰를 요청하면 자동으로 채팅방이 생성됩니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => {
              const other = getOtherUser(room);
              const lastMessage = room.messages[0];
              return (
                <button
                  key={room.id}
                  onClick={() => router.push('/chat/' + room.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 border transition text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0">
                    {other?.profileImage ? (
                      <img src={other.profileImage} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      other?.nickname?.[0] || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold truncate">{other?.nickname || '알 수 없음'}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(room.lastMessageAt)}</span>
                    </div>
                    {lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {lastMessage.type === 'SYSTEM' ? '[시스템] ' + lastMessage.content : lastMessage.content}
                      </p>
                    )}
                    {room.transaction && (
                      <span className="inline-block mt-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                        {room.transaction.title}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
