'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, MessageCircle, Facebook, Twitter, Link2, Loader2, Instagram } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ShareButtonsPanelProps {
  athleteName: string;
  totalPoints: number;
  rank: number;
  ageCategory: string;
  athleteId: string;
  snapshotId: string;
  currentYearPoints: number;
  club: string;
  photoUrl: string | null;
}

export default function ShareButtonsPanel({
  athleteName,
  totalPoints,
  rank,
  ageCategory,
  athleteId,
  snapshotId,
  currentYearPoints,
  club,
  photoUrl
}: ShareButtonsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/rankings/${athleteId}?snapshot=${snapshotId}`;
    }
    return '';
  };

  // Pre-generate image when component mounts
  useEffect(() => {
    const generateImage = async () => {
      // Wait for card to render
      await new Promise(resolve => setTimeout(resolve, 500));

      if (cardRef.current) {
        try {
          const canvas = await html2canvas(cardRef.current, {
            backgroundColor: '#dc2626',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
          });

          canvas.toBlob((blob) => {
            if (blob) {
              setImageBlob(blob);
              setImageReady(true);
            }
          }, 'image/png');
        } catch (err) {
          console.error('Failed to generate image:', err);
          setImageReady(true); // Allow sharing even if image fails
        }
      }
    };

    generateImage();
  }, [athleteName, totalPoints, rank]);

  const downloadImage = () => {
    if (!imageBlob) return;

    const imageUrl = URL.createObjectURL(imageBlob);
    const link = document.createElement('a');
    link.download = `${athleteName.replace(/\s+/g, '_')}_swiss_taekwondo.png`;
    link.href = imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(imageUrl);
  };

  // Detect if on mobile device
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShare = async (platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'copy') => {
    setSharing(platform);
    const url = getShareUrl();
    const mobile = isMobile();

    try {
      // On mobile, try to use native Web Share API with the image file
      if (mobile && imageBlob && platform !== 'copy') {
        const file = new File(
          [imageBlob],
          `${athleteName.replace(/\s+/g, '_')}_swiss_taekwondo.png`,
          { type: 'image/png' }
        );

        // Check if we can share files
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${athleteName} - Swiss Taekwondo Ranking`,
              text: `Check out ${athleteName}'s ranking! #SwissTaekwondo`,
              url: url,
            });
            setSharing(null);
            return;
          } catch (err) {
            // User cancelled or error - fall through to fallback
            if ((err as Error).name !== 'AbortError') {
              console.error('Native share failed:', err);
            }
          }
        }
      }

      // Fallback for desktop or if native share not supported
      // Download image first on desktop
      if (!mobile && imageBlob) {
        downloadImage();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Determine share URL based on platform
      let shareUrl = '';

      switch (platform) {
        case 'whatsapp':
          shareUrl = mobile
            ? `whatsapp://send?text=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking\n${url}`)}`
            : `https://web.whatsapp.com/send?text=${encodeURIComponent(url)}`;
          break;
        case 'instagram':
          // Instagram doesn't support direct URL sharing
          // Download image for manual sharing
          if (imageBlob) {
            downloadImage();
          }
          if (mobile) {
            shareUrl = `instagram://`;
          }
          break;
        case 'facebook':
          shareUrl = mobile
            ? `fb://facewebmodal/f?href=${encodeURIComponent(url)}`
            : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'twitter':
          shareUrl = mobile
            ? `twitter://post?message=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking ${url}`)}`
            : `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking`)}`;
          break;
        case 'copy':
          await navigator.clipboard.writeText(url);
          if (imageBlob) {
            downloadImage();
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          break;
      }

      if (shareUrl) {
        if (mobile) {
          window.location.href = shareUrl;
        } else {
          const newWindow = window.open(shareUrl, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            window.location.href = shareUrl;
          }
        }
      }
    } catch (err) {
      console.error('Share failed:', err);
    }

    setSharing(null);
  };

  return (
    <>
      {/* Hidden card for image generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
        <div
          ref={cardRef}
          style={{ width: '400px', height: '400px', position: 'relative', overflow: 'hidden' }}
        >
          {/* Gradient Background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom right, #dc2626, #b91c1c, #991b1b)'
          }}></div>

          {/* Pattern overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>

          {/* Content */}
          <div style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            color: 'white',
            textAlign: 'center'
          }}>
            {/* Photo */}
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={athleteName}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid rgba(255,255,255,0.3)',
                  marginBottom: '16px'
                }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '4px solid rgba(255,255,255,0.3)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                fontWeight: 'bold'
              }}>
                {athleteName.charAt(0)}
              </div>
            )}

            {/* Name */}
            <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '4px' }}>{athleteName}</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginBottom: '20px' }}>{club || 'Swiss Taekwondo'}</p>

            {/* Points - Big */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '16px',
              padding: '20px 40px',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <p style={{ fontSize: '56px', fontWeight: '900', marginBottom: '4px', lineHeight: 1 }}>{Math.round(totalPoints)}</p>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Points</p>
            </div>

            {/* Rank Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#eab308',
              color: '#713f12',
              padding: '10px 20px',
              borderRadius: '9999px',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              <span>#{rank}</span>
              <span style={{ color: '#854d0e' }}>in {ageCategory}</span>
            </div>

            {/* Branding */}
            <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: '500' }}>Swiss Taekwondo Federation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-6 pt-6 border-t border-white/20">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3 text-center">Share this profile</p>

        <div className="flex items-center justify-center gap-3">
          {/* WhatsApp */}
          <button
            onClick={() => handleShare('whatsapp')}
            disabled={!imageReady || sharing !== null}
            className="w-12 h-12 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg disabled:hover:scale-100"
            title="Share on WhatsApp"
          >
            {sharing === 'whatsapp' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <MessageCircle className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Instagram */}
          <button
            onClick={() => handleShare('instagram')}
            disabled={!imageReady || sharing !== null}
            className="w-12 h-12 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 disabled:opacity-50 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg disabled:hover:scale-100"
            title="Download for Instagram"
          >
            {sharing === 'instagram' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Instagram className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Facebook */}
          <button
            onClick={() => handleShare('facebook')}
            disabled={!imageReady || sharing !== null}
            className="w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg disabled:hover:scale-100"
            title="Share on Facebook"
          >
            {sharing === 'facebook' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Facebook className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Twitter/X */}
          <button
            onClick={() => handleShare('twitter')}
            disabled={!imageReady || sharing !== null}
            className="w-12 h-12 bg-black hover:bg-gray-800 disabled:opacity-50 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg disabled:hover:scale-100"
            title="Share on X"
          >
            {sharing === 'twitter' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Twitter className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Copy Link */}
          <button
            onClick={() => handleShare('copy')}
            disabled={!imageReady || sharing !== null}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg disabled:hover:scale-100 ${
              copied
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-white/20 hover:bg-white/30 disabled:opacity-50'
            }`}
            title={copied ? 'Copied!' : 'Copy link & download image'}
          >
            {sharing === 'copy' ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : copied ? (
              <Check className="w-6 h-6 text-white" />
            ) : (
              <Link2 className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {!imageReady && (
          <p className="text-white/40 text-xs text-center mt-2">Preparing share card...</p>
        )}
      </div>
    </>
  );
}
