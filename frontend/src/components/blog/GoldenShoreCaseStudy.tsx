import React from 'react';
import { motion } from 'framer-motion';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  FilePenLine,
  SearchX,
  Clock,
  User,
  QrCode,
  Package,
  StickyNote,
  ArrowLeft, 
  CalendarDays,
  Quote,
} from 'lucide-react';


const challenges = [
  {
    icon: <FilePenLine size={28} className="text-red-600" />,
    title: 'Multi-Page Order Complexity',
    description: 'Large orders spanning multiple pages made it difficult to track progress and ensure all items were picked efficiently.',
    impact: '25% longer picking time for multi-page orders'
  },
  {
    icon: <SearchX size={28} className="text-red-600" />,
    title: 'No Product Verification',
    description: 'No way to verify if products actually existed on the original quote, causing confusion.',
    impact: '20% of orders had missing or incorrect items'
  },
  {
    icon: <Clock size={28} className="text-red-600" />,
    title: 'Inefficient Aisle Navigation',
    description: 'Pickers would complete items from one aisle, then discover more items from that same aisle on later pages, requiring backtracking.',
    impact: '30% longer processing time due to inefficient routing'
  },
  {
    icon: <User size={28} className="text-red-600" />,
    title: 'Poor Communication',
    description: 'No way for pickers to communicate issues or questions back to administrators.',
    impact: 'Frequent delays due to miscommunication'
  }
];

const solutions = [
  {
    icon: <QrCode size={28} className="text-green-600" />,
    title: 'Barcode Scanning Validation',
    description: 'Every product is scanned and validated against the quote, ensuring 100% accuracy.',
    result: '0% picking errors'
  },
  {
    icon: <Package size={28} className="text-green-600" />,
    title: 'Smart Item Filtering',
    description: 'Completed items are automatically filtered out, showing only pending items to prevent backtracking and improve efficiency.',
    result: 'Eliminated aisle backtracking'
  },
  {
    icon: <FilePenLine size={28} className="text-green-600" />,
    title: 'Easy Quantity Adjustments',
    description: 'Simple touch interface for adjusting quantities, marking unavailable items, or setting backorders.',
    result: '50% faster adjustments'
  },
  {
    icon: <StickyNote size={28} className="text-green-600" />,
    title: 'Digital Note System',
    description: 'Pickers can add notes that administrators can read in real-time, improving communication.',
    result: 'Instant admin-picker communication'
  }
];

const results = [
  {
    metric: '40%',
    label: 'Increase in Picking Speed',
    description: 'Orders are now processed 40% faster due to streamlined workflows and reduced errors'
  },
  {
    metric: '100%',
    label: 'Picking Accuracy',
    description: 'Barcode scanning eliminated picking errors completely'
  },
  {
    metric: '60%',
    label: 'Reduction in Communication Issues',
    description: 'Digital notes and real-time updates improved team coordination'
  },
  {
    metric: '25%',
    label: 'Faster Order Processing',
    description: 'Automated workflows and instant validation reduced overall processing time'
  }
];

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

