import React, { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Social share platforms with their share URL templates
 */
const SHARE_PLATFORMS = {
  whatsapp: {
    name: "WhatsApp",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: "bg-[#25D366] hover:bg-[#128C7E]",
    getUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`
  },
  twitter: {
    name: "X (Twitter)",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: "bg-black hover:bg-gray-800",
    getUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  },
  facebook: {
    name: "Facebook",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: "bg-[#1877F2] hover:bg-[#0d65d9]",
    getUrl: (url, text) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
  },
  telegram: {
    name: "Telegram",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    color: "bg-[#0088cc] hover:bg-[#006699]",
    getUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  }
};

/**
 * ShareButton - Social sharing component
 * 
 * @param {Object} props
 * @param {string} props.type - Type of content: "series", "episode", "creator", "achievement"
 * @param {string} props.title - Title to share
 * @param {string} props.description - Description text
 * @param {string} props.url - URL to share (defaults to current page)
 * @param {string} props.image - Image URL for rich previews
 * @param {string} props.referralCode - User's referral code to append
 * @param {string} props.variant - "button" | "icon" | "full"
 * @param {string} props.className - Additional CSS classes
 */
export const ShareButton = ({ 
  type = "series",
  title,
  description,
  url,
  image,
  referralCode,
  variant = "button",
  className = "",
  onShare
}) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Build share URL with referral code
  const baseUrl = url || window.location.href;
  const shareUrl = referralCode 
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}ref=${referralCode}`
    : baseUrl;

  // Build share text based on type
  const getShareText = () => {
    switch (type) {
      case "series":
        return `Check out "${title}" on Kona! ${description || "Amazing African mini-series"}`;
      case "episode":
        return `I'm watching "${title}" on Kona! Join me!`;
      case "creator":
        return `Follow ${title} on Kona - great content creator!`;
      case "achievement":
        return `I just unlocked "${title}" on Kona! 🎉`;
      default:
        return `${title} - ${description || "Check this out on Kona!"}`;
    }
  };

  const shareText = getShareText();

  const handleShare = async (platform) => {
    const platformConfig = SHARE_PLATFORMS[platform];
    if (!platformConfig) return;

    const shareLink = platformConfig.getUrl(shareUrl, shareText);
    
    // Open share window
    window.open(shareLink, '_blank', 'width=600,height=400');
    
    // Track share event
    if (onShare) {
      onShare({ platform, type, title, url: shareUrl });
    }
    
    setShowModal(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      
      if (onShare) {
        onShare({ platform: "copy", type, title, url: shareUrl });
      }
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl
        });
        if (onShare) {
          onShare({ platform: "native", type, title, url: shareUrl });
        }
      } catch (err) {
        // User cancelled or error
        if (err.name !== 'AbortError') {
          setShowModal(true);
        }
      }
    } else {
      setShowModal(true);
    }
  };

  // Render based on variant
  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ${className}`}
          data-testid="share-button-icon"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
        {showModal && <ShareModal />}
      </>
    );
  }

  if (variant === "full") {
    return (
      <div className={`space-y-3 ${className}`}>
        <p className="text-sm text-muted-foreground">Share via</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SHARE_PLATFORMS).map(([key, platform]) => (
            <button
              key={key}
              onClick={() => handleShare(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${platform.color}`}
              data-testid={`share-${key}`}
            >
              {platform.icon}
              <span className="text-sm font-medium">{platform.name}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="share-copy-link"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          <span className="text-sm">{copied ? "Copied!" : "Copy Link"}</span>
        </button>
      </div>
    );
  }

  // Modal component
  const ShareModal = () => (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div 
        className="w-full max-w-md bg-[#1a1a2e] rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Share</h3>
          <button 
            onClick={() => setShowModal(false)}
            className="p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 mb-4">
          {image && (
            <img src={image} alt={title} className="w-16 h-16 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{title}</p>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
        </div>

        {/* Share platforms */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {Object.entries(SHARE_PLATFORMS).map(([key, platform]) => (
            <button
              key={key}
              onClick={() => handleShare(key)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
              data-testid={`share-modal-${key}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${platform.color}`}>
                {platform.icon}
              </div>
              <span className="text-xs">{platform.name}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          data-testid="share-modal-copy"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-400" />
              <span className="text-green-400">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copy Link</span>
            </>
          )}
        </button>

        {referralCode && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            Your referral code is included in the link
          </p>
        )}
      </div>
    </div>
  );

  // Default button variant
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNativeShare}
        className={`gap-2 ${className}`}
        data-testid="share-button"
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
      {showModal && <ShareModal />}
    </>
  );
};

/**
 * QuickShare - Minimal share button for cards/thumbnails
 */
export const QuickShare = ({ url, title, referralCode, className = "" }) => {
  const handleQuickShare = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const shareUrl = referralCode 
      ? `${url}${url.includes('?') ? '&' : '?'}ref=${referralCode}`
      : url;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (err) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };

  return (
    <button
      onClick={handleQuickShare}
      className={`p-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors ${className}`}
      data-testid="quick-share"
      aria-label="Share"
    >
      <Share2 className="w-4 h-4 text-white" />
    </button>
  );
};

export default ShareButton;
