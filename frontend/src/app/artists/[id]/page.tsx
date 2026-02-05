'use client';

import { useState, useEffect, use } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

interface ArtistDetail {
  id: string;
  nickname: string;
  profileImage: string | null;
  artistProfile: {
    bio: string | null;
    specialties: string[];
    priceRange: string | null;
    averageRating: number | null;
    totalTransactions: number;
    referenceUrls: string[];
    portfolios: {
      id: string;
      imageUrl: string;
      title: string | null;
      description: string | null;
    }[];
  } | null;
  receivedReviews: {
    id: string;
    rating: number;
    content: string | null;
    createdAt: string;
    author: { nickname: string; profileImage: string | null };
  }[];
}

export default function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/artists/${id}`)
      .then((res) => res.json())
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!artist || !artist.artistProfile) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500">작가를 찾을 수 없습니다</p>
          <Link href="/artists" className="text-gray-900 underline mt-4 inline-block">
            목록으로 돌아가기
          </Link>
        </main>
      </>
    );
  }

  const profile = artist.artistProfile;

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 프로필 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-gray-300 rounded-full overflow-hidden">
            {artist.profileImage && (
              <img src={artist.profileImage} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{artist.nickname}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              {profile.averageRating && (
                <span className="text-yellow-600">{'★'} {profile.averageRating.toFixed(1)}</span>
              )}
              <span>거래 {profile.totalTransactions}건</span>
            </div>
          </div>
        </div>

        {/* 소개 */}
        {profile.bio && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">소개</h2>
            <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
          </div>
        )}

        {/* 전문분야 & 가격 */}
        <div className="flex gap-8 mb-8">
          {profile.specialties.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-2">전문분야</h2>
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map((s, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.priceRange && (
            <div>
              <h2 className="text-lg font-semibold mb-2">가격대</h2>
              <p className="text-gray-700">{profile.priceRange}</p>
            </div>
          )}
        </div>

        {/* 포트폴리오 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">포트폴리오</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {profile.portfolios.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedImage(p.imageUrl)}
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
              >
                <img src={p.imageUrl} alt={p.title || ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* 후기 */}
        {artist.receivedReviews.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">후기</h2>
            <div className="space-y-4">
              {artist.receivedReviews.map((review) => (
                <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{review.author.nickname}</span>
                    <span className="text-yellow-600 text-sm">
                      {'★'.repeat(review.rating)}
                    </span>
                  </div>
                  {review.content && <p className="text-gray-700 text-sm">{review.content}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 이미지 모달 */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        )}
      </main>
    </>
  );
}
