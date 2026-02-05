import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            크리에이터를 만나보세요
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            일러스트, 캐릭터 디자인, 커미션 작업을 원하시나요?
            <br />
            실력 있는 작가들이 여기 모여 있습니다.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/artists"
              className="bg-gray-900 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors"
            >
              작가 둘러보기
            </Link>
            <Link
              href="/onboarding"
              className="border-2 border-gray-900 text-gray-900 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              작가로 시작하기
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
