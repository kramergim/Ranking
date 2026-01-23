'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Info, ArrowRight, Calendar, Users, Award } from 'lucide-react';

interface CarryOverInfoPopupProps {
  onClose: () => void;
}

export default function CarryOverInfoPopup({ onClose }: CarryOverInfoPopupProps) {
  const [mounted, setMounted] = useState(false);

  // Handle mounting for SSR safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock body scroll when popup is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Don't render on server (SSR safety)
  if (!mounted) return null;

  const popupContent = (
    <>
      {/* Backdrop with fade-in animation */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="carryover-info-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-950 via-red-900 to-rose-950 text-white px-6 py-5 flex items-center justify-between rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-white" />
              </div>
              <h2 id="carryover-info-title" className="text-xl font-bold">
                Points Carry-Over Rules
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
              aria-label="Close popup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Introduction */}
            <p className="text-gray-600">
              Points from the previous year are carried over to the new season according to the following rules:
            </p>

            {/* Standard Carry-Over */}
            <div className="bg-blue-50/70 backdrop-blur-lg border border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-lg mb-2">
                    Standard Carry-Over
                  </h3>
                  <p className="text-blue-800">
                    <span className="font-bold text-2xl text-blue-900">40%</span> of points from the previous year are carried over to the new season.
                  </p>
                </div>
              </div>
            </div>

            {/* New Age Category Rules */}
            <div className="bg-purple-50/70 backdrop-blur-lg border border-purple-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900 text-lg mb-2">
                    New Age Category Rules
                  </h3>
                  <p className="text-purple-800 mb-3">
                    For athletes entering a new age category:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                      <span className="text-purple-800">
                        Only <span className="font-bold">20%</span> of previous points are carried over
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                      <span className="text-purple-800">
                        Carry-over applies only after earning at least <span className="font-bold">5 points</span> in a Coefficient 2 tournament in the new year
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* HUB Bonus Note */}
            <div className="bg-yellow-50/70 backdrop-blur-lg border border-yellow-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900 text-lg mb-2">
                    HUB Bonus Points
                  </h3>
                  <p className="text-yellow-800">
                    The <span className="font-bold">5 points bonus</span> received from last year for being part of the HUB are <span className="font-bold">not</span> considered in the total collected points of last year. Only points collected during tournaments are counted. New bonus 5 points are assigned this year.
                  </p>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-red-950 via-red-900 to-rose-950 text-white font-bold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Render popup content to document.body using portal
  return createPortal(popupContent, document.body);
}
