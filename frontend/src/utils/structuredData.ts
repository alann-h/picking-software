// Structured data schemas for SEO
export const structuredDataSchemas = {
  // Organization schema for the main site
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Smart Picker",
    "url": "https://smartpicker.au",
    "logo": "https://smartpicker.au/SP.png",
    "description": "The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately.",
    "sameAs": [
      // Add your social media URLs here when available
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "English"
    }
  },

  // Software application schema
  softwareApplication: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Smart Picker",
    "description": "Smart order picking app with barcode scanning and digital lists",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "category": "Business Software"
    },
    "featureList": [
      "Barcode scanning",
      "Digital order lists",
      "Real-time synchronization",
      "Mobile-first design",
      "QuickBooks integration"
    ]
  },

  // Web page schema for landing page
  webPage: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Smart Picker - Efficient Order Preparation",
    "description": "Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately.",
    "url": "https://smartpicker.au",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Smart Picker"
    }
  },

  // FAQ schema for common questions
  faq: {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Smart Picker?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Smart Picker is a smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately."
        }
      },
      {
        "@type": "Question",
        "name": "How does Smart Picker improve efficiency?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Smart Picker streamlines the order picking process through barcode scanning, digital lists, real-time synchronization, and mobile-first design."
        }
      },
      {
        "@type": "Question",
        "name": "Does Smart Picker integrate with QuickBooks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Smart Picker offers seamless QuickBooks integration for streamlined business operations."
        }
      }
    ]
  },

  // Breadcrumb schema for navigation
  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  })
};

// Helper function to get structured data for specific pages
export const getPageStructuredData = (pageType: keyof typeof structuredDataSchemas, customData?: any) => {
  const baseSchema = structuredDataSchemas[pageType];
  
  if (customData && typeof baseSchema === 'object') {
    return { ...baseSchema, ...customData };
  }
  
  return baseSchema;
};
