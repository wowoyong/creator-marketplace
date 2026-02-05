import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '크리에이터 마켓플레이스',
  description: '작가와 클라이언트를 연결하는 커미션 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}
