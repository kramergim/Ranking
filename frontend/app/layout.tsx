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
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen overflow-x-hidden`}>
        {/* Glass Navigation */}
        <nav className="bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link
                href="/"
                className="flex-shrink-0 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Swiss Taekwondo
              </Link>

              {/* Navigation Links - Scrollable on mobile */}
              <div className="flex-1 flex justify-center">
                <div className="flex space-x-2 sm:space-x-6 overflow-x-auto scrollbar-hide">
                  <Link
                    href="/rankings"
                    className="whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Performances
                  </Link>
                  <Link
                    href="/selections"
                    className="whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Selections
                  </Link>
                  <Link
                    href="/competitions"
                    className="whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Competitions
                  </Link>
                </div>
              </div>

              {/* Login */}
              <Link
                href="/auth/login"
                className="flex-shrink-0 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Login
              </Link>
            </div>
          </div>
        </nav>

        {/* Content */}
        {children}
      </body>
    </html>
  );
}
