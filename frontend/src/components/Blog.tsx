import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO from './SEO';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { TrendingUp, Gauge, BarChart3, Star, Clock, ArrowRight } from 'lucide-react';

// --- Blog Data ---
const blogPosts = [
  {
    id: 1,
    title: '10 Ways to Improve Warehouse Efficiency with Smart Picker',
    excerpt: "Discover proven strategies to boost your warehouse productivity using Smart Picker's advanced features and best practices.",
    content: "Warehouse efficiency is crucial for maintaining competitive advantage in today's fast-paced market. Smart Picker offers numerous features designed to streamline operations and reduce errors...",
    category: 'Efficiency Tips',
    readTime: '5 min read',
    publishDate: '2025-09-05',
    image: 'https://media.istockphoto.com/id/892827582/photo/male-warehouse-worker-with-barcode-scanner.jpg?s=2048x2048&w=is&k=20&c=Vt0cx-AmGWabmuqQXziG0FPIceqq2JlADfdoH6k0g6s=',
    featured: true,
    tags: ['warehouse management', 'efficiency', 'productivity', 'best practices'],
    slug: 'warehouse-efficiency-guide'
  },
  {
    id: 4,
    title: 'Case Study: How Golden Shore Products Increased Picking Speed by 40%',
    excerpt: 'Real-world example of how Golden Shore Products implemented Smart Picker and achieved remarkable efficiency gains.',
    content: 'Golden Shore Products, a mid-sized manufacturing company, was struggling with manual picking processes that were prone to errors and delays...',
    category: 'Case Study',
    readTime: '7 min read',
    publishDate: '2025-09-05',
    featured: true,
    image: 'https://media.istockphoto.com/id/2198930975/photo/professionals-examining-inventory-in-a-busy-distribution-warehouse-in-sydney-australia-during.jpg?s=2048x2048&w=is&k=20&c=ajuLH6XIELgaFxFkTPLcQ-u4g6gV6Yblymk0mrcwBT4=',
    tags: ['case study', 'success story', 'ROI', 'implementation'],
    slug: 'golden-shore-case-study'
  },
  {
    id: 5,
    title: 'Complete System Setup Guide: QuickBooks, Xero & User Management',
    excerpt: 'Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users.',
    content: 'Setting up Smart Picker is straightforward and can be completed in just a few minutes. The system integrates seamlessly with either QuickBooks Online or Xero, and includes comprehensive user management features...',
    category: 'Setup Guide',
    readTime: '5 min read',
    publishDate: '2025-09-05',
    image: '/quickbooks-logo.png',
    featured: false,
    tags: ['setup', 'QuickBooks', 'Xero', 'user management', 'configuration'],
    slug: 'system-setup-guide'
  },
];

// --- Helper Badge Component ---
const KeywordBadge: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <motion.span 
    className="inline-flex cursor-default items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800"
    whileHover={{ scale: 1.08, y: -3 }}
    transition={{ type: 'spring', stiffness: 300 }}
  >
    {icon}
    {label}
  </motion.span>
);

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

// Image hover variants
const imageHoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.1 }
};

// Arrow hover variants
const arrowHoverVariants = {
  rest: { x: 0, opacity: 0 },
  hover: { x: 4, opacity: 1 }
};

// --- Main Blog Component ---
const Blog: React.FC = () => {
  const navigate = useNavigate();

  const featuredPosts = blogPosts.filter(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);
  
  const handleNavigate = (slug: string | undefined) => {
    if (slug) {
      navigate(`/blog/${slug}`);
    } else {
      console.log('No detailed post available');
    }
  };

  return (
    <>
      <SEO 
        title="Blog - Smart Picker"
        description="Read the latest articles, tips, and case studies from the Smart Picker team on warehouse management, order picking, and inventory control."
        canonicalUrl="https://smartpicker.com.au/blog"
      />
      
      <BreadcrumbNavigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.section variants={itemVariants} className="mb-12 text-center lg:mb-16">
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
              Blog & Resources
            </h1>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-600">
              Expert insights, tips, and case studies for warehouse management excellence.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <KeywordBadge icon={<TrendingUp size={16} />} label="Industry Insights" />
              <KeywordBadge icon={<Gauge size={16} />} label="Efficiency Tips" />
              <KeywordBadge icon={<BarChart3 size={16} />} label="Case Studies" />
            </div>
          </motion.section>

          {/* Featured Posts */}
          <motion.section className="mb-12 lg:mb-16">
            <motion.h2 
              variants={itemVariants}
              className="mb-6 text-2xl font-semibold text-slate-900 lg:text-3xl"
            >
              Featured Articles
            </motion.h2>
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-1 gap-8 md:grid-cols-2"
            >
              {featuredPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={itemVariants}
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="flex flex-col overflow-hidden rounded-lg bg-white shadow-lg"
                >
                  <div className="relative h-52 w-full overflow-hidden">
                    <motion.img
                      variants={imageHoverVariants}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-block rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800">
                          {post.category}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-medium text-amber-800">
                          <Star size={14} /> Featured
                        </span>
                      </div>
                      <h3 className="mb-3 text-xl font-semibold text-slate-900 line-clamp-2 hover:text-blue-700">
                        {post.title}
                      </h3>
                      <p className="mb-4 text-slate-600 line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock size={14} /> {post.readTime}
                      </span>
                      <motion.button
                        onClick={() => handleNavigate(post.slug)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50 cursor-pointer"
                      >
                        Read More
                      </motion.button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </motion.section>

          {/* Regular Posts */}
          <motion.section className="mb-12 lg:mb-16">
            <motion.h2 
              variants={itemVariants} 
              className="mb-6 text-2xl font-semibold text-slate-900 lg:text-3xl"
            >
              Latest Articles
            </motion.h2>
            <motion.div 
              variants={containerVariants}
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            >
              {regularPosts.map((post) => (
                <motion.article
                  key={post.id}
                  variants={itemVariants}
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="flex flex-col overflow-hidden rounded-lg bg-white shadow-lg"
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    <motion.img
                      variants={imageHoverVariants}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <div>
                      <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium uppercase tracking-wide text-blue-800">
                        {post.category}
                      </span>
                      <h3 className="mb-2 text-lg font-semibold text-slate-900 line-clamp-2 hover:text-blue-700">
                        {post.title}
                      </h3>
                      <p className="mb-4 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock size={12} /> {post.readTime}
                      </span>
                      <motion.button
                        onClick={() => handleNavigate(post.slug)}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Read More
                        <motion.span variants={arrowHoverVariants} transition={{ ease: 'easeOut', duration: 0.2 }}>
                          <ArrowRight size={14} />
                        </motion.span>
                      </motion.button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </motion.section>

          {/* Newsletter Signup */}
          <motion.section variants={itemVariants}>
            <div className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-center text-white lg:p-12">
              <h3 className="text-2xl font-semibold">Stay Updated</h3>
              <p className="my-4 max-w-xl mx-auto opacity-90">
                Get the latest warehouse management tips and Smart Picker updates delivered to your inbox.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <motion.button
                  type="button"
                  className="w-full rounded-lg bg-white px-6 py-2.5 font-medium text-blue-800 shadow-sm sm:w-auto"
                  whileHover={{ scale: 1.03, opacity: 0.9 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Subscribe to Newsletter
                </motion.button>
                <p className="text-xs opacity-80">No spam, unsubscribe anytime.</p>
              </div>
            </div>
          </motion.section>

        </motion.div>
      </main>
    </>
  );
};

export default Blog;