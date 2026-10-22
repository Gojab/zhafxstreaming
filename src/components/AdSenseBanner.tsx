import React, { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-7149657257008470';
const ADSENSE_SLOT = '6349929034';

export const AdSenseBanner: React.FC = () => {
  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    const pushAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // AdSense may be unavailable when an ad blocker is enabled.
      }
    };

    if (window.adsbygoogle) {
      pushAd();
    } else {
      window.setTimeout(pushAd, 250);
    }
  }, []);

  return (
    <aside
      aria-label="Iklan"
      className="fixed inset-x-0 bottom-0 z-[100] flex min-h-[90px] items-center justify-center border-t border-white/10 bg-[#06070B]/95 px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] backdrop-blur-md"
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
