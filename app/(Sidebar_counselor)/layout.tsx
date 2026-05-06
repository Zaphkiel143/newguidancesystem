import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Sidebar from "./sidebar";
import Header from "./header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "E-Gabay STI | Guidance Management System",
  description: "Professional guidance and counseling management for STI College",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<div className="min-h-screen flex flex-col">
      {/* 1. Header sits at the very top */}
      <Header />

      <div className="flex flex-1">
        {/* 2. Sidebar starts below the header (top-16) */}
        <Sidebar />

        {/* 3. Content area clears both header (pt-16) and sidebar (pl-64) */}
        <main className="flex-1 bg-slate-50 min-h-screen pl-64 pt-16">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}