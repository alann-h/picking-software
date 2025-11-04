// Enhanced SEO configuration for Smart Picker
export const seoConfig = {
  // Default meta tags
  default: {
    title: "Smart Picker - Order Picking Software with QuickBooks & Xero Integration",
    description: "Smart Picker - The smart order picking app with barcode scanning and digital lists. Seamless QuickBooks & Xero integration for Australian warehouses.",
    keywords: "smart picker, order picking software, barcode scanning, warehouse management, QuickBooks integration, Xero integration, inventory management, mobile app, efficiency, digital lists, Australian warehouse software",
    image: "https://smartpicker.com.au/SP.png",
    url: "https://smartpicker.com.au",
    type: "website" as const,
    locale: "en_AU",
    siteName: "Smart Picker"
  },

  // Page-specific SEO configurations
  pages: {
    home: {
      title: "Smart Picker - Order Picking Software with QuickBooks & Xero Integration",
      description: "Smart Picker - The smart order picking app with barcode scanning and digital lists. Perfect for Australian warehouses with QuickBooks & Xero integration.",
      keywords: "smart picker, order picking software, barcode scanning app, warehouse management system, QuickBooks integration, Xero integration, mobile order picking, warehouse efficiency, Australian warehouse software"
    },
    about: {
      title: "About Smart Picker - Leading Order Picking Software | Our Story",
      description: "Learn about Smart Picker's mission to revolutionize warehouse operations through innovative order picking software, barcode scanning technology, and seamless QuickBooks & Xero integration.",
      keywords: "about Smart Picker, order picking software company, warehouse management solutions, barcode scanning technology, QuickBooks integration specialists, Xero integration specialists"
    },
    faq: {
      title: "FAQ - Smart Picker Order Picking Software | Common Questions",
      description: "Find answers to frequently asked questions about Smart Picker order picking software, barcode scanning, QuickBooks & Xero integration, pricing, and support.",
      keywords: "Smart Picker FAQ, order picking software questions, barcode scanning help, QuickBooks integration support, Xero integration support, warehouse management software"
    },
    blog: {
      title: "Blog & Resources - Smart Picker Warehouse Management Tips",
      description: "Expert insights, tips, and case studies for warehouse management, order picking efficiency, and QuickBooks & Xero integration. Stay updated with the latest industry trends.",
      keywords: "warehouse management blog, order picking tips, QuickBooks integration guide, Xero integration guide, warehouse efficiency, inventory management trends, barcode scanning best practices"
    },
    login: {
      title: "Login - Smart Picker Order Picking Software",
      description: "Access your Smart Picker account to manage orders, track inventory, and streamline your warehouse operations with our advanced order picking software.",
      keywords: "Smart Picker login, order picking software access, warehouse management login, inventory management system"
    },
    privacy: {
      title: "Privacy Policy - Smart Picker Order Picking Software",
      description: "Read Smart Picker's privacy policy to understand how we protect your data and ensure secure warehouse management operations.",
      keywords: "Smart Picker privacy policy, data protection, warehouse software security, order picking data privacy"
    },
    terms: {
      title: "Terms of Service - Smart Picker Order Picking Software",
      description: "Review Smart Picker's terms of service for our order picking software and warehouse management solutions.",
      keywords: "Smart Picker terms of service, order picking software terms, warehouse management agreement"
    }
  },

  // Open Graph configurations
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Smart Picker",
    imageWidth: 1200,
    imageHeight: 630,
    imageAlt: "Smart Picker - Order Picking Software with Barcode Scanning"
  },

  // Twitter Card configurations
  twitter: {
    card: "summary_large_image",
    site: "@smartpickerau", // Add your Twitter handle
    creator: "@smartpickerau", // Add your Twitter handle
    imageAlt: "Smart Picker - Order Picking Software with Barcode Scanning"
  },

  // Additional meta tags for better SEO
  additional: {
    robots: "index, follow",
    googlebot: "index, follow",
    author: "Smart Picker Team",
    publisher: "Smart Picker",
    copyright: "© 2025 Smart Picker. All rights reserved.",
    language: "en-AU",
    geo: {
      region: "AU",
      placename: "Australia"
    },
    revisit: "7 days",
    distribution: "global",
    rating: "general"
  },

  // Structured data configurations
  structuredData: {
    organization: {
      name: "Smart Picker",
      url: "https://smartpicker.com.au",
      logo: "https://smartpicker.com.au/SP.png",
      description: "The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately.",
      contactPoint: {
        contactType: "customer service",
        availableLanguage: "English",
        areaServed: "AU"
      },
      sameAs: [
        // Add your social media URLs here
        // "https://www.linkedin.com/company/smart-picker",
        // "https://twitter.com/smartpickerau",
        // "https://www.facebook.com/smartpickerau"
      ]
    },
    softwareApplication: {
      name: "Smart Picker",
      description: "Smart order picking app with barcode scanning and digital lists",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      offers: {
        category: "Business Software",
        price: "Contact for pricing",
        priceCurrency: "AUD"
      },
      featureList: [
        "Barcode scanning",
        "Digital order lists", 
        "Real-time synchronization",
        "Mobile-first design",
        "QuickBooks integration",
        "Xero integration",
        "Customer management",
        "Run organization",
        "Progress tracking"
      ],
      screenshot: "https://smartpicker.com.au/SP.png",
      softwareVersion: "2.0",
      releaseNotes: "Latest version with enhanced barcode scanning and QuickBooks & Xero integration"
    }
  }
};

// Helper function to get SEO config for a specific page
export const getPageSEO = (pageName: keyof typeof seoConfig.pages) => {
  const pageConfig = seoConfig.pages[pageName];
  return {
    ...seoConfig.default,
    ...pageConfig,
    openGraph: {
      ...seoConfig.openGraph,
      title: pageConfig.title,
      description: pageConfig.description,
      url: `${seoConfig.default.url}${pageName === 'home' ? '' : `/${pageName}`}`
    },
    twitter: {
      ...seoConfig.twitter,
      title: pageConfig.title,
      description: pageConfig.description
    }
  };
};

// Helper function to generate canonical URL
export const getCanonicalURL = (path: string = '') => {
  const baseURL = seoConfig.default.url;
  return `${baseURL}${path}`;
};

// Helper function to generate meta keywords array
export const generateKeywords = (baseKeywords: string[], additionalKeywords: string[] = []) => {
  return [...baseKeywords, ...additionalKeywords].join(', ');
};
