/**
 * Generate pre-rendered HTML files with proper meta tags for each public route
 * This ensures social media crawlers see the correct metadata for each page
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Route configurations with SEO metadata
const routes = {
  '/': {
    title: 'Smart Picker - Order Picking Software | QuickBooks & Xero Integration',
    description: 'Smart Picker - The smart order picking software with barcode scanning, QuickBooks & Xero integration. Eliminate picking errors and boost warehouse efficiency.',
    keywords: 'smart picker, order picking software, warehouse management, barcode scanning, QuickBooks integration, Xero integration, inventory management, warehouse efficiency, mobile order picking, digital picking lists, Australian warehouse software',
    url: 'https://smartpicker.com.au',
  },
  '/pricing': {
    title: 'Pricing - Smart Picker Order Picking Software',
    description: 'Simple, transparent pricing for Smart Picker order picking software. Start with our free trial and scale as you grow. Includes QuickBooks & Xero integration.',
    keywords: 'Smart Picker pricing, order picking software cost, warehouse management pricing, QuickBooks integration pricing, Xero integration pricing, warehouse software cost',
    url: 'https://smartpicker.com.au/pricing',
  },
  '/about-us': {
    title: 'About Smart Picker - Leading Order Picking Software | Our Story',
    description: 'Learn about Smart Picker\'s mission to revolutionize warehouse operations through innovative order picking software, barcode scanning technology, and seamless QuickBooks & Xero integration.',
    keywords: 'about Smart Picker, order picking software company, warehouse management solutions, barcode scanning technology, QuickBooks integration specialists, Xero integration specialists',
    url: 'https://smartpicker.com.au/about-us',
  },
  '/faq': {
    title: 'FAQ - Smart Picker Order Picking Software | Common Questions',
    description: 'Find answers to frequently asked questions about Smart Picker order picking software, barcode scanning, QuickBooks & Xero integration, pricing, and support.',
    keywords: 'Smart Picker FAQ, order picking software questions, barcode scanning help, QuickBooks integration support, Xero integration support, warehouse management software',
    url: 'https://smartpicker.com.au/faq',
  },
  '/blog': {
    title: 'Blog & Resources - Smart Picker Warehouse Management Tips',
    description: 'Expert insights, tips, and case studies for warehouse management, order picking efficiency, and QuickBooks & Xero integration. Stay updated with the latest industry trends.',
    keywords: 'warehouse management blog, order picking tips, QuickBooks integration guide, Xero integration guide, warehouse efficiency, inventory management trends, barcode scanning best practices',
    url: 'https://smartpicker.com.au/blog',
  },
  '/technology': {
    title: 'Technology Stack - Smart Picker Order Picking Software',
    description: 'Discover the cutting-edge technology powering Smart Picker: React, cloud infrastructure, secure APIs, and seamless QuickBooks & Xero integrations.',
    keywords: 'Smart Picker technology, order picking software tech stack, warehouse management technology, cloud warehouse software, secure picking software',
    url: 'https://smartpicker.com.au/technology',
  },
  '/demo': {
    title: 'Request a Demo - Smart Picker Order Picking Software',
    description: 'See Smart Picker in action! Request a personalized demo to discover how our order picking software with barcode scanning and QuickBooks & Xero integration can transform your warehouse.',
    keywords: 'Smart Picker demo, order picking software demo, warehouse management demo, barcode scanning demo, QuickBooks integration demo',
    url: 'https://smartpicker.com.au/demo',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - Smart Picker Order Picking Software',
    description: 'Read Smart Picker\'s privacy policy to understand how we protect your data and ensure secure warehouse management operations.',
    keywords: 'Smart Picker privacy policy, data protection, warehouse software security, order picking data privacy',
    url: 'https://smartpicker.com.au/privacy-policy',
  },
  '/terms-of-service': {
    title: 'Terms of Service - Smart Picker Order Picking Software',
    description: 'Review Smart Picker\'s terms of service for our order picking software and warehouse management solutions.',
    keywords: 'Smart Picker terms of service, order picking software terms, warehouse management agreement',
    url: 'https://smartpicker.com.au/terms-of-service',
  },
  '/login': {
    title: 'Login - Smart Picker Order Picking Software',
    description: 'Access your Smart Picker account to manage orders, track inventory, and streamline your warehouse operations with our advanced order picking software.',
    keywords: 'Smart Picker login, order picking software access, warehouse management login, inventory management system',
    url: 'https://smartpicker.com.au/login',
  },
  '/blog/warehouse-efficiency-guide': {
    title: '10 Proven Strategies to Boost Warehouse Efficiency in 2025 | Smart Picker',
    description: 'Discover 10 actionable strategies to improve warehouse efficiency, reduce picking errors, and streamline operations with Smart Picker\'s order picking software.',
    keywords: 'warehouse efficiency, order picking strategies, warehouse productivity, reduce picking errors, warehouse optimization, Smart Picker tips',
    url: 'https://smartpicker.com.au/blog/warehouse-efficiency-guide',
  },
  '/blog/golden-shore-case-study': {
    title: 'Golden Shore Case Study: 40% Faster Order Picking | Smart Picker',
    description: 'Learn how Golden Shore improved order picking speed by 40% and eliminated errors using Smart Picker\'s barcode scanning and digital workflows.',
    keywords: 'warehouse case study, order picking success story, Smart Picker case study, warehouse efficiency results, barcode scanning benefits',
    url: 'https://smartpicker.com.au/blog/golden-shore-case-study',
  },
  '/blog/system-setup-guide': {
    title: 'Smart Picker Setup Guide: Get Started in 5 Easy Steps',
    description: 'Complete guide to setting up Smart Picker order picking software. Connect QuickBooks or Xero, configure products, and start picking in minutes.',
    keywords: 'Smart Picker setup, order picking software installation, QuickBooks setup guide, Xero integration guide, warehouse software onboarding',
    url: 'https://smartpicker.com.au/blog/system-setup-guide',
  },
};

// Read the base index.html template
function readBaseTemplate() {
  const templatePath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!fs.existsSync(templatePath)) {
    console.error('❌ Error: dist/index.html not found. Please run "npm run build" first.');
    process.exit(1);
  }
  
  return fs.readFileSync(templatePath, 'utf8');
}

// Generate HTML for a specific route by replacing meta tags
function generateHTML(baseTemplate, metadata) {
  const { title, description, keywords, url } = metadata;
  
  let html = baseTemplate;
  
  // Replace title
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${title}</title>`
  );
  
  // Replace description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  
  // Replace keywords
  html = html.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/,
    `<meta name="keywords" content="${keywords}" />`
  );
  
  // Replace OG title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  
  // Replace OG description
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  
  // Replace OG URL
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${url}" />`
  );
  
  // Replace Twitter title
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${title}" />`
  );
  
  // Replace Twitter description
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${description}" />`
  );
  
  // Replace canonical URL
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`
  );
  
  return html;
}

// Main execution
console.log('🚀 Generating pre-rendered HTML files for SEO...\n');

const distDir = path.join(__dirname, '..', 'dist');

// Read base template
const baseTemplate = readBaseTemplate();

// Generate HTML files for each route
Object.entries(routes).forEach(([route, metadata]) => {
  const html = generateHTML(baseTemplate, metadata);
  
  // Determine file path
  let filePath;
  if (route === '/') {
    // Update the main index.html with homepage metadata
    filePath = path.join(distDir, 'index.html');
  } else {
    // Create subdirectory for the route
    const routeDir = path.join(distDir, route.substring(1)); // Remove leading slash
    fs.mkdirSync(routeDir, { recursive: true });
    filePath = path.join(routeDir, 'index.html');
  }
  
  // Write file
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`✅ Generated: ${route} -> ${path.relative(path.join(__dirname, '..'), filePath)}`);
});

console.log('\n✨ All SEO pages generated successfully!');
console.log('📝 Each route now has unique meta tags for social media previews.\n');

