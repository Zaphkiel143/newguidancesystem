import type { Metadata } from "next";
import { Poppins, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Poppins matches STI's eLMS; used for both headings and body text.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Applies the saved Appearance setting before the first paint, so dark mode
// doesn't flash white on load (components/ThemeSetting.tsx saves it).
// It also restores a hidden desktop sidebar (components/AppShell.tsx).
const THEME_SCRIPT = `try{var t=localStorage.getItem("egabay-theme");if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.dataset.theme="dark";if(localStorage.getItem("egabay-sidebar")==="collapsed")document.documentElement.dataset.sidebar="collapsed"}catch(e){}`;

export const metadata: Metadata = {
  title: "E-Gabay · STI College Sta. Maria",
  description: "Guidance and Counseling Office — STI College Sta. Maria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${plexMono.variable} h-full antialiased`}
      // The theme script below sets data-theme before React loads.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
