import React, { useEffect, useRef } from 'react';

interface GoogleAdBannerProps {
  slot?: string;
  client?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({
  slot = '9426228178',
  client = 'ca-pub-6854824605420161',
  format = 'auto',
  responsive = true,
  className = '',
}) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef<boolean>(false);

  useEffect(() => {
    // Only attempt to push to adsbygoogle once per mount
    if (pushedRef.current) return;

    try {
      if (typeof window !== 'undefined' && adRef.current) {
        // Check if the ad container already has child elements / ads iframe
        if (adRef.current.innerHTML.trim() === '') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          pushedRef.current = true;
        }
      }
    } catch (err) {
      // In development / fast-refresh / ad-blocker environments, ignore push errors
      console.warn('Google AdSense push caught:', err);
    }
  }, []);

  return (
    <div className={`w-full overflow-hidden rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2.5 transition-all text-center ${className}`}>
      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mb-1.5 px-1 uppercase tracking-wider">
        <span>Sponsored</span>
        <span>Ad</span>
      </div>
      <div className="min-h-[90px] flex items-center justify-center overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '90px' }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};

export default GoogleAdBanner;
