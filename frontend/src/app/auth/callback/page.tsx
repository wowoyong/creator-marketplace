'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('access_token', token);
      fetchUser().then(() => {
        router.push('/onboarding');
      });
    } else {
      router.push('/');
    }
  }, [searchParams, fetchUser, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>로딩 중...</p></div>}>
      <CallbackContent />
    </Suspense>
  );
}
