import { useEffect, useState } from 'react';

interface CacheStatus {
  isCached: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useLandingPageCache = (): CacheStatus => {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isCached: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkCacheStatus = async () => {
      try {
        // Check if service worker is available
        if ('serviceWorker' in navigator && 'caches' in window) {
          // Check if landing page assets are cached
          const cache = await caches.open('landing-page-v1');
          const cachedAssets = await cache.keys();
          
          // Check if critical assets are cached
          const criticalAssets = [
            '/',
            '/src/index.tsx',
            '/src/App.tsx',
            '/src/components/Hero.tsx',
          ];

          const isFullyCached = criticalAssets.every(asset => 
            cachedAssets.some(request => request.url.includes(asset))
          );

          setCacheStatus({
            isCached: isFullyCached,
            isLoading: false,
            error: null,
          });

          // Preload landing page components if not cached
          if (!isFullyCached) {
            await preloadLandingPageAssets();
          }
        } else {
          setCacheStatus({
            isCached: false,
            isLoading: false,
            error: 'Service Worker or Cache API not supported',
          });
        }
      } catch (error) {
        setCacheStatus({
          isCached: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkCacheStatus();
  }, []);

  const preloadLandingPageAssets = async () => {
    try {
      // Preload critical landing page components
      const componentsToPreload = [
        () => import('../components/landing/FeaturesSection'),
        () => import('../components/landing/IntegrationSection'),
        () => import('../components/landing/LearnMoreSection'),
      ];

      // Preload components in parallel
      await Promise.all(
        componentsToPreload.map(componentLoader => componentLoader())
      );

    } catch (error) {
      console.error('Error preloading landing page components:', error);
    }
  };

  return cacheStatus;
};
