'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

export default function ArtistProfileSetupPage() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [referenceUrls, setReferenceUrls] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiFetch('/api/artists/profile', {
        method: 'POST',
        body: JSON.stringify({
          bio,
          specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
          priceRange: priceRange || undefined,
          referenceUrls: referenceUrls
            .split('\n')
            .map((u) => u.trim())
            .filter(Boolean),
        }),
      });
      await fetchUser();
      router.push('/artist/portfolio/setup');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">작가 프로필 등록</h1>
        <p className="text-gray-600 mb-8">작가로 활동하기 위한 기본 정보를 입력해주세요</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">자기소개</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="작업 스타일, 경력, 작업 가능한 분야 등을 소개해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전문분야 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="일러스트, 캐릭터 디자인, 배경 (쉼표로 구분)"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">쉼표(,)로 구분하여 입력하세요</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">가격대</label>
            <input
              type="text"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="예: 50,000 ~ 200,000원"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">참고 URL</label>
            <textarea
              value={referenceUrls}
              onChange={(e) => setReferenceUrls(e.target.value)}
              rows={3}
              placeholder="포트폴리오 사이트, SNS 등 (한 줄에 하나씩)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !specialties.trim()}
            className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
          >
            {loading ? '등록 중...' : '다음: 포트폴리오 등록'}
          </button>
        </form>
      </main>
    </>
  );
}
