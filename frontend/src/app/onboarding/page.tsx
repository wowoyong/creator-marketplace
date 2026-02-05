'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<'ARTIST' | 'CLIENT' | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();

  const handleSubmit = async () => {
    if (!selectedRole) return;
    setLoading(true);

    try {
      await apiFetch('/api/users/me/role', {
        method: 'PATCH',
        body: JSON.stringify({ role: selectedRole }),
      });
      await fetchUser();
      router.push(selectedRole === 'ARTIST' ? '/artist/profile/setup' : '/artists');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-20">
        <h1 className="text-3xl font-bold text-center mb-2">환영합니다!</h1>
        <p className="text-gray-600 text-center mb-10">
          어떤 역할로 시작하시겠어요?
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedRole('ARTIST')}
            className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'ARTIST'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="text-xl font-semibold mb-1">작가</div>
            <div className="text-gray-500">
              포트폴리오를 등록하고 의뢰를 받아보세요
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('CLIENT')}
            className={`w-full p-6 rounded-xl border-2 text-left transition-all ${
              selectedRole === 'CLIENT'
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="text-xl font-semibold mb-1">클라이언트</div>
            <div className="text-gray-500">
              원하는 작가를 찾아 의뢰를 요청해보세요
            </div>
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedRole || loading}
          className="w-full mt-8 bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
        >
          {loading ? '처리 중...' : '시작하기'}
        </button>
      </main>
    </>
  );
}
