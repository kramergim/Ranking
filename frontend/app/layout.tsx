import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Swiss Taekwondo Ranking',
  description: 'Système de ranking et sélection Swiss Taekwondo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen`}>
        {/* Glass Navigation */}
        <nav className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link
                  href="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  Swiss Taekwondo
                </Link>
                <Link
                  href="/rankings"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Athlete Performances
                </Link>
                <Link
                  href="/selections"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Selections
                </Link>
                <Link
                  href="/competitions"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Competitions
                </Link>
              </div>
              <div className="flex items-center">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        {children}
      </body>
    </html>
  );
}