const GoldenShoreCaseStudy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="Case Study: How Golden Shore Products Increased Picking Speed by 40% | Smart Picker Success Story"
        description="Discover how Golden Shore Products eliminated paper-based order processing and achieved 40% faster picking speeds with Smart Picker's barcode scanning and digital workflow features."
        keywords="case study, Golden Shore Products, warehouse efficiency, picking speed, barcode scanning, order processing, Smart Picker success story, inventory management"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Case Study: How Golden Shore Products Increased Picking Speed by 40%",
          "description": "Real-world success story of implementing Smart Picker for warehouse efficiency improvements",
          "author": {
            "@type": "Organization",
            "name": "Smart Picker Team"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Smart Picker"
          },
          "datePublished": "2025-01-20"
        }}
      />
      
      <BreadcrumbNavigation />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <button
              onClick={() => navigate('/blog')}
              className="mb-6 flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 cursor-pointer"
            >
              <ArrowLeft size={18} />
              Back to Blog
            </button>
          </motion.div>

          <motion.section variants={itemVariants} className="mb-12 text-center">
            <span className="mb-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-800">
              Case Study
            </span>
            <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl lg:text-5xl">
              Case Study: How Golden Shore Products Increased Picking Speed by 40%
            </h1>
            <p className="mx-auto mb-6 max-w-3xl text-lg text-slate-600 lg:text-xl">
              Real-world success story of transforming warehouse operations from inefficient multi-page order processing to streamlined digital efficiency.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} /> Published: January 20, 2025
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> 7 min read
              </span>
              <span className="flex items-center gap-1.5">
                <User size={14} /> By Smart Picker Team
              </span>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8">
            <div className="flex flex-col items-start sm:flex-row sm:items-center">
              <div className="mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-700 text-2xl font-bold text-white sm:mb-0 sm:mr-6">
                GS
              </div>
              <div>
                <h2 className="mb-1 text-2xl font-semibold text-slate-900">
                  Golden Shore Products
                </h2>
                <p className="text-lg text-slate-600">
                  Mid-sized distribution company specializing in marine and outdoor equipment
                </p>
              </div>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">
              Golden Shore Products, a family-owned distribution company serving the marine and outdoor equipment 
              industry, was struggling with inefficient order processing methods. With over 600 products in their 
              catalog and growing customer demands, their printed multi-page order system was becoming a significant bottleneck 
              in their operations.
            </p>
          </motion.section>

          <motion.section variants={itemVariants} className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-red-600 lg:text-4xl">
              The Challenges
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {challenges.map((challenge) => (
                <div key={challenge.title} className="flex h-full flex-col rounded-lg border-t-4 border-red-500 bg-white p-6 shadow-lg">
                  <div className="mb-3 flex items-center gap-4">
                    {challenge.icon}
                    <h3 className="text-xl font-semibold text-red-700">{challenge.title}</h3>
                  </div>
                  <p className="mb-4 flex-grow text-slate-600 leading-relaxed">
                    {challenge.description}
                  </p>
                  <span className="inline-block self-start rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                    {challenge.impact}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mb-12">
            <h2 className="mb-6 text-3xl font-bold text-green-600 lg:text-4xl">
              The Smart Picker Solution
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {solutions.map((solution) => (
                <div key={solution.title} className="flex h-full flex-col rounded-lg border-t-4 border-green-500 bg-white p-6 shadow-lg">
                  <div className="mb-3 flex items-center gap-4">
                    {solution.icon}
                    <h3 className="text-xl font-semibold text-green-700">{solution.title}</h3>
                  </div>
                  <p className="mb-4 flex-grow text-slate-600 leading-relaxed">
                    {solution.description}
                  </p>
                  <span className="inline-block self-start rounded-full border border-green-200 bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                    {solution.result}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mb-12">
            <h2 className="mb-6 text-center text-3xl font-bold text-blue-700 lg:text-4xl">
              The Results
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
              {results.map((result) => (
                <div key={result.label} className="h-full rounded-lg bg-white p-6 text-center shadow-lg">
                  <p className="mb-2 text-5xl font-extrabold text-blue-700 lg:text-6xl">
                    {result.metric}
                  </p>
                  <h4 className="mb-2 text-lg font-semibold text-slate-900">
                    {result.label}
                  </h4>
                  <p className="text-sm text-slate-600">{result.description}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="mb-12 rounded-lg bg-white p-6 shadow-lg lg:p-8">
            <h3 className="mb-6 text-2xl font-semibold text-slate-900 lg:text-3xl">
              Implementation Timeline
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div>
                <h4 className="mb-4 text-xl font-semibold text-blue-700">
                  Week 1-2: Setup & Training
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">QuickBooks integration setup</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Team training on barcode scanning</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Workflow configuration and testing</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-xl font-semibold text-blue-700">
                  Week 3-4: Full Rollout
                </h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Complete transition from paper to digital</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Performance monitoring and optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 shrink-0 text-green-500" />
                    <span className="text-slate-700">Team feedback collection and improvements</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.section>

          <motion.section variants={itemVariants} className="relative mb-12 rounded-lg border border-slate-200 bg-slate-50 p-8 lg:p-12">
            <Quote size={60} className="absolute top-6 left-6 text-slate-200" />
            <p className="relative z-10 mb-6 text-xl font-medium italic text-slate-800 lg:text-2xl">
              "Smart Picker transformed our warehouse operations completely. We went from struggling with 
              multi-page orders where workers would backtrack through aisles after finding items on later pages, 
              to having a streamlined, digital process that's 40% faster and 100% accurate. The filtering system 
              shows only pending items, eliminating backtracking... It's been a game-changer for our business."
            </p>
            <div className="relative z-10 mt-6 flex items-center">
              <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
                <User size={24} />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Sam Hattom</p>
                <p className="text-sm text-slate-600">Operations Manager, Golden Shore Products</p>
              </div>
            </div>
          </motion.section>

          {/* Call to Action */}
          <motion.section variants={itemVariants} className="rounded-lg bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-center text-white lg:p-12">
            <h3 className="text-2xl font-semibold lg:text-3xl">Ready to Get Started?</h3>
            <p className="my-4 mx-auto max-w-2xl opacity-90">
              Set up your Smart Picker system today and start improving your warehouse efficiency.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-2 transform rounded-lg bg-white px-6 py-3 text-base font-medium text-blue-800 shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Start Setup Now
            </button>
          </motion.section>
        </motion.div>
      </main>
    </>
  );
};

export default GoldenShoreCaseStudy;