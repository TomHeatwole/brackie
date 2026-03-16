import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavigationProgressProvider } from "./_components/navigation-progress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl =
  process.env.VERCEL_URL != null
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "brackie",
  description: "March Madness brackets and pools",
  openGraph: {
    title: "Brackie!",
    description: "March Madness brackets and pools",
    images: [{ url: "https://brackie.games/share_logo.png", width: 512, height: 512, alt: "Brackie!" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Brackie!",
    description: "March Madness brackets and pools",
    images: ["https://brackie.games/share_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NavigationProgressProvider>{children}</NavigationProgressProvider>
      </body>
    </html>
  );
}
