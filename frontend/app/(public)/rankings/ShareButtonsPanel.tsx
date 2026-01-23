'use client';

import { useState, useEffect } from 'react';
import { Check, MessageCircle, Facebook, Twitter, Link2, Loader2, Instagram, Share2 } from 'lucide-react';

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
  const [mobileShareSupported, setMobileShareSupported] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/rankings/${athleteId}?snapshot=${snapshotId}`;
    }
    return '';
  };

  // Generate image using Canvas API (more reliable on mobile)
  useEffect(() => {
    const generateImage = async () => {
      // Wait a bit for component to mount
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Could not get canvas context');
          setImageReady(true);
          return;
        }

        // Set canvas size (Instagram story size)
        const width = 400;
        const height = 400;
        canvas.width = width * 2; // 2x for retina
        canvas.height = height * 2;
        ctx.scale(2, 2);

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#dc2626');
        gradient.addColorStop(0.5, '#b91c1c');
        gradient.addColorStop(1, '#991b1b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw photo or initial
        const centerX = width / 2;
        let currentY = 50;

        if (photoUrl) {
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = photoUrl;
            });
            // Draw circular photo
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, currentY + 48, 48, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, centerX - 48, currentY, 96, 96);
            ctx.restore();
            // Draw border
            ctx.beginPath();
            ctx.arc(centerX, currentY + 48, 50, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 4;
            ctx.stroke();
          } catch {
            // Photo failed, draw initial
            ctx.beginPath();
            ctx.arc(centerX, currentY + 48, 48, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(athleteName.charAt(0), centerX, currentY + 60);
          }
        } else {
          // Draw initial circle
          ctx.beginPath();
          ctx.arc(centerX, currentY + 48, 48, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 36px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(athleteName.charAt(0), centerX, currentY + 60);
        }

        currentY += 115;

        // Name
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(athleteName, centerX, currentY);
        currentY += 20;

        // Club
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '14px Arial';
        ctx.fillText(club || 'Swiss Taekwondo', centerX, currentY);
        currentY += 30;

        // Points box
        const boxWidth = 160;
        const boxHeight = 90;
        const boxX = centerX - boxWidth / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.roundRect(boxX, currentY, boxWidth, boxHeight, 16);
        ctx.fill();

        // Points number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.fillText(Math.round(totalPoints).toString(), centerX, currentY + 55);

        // Points label
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '12px Arial';
        ctx.fillText('TOTAL POINTS', centerX, currentY + 75);
        currentY += boxHeight + 20;

        // Rank badge
        const badgeText = `#${rank} in ${ageCategory}`;
        ctx.font = 'bold 16px Arial';
        const badgeWidth = ctx.measureText(badgeText).width + 40;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(centerX - badgeWidth / 2, currentY, badgeWidth, 36, 18);
        ctx.fill();
        ctx.fillStyle = '#713f12';
        ctx.fillText(badgeText, centerX, currentY + 24);

        // Branding at bottom
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px Arial';
        ctx.fillText('Swiss Taekwondo Federation', centerX, height - 20);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            setImageBlob(blob);
            setImageReady(true);
            // Check if mobile file sharing is supported
            try {
              const testFile = new File([blob], 'test.png', { type: 'image/png' });
              const canShare = navigator.canShare && navigator.canShare({ files: [testFile] });
              const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              setMobileShareSupported(isMobileDevice && canShare);
            } catch {
              setMobileShareSupported(false);
            }
          } else {
            console.error('Failed to create blob from canvas');
            setImageReady(true);
          }
        }, 'image/png');

      } catch (err) {
        console.error('Failed to generate image:', err);
        setImageReady(true);
      }
    };

    generateImage();
  }, [athleteName, totalPoints, rank, ageCategory, club, photoUrl]);

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

  const handleMobileShare = async () => {
    setSharing('mobile');

    if (!imageBlob) {
      setSharing(null);
      return;
    }

    const url = getShareUrl();
    const file = new File(
      [imageBlob],
      `${athleteName.replace(/\s+/g, '_')}_swiss_taekwondo.png`,
      { type: 'image/png' }
    );

    try {
      await navigator.share({
        files: [file],
        title: `${athleteName} - Swiss Taekwondo`,
        text: url,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        // Share failed - download image as fallback
        downloadImage();
      }
    }

    setSharing(null);
  };

  // Check if on mobile
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleShare = async (platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter' | 'copy') => {
    setSharing(platform);
    const url = getShareUrl();
    const mobile = isMobile();

    try {
      // On mobile Instagram: use native share API
      if (mobile && platform === 'instagram') {
        if (!imageBlob) {
          alert('Image not ready. Please wait and try again.');
          setSharing(null);
          return;
        }

        const file = new File(
          [imageBlob],
          `${athleteName.replace(/\s+/g, '_')}_swiss_taekwondo.png`,
          { type: 'image/png' }
        );

        // Use native share - this should open the share sheet on iOS/Android
        if (navigator.share) {
          try {
            // Try with files first
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file] });
            } else {
              // Fallback: share without files, just open share sheet
              await navigator.share({
                title: `${athleteName} - Swiss Taekwondo`,
                text: `Check out ${athleteName}'s ranking!`,
                url: url,
              });
              // Also save the image
              const blobUrl = URL.createObjectURL(imageBlob);
              window.open(blobUrl, '_blank');
            }
            setSharing(null);
            return;
          } catch (err) {
            if ((err as Error).name === 'AbortError') {
              setSharing(null);
              return;
            }
            console.error('Share failed:', err);
          }
        }

        // Final fallback: open image in new tab for manual save
        const blobUrl = URL.createObjectURL(imageBlob);
        window.open(blobUrl, '_blank');
        alert('Long press on the image to save it, then open Instagram to share.');
        setSharing(null);
        return;
      }

      // Desktop behavior or non-Instagram on mobile
      if (imageBlob && platform !== 'copy') {
        downloadImage();
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      let shareUrl = '';

      switch (platform) {
        case 'whatsapp':
          shareUrl = mobile
            ? `https://api.whatsapp.com/send?text=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking\n${url}`)}`
            : `https://web.whatsapp.com/send?text=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking\n${url}`)}`;
          break;
        case 'instagram':
          // Desktop: image already downloaded, no web share URL
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${athleteName} - Swiss Taekwondo Ranking`)}`;
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
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }

    setSharing(null);
  };

  return (
    <>
      {/* Share buttons */}
      <div className="mt-6 pt-6 border-t border-white/20">
        <p className="text-white/60 text-xs uppercase tracking-wider mb-3 text-center">Share this profile</p>

        {/* Mobile: Single share button when file sharing is supported */}
        {mobileShareSupported ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleMobileShare}
              disabled={!imageReady || sharing !== null}
              className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg"
            >
              {sharing === 'mobile' ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <>
                  <Share2 className="w-5 h-5 text-white" />
                  <span className="text-white font-semibold">Share Card</span>
                </>
              )}
            </button>
            {/* Copy link button */}
            <button
              onClick={() => handleShare('copy')}
              disabled={!imageReady || sharing !== null}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                copied
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Copied!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span className="text-sm">Copy link</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Desktop or fallback: Individual platform buttons */
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
        )}

        {!imageReady && (
          <p className="text-white/40 text-xs text-center mt-2">Preparing share card...</p>
        )}
      </div>
    </>
  );
}
