import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "탄소길잡이 | CarbonReply",
  description: "협력사 탄소데이터 응답 도우미",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
