import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://profitsolo.net';

export const metadata: Metadata = {
  title: {
    default: "스타트업 레이더 - 1인 사업 성공 케이스 스터디",
    template: "%s | 스타트업 레이더",
  },
  description: "해외 1인 창업자들의 월 수천만원 매출 비결을 분석합니다. 실제 수치와 전략을 한국어로 깊이 있게 해부하는 스타트업 케이스 스터디.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '스타트업 레이더',
    title: '스타트업 레이더 - 1인 사업 성공 케이스 스터디',
    description: '해외 1인 창업자들의 월 수천만원 매출 비결을 분석합니다.',
    images: [{
      url: '/og-default.png',
      width: 1200,
      height: 630,
      alt: '스타트업 레이더',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '스타트업 레이더',
    description: '해외 1인 창업자들의 월 수천만원 매출 비결을 분석합니다.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="스타트업 레이더" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
