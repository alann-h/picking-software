const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
      
      // Log performance metrics for debugging
      if (process.env.NODE_ENV === 'development') {
        getCLS((metric) => console.log('CLS:', metric));
        getFID((metric) => console.log('FID:', metric));
        getFCP((metric) => console.log('FCP:', metric));
        getLCP((metric) => console.log('LCP:', metric));
        getTTFB((metric) => console.log('TTFB:', metric));
      }
    });
  }
};

export default reportWebVitals;
