import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FileShit: convert any file in your browser",
  description:
    "Free, unlimited, private file conversion. Everything runs locally in your browser.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-paper text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
