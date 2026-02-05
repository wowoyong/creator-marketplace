'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: artistId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    setError('');

    try {
      const transaction = await apiFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId,
          title: title.trim(),
          description: description.trim(),
        }),
      });

      router.push('/chat/' + transaction.chatRoomId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="max-w-xl mx-auto p-6 text-center text-gray-500">
          로그인이 필요합니다
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">의뢰 요청</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="의뢰 제목을 입력해주세요"
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상세 내용</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="원하시는 작업 내용을 상세히 설명해주세요&#10;&#10;- 원하는 스타일&#10;- 사이즈/형식&#10;- 기한&#10;- 기타 요청사항"
              rows={8}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !description.trim()}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? '요청 중...' : '의뢰 요청하기'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
