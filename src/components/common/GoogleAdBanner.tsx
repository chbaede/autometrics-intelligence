import React, { useEffect, useRef, useState } from 'react';

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
  const [isAdLoaded, setIsAdLoaded] = useState<boolean>(false);

  useEffect(() => {
    const el = adRef.current;
    if (!el) return;

    const checkStatus = () => {
      const status = el.getAttribute('data-ad-status');
      const hasIframe = el.querySelector('iframe') !== null;
      if (status === 'filled' || hasIframe) {
        setIsAdLoaded(true);
      } else if (status === 'unfilled') {
        setIsAdLoaded(false);
      }
    };

    checkStatus();

    const observer = new MutationObserver(() => {
      checkStatus();
    });

    observer.observe(el, { attributes: true, childList: true, subtree: true });

    if (!pushedRef.current) {
      try {
        if (typeof window !== 'undefined') {
          if (el.innerHTML.trim() === '') {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            pushedRef.current = true;
          }
        }
      } catch (err) {
        console.warn('Google AdSense push caught:', err);
      }
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`w-full overflow-hidden transition-all text-center ${
        isAdLoaded
          ? `rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2.5 ${className}`
          : 'h-0 m-0 p-0 border-0 opacity-0 pointer-events-none'
      }`}
    >
      {isAdLoaded && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mb-1.5 px-1 uppercase tracking-wider">
          <span>Sponsored</span>
          <span>Ad</span>
        </div>
      )}
      <div className={isAdLoaded ? 'min-h-[90px] flex items-center justify-center overflow-hidden' : ''}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: isAdLoaded ? '90px' : '0px' }}
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

