import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guest House IVR System",
  description: "Phone campaign management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-indigo-600 text-white p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold">Guest House IVR</a>
            <div className="flex gap-4">
              <a href="/dashboard" className="hover:underline">Dashboard</a>
              <a href="/hosts" className="hover:underline">Hosts</a>
              <a href="/campaigns" className="hover:underline">Campaigns</a>
              <a href="/admin/recordings" className="hover:underline">Recordings</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}
