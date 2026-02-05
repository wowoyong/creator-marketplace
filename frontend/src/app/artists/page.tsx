'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

interface Artist {
  id: string;
  nickname: string;
  profileImage: string | null;
  artistProfile: {
    bio: string | null;
    specialties: string[];
    averageRating: number | null;
    portfolios: { id: string; imageUrl: string }[];
  } | null;
  receivedReviews: { rating: number }[];
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchArtists();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`${API_URL}/api/artists${params}`);
      const data = await res.json();
      setArtists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAvgRating = (reviews: { rating: number }[]) => {
    if (reviews.length === 0) return null;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  };

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">작가 찾기</h1>

        <input
          type="text"
          placeholder="작가 이름 또는 키워드로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-lg mb-8 focus:outline-none focus:ring-2 focus:ring-gray-900"
        />

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4" />
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {search ? '검색 결과가 없습니다' : '아직 등록된 작가가 없습니다'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artists.map((artist) => {
              const avgRating = getAvgRating(artist.receivedReviews);
              return (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
                      {artist.profileImage && (
                        <img
                          src={artist.profileImage}
                          alt={artist.nickname}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{artist.nickname}</div>
                      {avgRating && (
                        <div className="text-sm text-yellow-600">
                          {'★'} {avgRating.toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>

                  {artist.artistProfile?.bio && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {artist.artistProfile.bio}
                    </p>
                  )}

                  {artist.artistProfile?.specialties.length ? (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {artist.artistProfile.specialties.map((s, i) => (
                        <span
                          key={i}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {artist.artistProfile?.portfolios.length ? (
                    <div className="flex gap-1">
                      {artist.artistProfile.portfolios.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="w-20 h-20 bg-gray-100 rounded overflow-hidden"
                        >
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
