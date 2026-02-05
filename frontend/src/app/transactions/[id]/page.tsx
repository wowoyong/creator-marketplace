'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import Navbar from '@/components/Navbar';

interface Transaction {
  id: string;
  title: string;
  description: string;
  status: string;
  agreedPrice: number | null;
  clientId: string;
  artistId: string;
  chatRoomId: string;
  client: { id: string; nickname: string; profileImage: string | null };
  artist: { id: string; nickname: string; profileImage: string | null };
  reviews: { id: string; type: string; authorId: string; rating: number; content: string; author: { nickname: string } }[];
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
}

const statusLabels: Record<string, string> = {
  REQUESTED: '요청됨',
  ACCEPTED: '수락됨',
  IN_PROGRESS: '작업중',
  COMPLETED: '완료',
  REVIEWED: '평가완료',
  CANCELLED: '취소됨',
};

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-purple-100 text-purple-700',
  COMPLETED: 'bg-green-100 text-green-700',
  REVIEWED: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const loadTransaction = async () => {
    try {
      const data = await apiFetch('/api/transactions/' + id);
      setTx(data);
    } catch {
      router.push('/transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadTransaction();
  }, [user, id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await apiFetch('/api/transactions/' + id + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadTransaction();
    } catch (err) {
      alert(err instanceof Error ? err.message : '상태 변경 실패');
    } finally {
      setUpdating(false);
    }
  };

  const getActions = () => {
    if (!tx || !user) return [];
    const isArtist = user.id === tx.artistId;
    const isClient = user.id === tx.clientId;
    const actions: { label: string; status: string; color: string }[] = [];

    if (tx.status === 'REQUESTED' && isArtist) {
      actions.push({ label: '수락', status: 'ACCEPTED', color: 'bg-blue-600 hover:bg-blue-700' });
    }
    if (tx.status === 'ACCEPTED' && isArtist) {
      actions.push({ label: '작업 시작', status: 'IN_PROGRESS', color: 'bg-purple-600 hover:bg-purple-700' });
    }
    if (tx.status === 'IN_PROGRESS' && isArtist) {
      actions.push({ label: '작업 완료', status: 'COMPLETED', color: 'bg-green-600 hover:bg-green-700' });
    }
    if (['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(tx.status) && (isArtist || isClient)) {
      actions.push({ label: '취소', status: 'CANCELLED', color: 'bg-red-600 hover:bg-red-700' });
    }

    return actions;
  };

  const canReview = () => {
    if (!tx || !user || tx.status !== 'COMPLETED') return false;
    const myReviewType = user.id === tx.clientId ? 'CLIENT_TO_ARTIST' : 'ARTIST_TO_CLIENT';
    return !tx.reviews.some((r) => r.type === myReviewType);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-2xl mx-auto p-6 text-center text-gray-500">로딩 중...</div>
      </>
    );
  }

  if (!tx) return null;

  const actions = getActions();

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">{tx.title}</h1>
            <p className="text-gray-500 mt-1">{new Date(tx.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
          <span className={'text-sm px-4 py-2 rounded-full font-medium ' + (statusColors[tx.status] || 'bg-gray-100')}>
            {statusLabels[tx.status] || tx.status}
          </span>
        </div>

        {/* 상세 내용 */}
        <div className="bg-gray-50 rounded-lg p-5 mb-6">
          <p className="whitespace-pre-wrap text-gray-700">{tx.description}</p>
        </div>

        {/* 참여자 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">의뢰인</p>
            <p className="font-semibold">{tx.client.nickname}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">작가</p>
            <p className="font-semibold">{tx.artist.nickname}</p>
          </div>
        </div>

        {/* 채팅 이동 */}
        <button
          onClick={() => router.push('/chat/' + tx.chatRoomId)}
          className="w-full border border-purple-300 text-purple-600 py-3 rounded-lg mb-6 hover:bg-purple-50 font-medium"
        >
          채팅방으로 이동
        </button>

        {/* 액션 버튼 */}
        {actions.length > 0 && (
          <div className="flex gap-3 mb-6">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => updateStatus(action.status)}
                disabled={updating}
                className={'flex-1 text-white py-3 rounded-lg font-medium disabled:opacity-50 ' + action.color}
              >
                {updating ? '처리 중...' : action.label}
              </button>
            ))}
          </div>
        )}

        {/* 후기 작성 버튼 */}
        {canReview() && (
          <button
            onClick={() => router.push('/transactions/' + tx.id + '/review')}
            className="w-full bg-yellow-500 text-white py-3 rounded-lg mb-6 hover:bg-yellow-600 font-medium"
          >
            후기 작성하기
          </button>
        )}

        {/* 후기 목록 */}
        {tx.reviews.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">후기</h2>
            <div className="space-y-4">
              {tx.reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{review.author.nickname}</span>
                    <span className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  {review.content && <p className="text-gray-600 text-sm">{review.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
