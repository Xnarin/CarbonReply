import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: "탄소길잡이 | CarbonReply",
  description: "협력사 탄소데이터 응답 도우미",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className={`${pretendard.variable} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
