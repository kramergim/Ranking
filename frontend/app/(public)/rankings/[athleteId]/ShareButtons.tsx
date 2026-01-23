'use client';

import { useState } from 'react';
import { Share2, Check, MessageCircle, Facebook, Twitter, Linkedin, Link2 } from 'lucide-react';

interface ShareButtonsProps {
  athleteName: string;
  totalPoints: number;
  rank: number;
  ageCategory: string;
}

export default function ShareButtons({ athleteName, totalPoints, rank, ageCategory }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  };

  const getShareText = () => {
    return `${athleteName} - ${Math.round(totalPoints)} points | Rank #${rank} in ${ageCategory} | Swiss Taekwondo Rankings`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${athleteName} - Swiss Taekwondo`,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch (err) {
        // User cancelled or error
        setShowShareMenu(true);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(getShareText() + '\n' + getShareUrl())}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}&quote=${encodeURIComponent(getShareText())}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}&url=${encodeURIComponent(getShareUrl())}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`,
  };

  return (
    <div className="relative">
      {/* Main Share Button */}
      <button
        onClick={handleNativeShare}
        className="group flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/30 transition-all duration-200 hover:scale-105"
        aria-label="Share athlete profile"
      >
        <Share2 className="w-5 h-5" />
        <span className="font-semibold text-sm md:text-base">Share</span>
      </button>

      {/* Share Menu Dropdown */}
      {showShareMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowShareMenu(false)}
          />

          {/* Menu */}
          <div className="absolute top-full mt-2 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Share via
            </p>

            {/* WhatsApp */}
            <a
              href={shareLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 transition-colors group"
              onClick={() => setShowShareMenu(false)}
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-gray-700">WhatsApp</span>
            </a>

            {/* Facebook */}
            <a
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group"
              onClick={() => setShowShareMenu(false)}
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-gray-700">Facebook</span>
            </a>

            {/* Twitter/X */}
            <a
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
              onClick={() => setShowShareMenu(false)}
            >
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Twitter className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-gray-700">X (Twitter)</span>
            </a>

            {/* LinkedIn */}
            <a
              href={shareLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors group"
              onClick={() => setShowShareMenu(false)}
            >
              <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <span className="font-medium text-gray-700">LinkedIn</span>
            </a>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100" />

            {/* Copy Link */}
            <button
              onClick={() => {
                handleCopyLink();
                setTimeout(() => setShowShareMenu(false), 1000);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all ${
                copied ? 'bg-green-500' : 'bg-gray-200'
              }`}>
                {copied ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Link2 className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <span className="font-medium text-gray-700">
                {copied ? 'Link copied!' : 'Copy link'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
