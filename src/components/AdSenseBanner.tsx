import React, { useEffect, useRef } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7149657257008470';
const ADSENSE_SLOT = '6349929034';

export const AdSenseBanner: React.FC = () => {
  const adPushedRef = useRef(false);

  useEffect(() => {
    // Only initialize banner on desktop screens where it's visible
    if (typeof window === 'undefined' || window.innerWidth < 768) return;

    const pushAd = () => {
      if (adPushedRef.current) return;
      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          adPushedRef.current = true;
        }
      } catch {
        // AdSense blocked by ad blocker
      }
    };

    // Poll gracefully until deferred AdSense script is ready
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.adsbygoogle) {
        pushAd();
        clearInterval(interval);
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      aria-label="Iklan"
      className="hidden md:flex fixed inset-x-0 bottom-0 z-[100] min-h-[90px] items-center justify-center border-t border-transparent bg-transparent px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))]"
      style={{ position: 'fixed', bottom: 0, transform: 'translateZ(0)', WebkitTransform: 'translateZ(0)' }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: 'min(728px, 100%)', height: '90px' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={ADSENSE_SLOT}
      />
    </aside>
  );
};

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}
