'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  metadata: Record<string, string> | null;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  TRANSACTION_REQUEST: '📩',
  TRANSACTION_ACCEPT: '✅',
  TRANSACTION_COMPLETE: '🎉',
  REVIEW_RECEIVED: '⭐',
  CHAT_MESSAGE: '💬',
  SYSTEM: '📢',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await apiFetch('/api/notifications');
      setNotifications(data.notifications);
      setTotal(data.total);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif: Notification) => {
    if (!notif.isRead) {
      await apiFetch('/api/notifications/' + notif.id + '/read', { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }

    // 메타데이터에 따라 페이지 이동
    if (notif.metadata?.transactionId) {
      router.push('/transactions/' + notif.metadata.transactionId);
    } else if (notif.metadata?.chatRoomId) {
      router.push('/chat/' + notif.metadata.chatRoomId);
    }
  };

  const markAllAsRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const formatTime = (dateStr: string) => {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">알림</h1>
          <div className="flex gap-3">
            {notifications.some((n) => !n.isRead) && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                모두 읽음
              </button>
            )}
            <button
              onClick={() => router.push('/notifications/settings')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              설정
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">알림이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => markAsRead(notif)}
                className={
                  'w-full text-left flex items-start gap-3 p-4 rounded-lg border transition ' +
                  (notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-purple-50 border-purple-200 hover:bg-purple-100')
                }
              >
                <span className="text-xl shrink-0 mt-0.5">
                  {typeIcons[notif.type] || '🔔'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className={'font-medium text-sm ' + (notif.isRead ? 'text-gray-700' : 'text-gray-900')}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(notif.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{notif.content}</p>
                </div>
                {!notif.isRead && <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
