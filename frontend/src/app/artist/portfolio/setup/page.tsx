'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, apiUpload } from '@/lib/api';
import Navbar from '@/components/Navbar';

export default function PortfolioSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newFiles = [...files, ...selected].slice(0, 20);
    setFiles(newFiles);

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (files.length < 5) {
      alert('최소 5장의 포트폴리오 이미지가 필요합니다');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const { imageUrl } = await apiUpload('/api/uploads/portfolio', files[i]);
        await apiFetch('/api/portfolios', {
          method: 'POST',
          body: JSON.stringify({ imageUrl }),
        });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      router.push('/artists');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">포트폴리오 등록</h1>
        <p className="text-gray-600 mb-8">
          최소 <span className="font-semibold text-gray-900">5장</span>의 이미지를 업로드해주세요 (최대 20장)
        </p>

        {/* 파일 선택 영역 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-500 transition-colors mb-6"
        >
          <p className="text-gray-500 mb-1">클릭하여 이미지 선택</p>
          <p className="text-sm text-gray-400">JPG, PNG, WebP 지원</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* 미리보기 */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {previews.map((preview, i) => (
              <div key={i} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <span className={`text-sm ${files.length >= 5 ? 'text-green-600' : 'text-red-500'}`}>
            선택된 파일: {files.length}개 {files.length < 5 && `(${5 - files.length}장 더 필요)`}
          </span>
        </div>

        {/* 진행률 */}
        {uploading && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-900 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{progress}% 업로드 중...</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={files.length < 5 || uploading}
          className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors"
        >
          {uploading ? `업로드 중... (${progress}%)` : '포트폴리오 등록 완료'}
        </button>
      </main>
    </>
  );
}
