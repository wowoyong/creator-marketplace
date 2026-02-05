'use client';

import { useEffect, useState } from 'react';
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
  client: { id: string; nickname: string; profileImage: string | null };
  artist: { id: string; nickname: string; profileImage: string | null };
  createdAt: string;
  reviews: { id: string; type: string }[];
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

export default function TransactionsPage() {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<'client' | 'artist'>('client');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/api/transactions?role=' + tab);
        setTransactions(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, tab]);

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">거래 내역</h1>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('client')}
            className={'px-4 py-2 rounded-full text-sm font-medium ' + (tab === 'client' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            내가 의뢰한
          </button>
          <button
            onClick={() => setTab('artist')}
            className={'px-4 py-2 rounded-full text-sm font-medium ' + (tab === 'artist' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            내가 받은
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg mb-2">거래 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const other = tab === 'client' ? tx.artist : tx.client;
              return (
                <button
                  key={tx.id}
                  onClick={() => router.push('/transactions/' + tx.id)}
                  className="w-full text-left border rounded-lg p-5 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{tx.title}</h3>
                    <span className={'text-xs px-3 py-1 rounded-full font-medium ' + (statusColors[tx.status] || 'bg-gray-100')}>
                      {statusLabels[tx.status] || tx.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{tx.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-400">
                    <span>{tab === 'client' ? '작가' : '의뢰인'}: {other.nickname}</span>
                    <span>{new Date(tx.createdAt).toLocaleDateString('ko-KR')}</span>
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
