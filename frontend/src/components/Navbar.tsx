'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';

export default function Navbar() {
  const { user, isLoading, fetchUser, logout } = useAuthStore();
  const { unreadCount, requestPermission } = useNotifications();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      requestPermission();
    }
  }, [user, requestPermission]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          크리에이터 마켓
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/artists" className="text-gray-600 hover:text-gray-900">
            작가 찾기
          </Link>

          {isLoading ? (
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link href="/chat" className="text-gray-600 hover:text-gray-900">
                채팅
              </Link>
              <Link href="/transactions" className="text-gray-600 hover:text-gray-900">
                거래
              </Link>
              <Link href="/notifications" className="relative text-gray-600 hover:text-gray-900">
                알림
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99' : unreadCount}
                  </span>
                )}
              </Link>
              {user.role === 'ARTIST' && (
                <Link
                  href="/artist/profile/setup"
                  className="text-gray-600 hover:text-gray-900"
                >
                  내 프로필
                </Link>
              )}
              <span className="text-sm text-gray-500">{user.nickname}</span>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <a
              href={`${API_URL}/api/auth/kakao`}
              className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-500 transition-colors"
            >
              카카오 로그인
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
