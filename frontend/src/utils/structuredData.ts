// Structured data schemas for SEO
export const structuredDataSchemas = {
  // Organization schema for the main site
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Smart Picker",
    "url": "https://smartpicker.com.au/",
    "logo": "https://smartpicker.com.au/SP.png",
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
      "QuickBooks integration",
      "Xero integration"
    ]
  },

  // Web page schema for landing page
  webPage: {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Smart Picker - Efficient Order Preparation",
    "description": "Boost efficiency with Smart Picker. The smart order picking app with barcode scanning and digital lists to prepare orders faster and more accurately.",
    "url": "https://smartpicker.com.au/",
    "mainEntity": {
      "@type": "SoftwareApplication",
      "name": "Smart Picker"
    }
  },
  
  // Website schema for site name in search results
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Smart Picker",
    "alternateName": "SmartPicker",
    "url": "https://smartpicker.com.au/",
    "description": "Smart Picker - The smart order picking software with barcode scanning, QuickBooks & Xero integration",
    "publisher": {
      "@type": "Organization",
      "@id": "https://smartpicker.com.au/#organization"
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
        "name": "Does Smart Picker integrate with QuickBooks and Xero?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Smart Picker offers seamless integration with both QuickBooks and Xero for streamlined business operations."
        }
      },
      {
        "@type": "Question",
        "name": "How accurate is the barcode scanning feature?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our barcode scanning technology achieves 99.9% accuracy when used properly. The system supports all standard barcode formats including UPC, EAN, Code 128, and QR codes."
        }
      },
      {
        "@type": "Question",
        "name": "Can I customize picking workflows for my business?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Smart Picker offers flexible workflow customization. You can create custom run categories, set priority levels, assign specific pickers to runs, and configure notification settings."
        }
      },
      {
        "@type": "Question",
        "name": "What pricing plans are available?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Smart Picker offers flexible pricing plans to suit businesses of all sizes. We have starter plans for small businesses, professional plans for growing companies, and enterprise solutions for large operations."
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
  }),

  // Local Business schema (if applicable)
  localBusiness: {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Smart Picker",
    "description": "Smart order picking software with barcode scanning and QuickBooks integration",
    "url": "https://smartpicker.com.au",
    "telephone": "+61-XXX-XXX-XXX", // Add your phone number
    "email": "support@smartpicker.com.au", // Add your email
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "AU",
      "addressLocality": "Australia" // Add your city
    },
    "openingHours": "Mo-Fr 09:00-17:00",
    "priceRange": "$$",
    "serviceArea": {
      "@type": "Country",
      "name": "Australia"
    }
  },

  // Review/Rating schema (for future use)
  review: {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "SoftwareApplication",
      "name": "Smart Picker"
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": "4.8",
      "bestRating": "5"
    },
    "author": {
      "@type": "Person",
      "name": "Customer Review"
    }
  },

  // How-to schema for tutorials
  howTo: (title: string, description: string, steps: string[]) => ({
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": title,
    "description": description,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "text": step
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
