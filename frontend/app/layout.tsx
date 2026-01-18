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
            <div className="flex items-center h-16 gap-2 sm:gap-4">
              {/* Logo - fixed width */}
              <Link
                href="/"
                className="flex-shrink-0 text-xs sm:text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Swiss TKD
              </Link>

              {/* Navigation Links - Scrollable container */}
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                <div className="flex flex-nowrap gap-1 sm:gap-4 justify-center">
                  <Link
                    href="/rankings"
                    className="flex-shrink-0 whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Performances
                  </Link>
                  <Link
                    href="/competitions"
                    className="flex-shrink-0 whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Competitions
                  </Link>
                  <Link
                    href="/selections"
                    className="flex-shrink-0 whitespace-nowrap inline-flex items-center px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Selections
                  </Link>
                </div>
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
