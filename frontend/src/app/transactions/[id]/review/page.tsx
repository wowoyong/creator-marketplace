'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: transactionId } = use(params);
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          rating,
          content: content.trim() || undefined,
        }),
      });

      router.push('/transactions/' + transactionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '후기 등록에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="max-w-xl mx-auto p-6 text-center text-gray-500">로그인이 필요합니다</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-8">후기 작성</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 별점 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">별점</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-4xl transition-transform hover:scale-110"
                >
                  <span className={star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}>
                    ★
                  </span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">{rating}점</p>
          </div>

          {/* 후기 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">후기 내용 (선택)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="거래에 대한 후기를 남겨주세요"
              rows={5}
              className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
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
              disabled={loading}
              className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {loading ? '등록 중...' : '후기 등록'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
