import React from 'react';
import { Code2, Webhook, Cloud, ShieldCheck, Zap, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from './SEO';

const technologies = [
  {
    category: 'Frontend',
    icon: <Code2 className="h-8 w-8 text-blue-600" />,
    technologies: [
      { name: 'React', url: 'https://react.dev/', description: 'Modern JavaScript library for building user interfaces' },
      { name: 'Tailwind CSS', url: 'https://tailwindcss.com/', description: 'A utility-first CSS framework for rapid UI development' },
      { name: 'TypeScript', url: 'https://www.typescriptlang.org/', description: 'Type-safe JavaScript for better development' },
      { name: 'Vite', url: 'https://vitejs.dev/', description: 'Fast build tool and development server' }
    ]
  },
  {
    category: 'Backend',
    icon: <Webhook className="h-8 w-8 text-blue-600" />,
    technologies: [
      { name: 'Node.js', url: 'https://nodejs.org/', description: 'JavaScript runtime for server-side development' },
      { name: 'Express.js', url: 'https://expressjs.com/', description: 'Web application framework for Node.js' },
      { name: 'PostgreSQL', url: 'https://www.postgresql.org/', description: 'Advanced open-source relational database' },
      { name: 'Swagger', url: 'https://swagger.io/', description: 'API documentation and testing framework' }
    ]
  },
  {
    category: 'Cloud & Infrastructure',
    icon: <Cloud className="h-8 w-8 text-blue-600" />,
    technologies: [
      { name: 'AWS S3', url: 'https://aws.amazon.com/s3/', description: 'Scalable object storage for file uploads' },
      { name: 'AWS Lambda', url: 'https://aws.amazon.com/lambda/', description: 'Serverless computing for background processing' },
      { name: 'Railway', url: 'https://railway.app/', description: 'Modern hosting platform for applications' },
      { name: 'Cloudflare', url: 'https://www.cloudflare.com/', description: 'CDN and security services' }
    ]
  },
  {
    category: 'Integrations',
    icon: <ShieldCheck className="h-8 w-8 text-blue-600" />,
    technologies: [
      { name: 'QuickBooks API', url: 'https://developer.intuit.com/', description: 'Official QuickBooks integration platform' },
      { name: 'Xero API', url: 'https://developer.xero.com/', description: 'Official Xero integration platform' },
      { name: 'OAuth 2.0', url: 'https://oauth.net/2/', description: 'Secure authentication standard' },
      { name: 'REST APIs', url: 'https://restfulapi.net/', description: 'Standard API architecture for integrations' }
    ]
  }
];

const AnimatedCard: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

const TechnologyStack: React.FC = () => {
  return (
    <>
      <SEO 
        title="Technology Stack - Smart Picker"
        description="Learn about the modern technology stack that powers Smart Picker, ensuring a fast, reliable, and scalable warehouse management solution."
        canonicalUrl="https://smartpicker.au/technology"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <AnimatedCard>
            <div className="text-center mb-16">
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-blue-800 mb-4"
              >
                Technology Stack
              </h1>
              <h2
                className="text-xl sm:text-2xl lg:text-3xl text-gray-600 mb-6 max-w-4xl mx-auto"
              >
                Built with modern, scalable technologies to deliver enterprise-grade warehouse management
              </h2>
              <p
                className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed"
              >
                Smart Picker leverages cutting-edge technologies and industry-standard APIs to provide 
                seamless integration with your existing business systems.
              </p>
            </div>
          </AnimatedCard>

          {/* Technology Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {technologies.map((category, index) => (
              <AnimatedCard delay={index * 0.1} key={category.category}>
                <div className="h-full bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
                  <div className="p-8">
                    <div className="flex items-center mb-6">
                      <div className="bg-blue-100 rounded-full p-3 mr-4">
                        {category.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-blue-800">
                        {category.category}
                      </h3>
                    </div>
                    
                    <div className="space-y-6">
                      {category.technologies.map((tech) => (
                        <div key={tech.name}>
                          <a
                            href={tech.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors duration-200"
                          >
                            {tech.name}
                          </a>
                          <p className="text-gray-600 leading-relaxed mt-1">
                            {tech.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            ))}
          </div>

          {/* Integration Partners Section */}
          <AnimatedCard delay={0.4}>
            <div className="text-center mt-20">
              <h3 className="text-3xl sm:text-4xl font-bold text-blue-800 mb-4">
                Official Integration Partners
              </h3>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Smart Picker is an official integration partner with leading accounting software providers
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="https://developer.intuit.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold py-3 px-6 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors duration-300 shadow-md"
                >
                  QuickBooks Developer Network
                </a>
                
                <a
                  href="https://developer.xero.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold py-3 px-6 bg-blue-700 text-white rounded-full hover:bg-blue-800 transition-colors duration-300 shadow-md"
                >
                  Xero Developer Hub
                </a>
              </div>
            </div>
          </AnimatedCard>

          {/* Performance & Security */}
          <AnimatedCard delay={0.5}>
            <div className="text-center mt-20">
              <h3 className="text-3xl sm:text-4xl font-bold text-blue-800 mb-8">
                Performance & Security
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <Zap className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                  <h4 className="text-xl font-semibold">Fast Loading</h4>
                  <p className="text-gray-600">Optimized for speed with modern build tools</p>
                </div>
                <div className="text-center">
                  <ShieldCheck className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                  <h4 className="text-xl font-semibold">Enterprise Security</h4>
                  <p className="text-gray-600">OAuth 2.0 and industry-standard encryption</p>
                </div>
                <div className="text-center">
                  <Server className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                  <h4 className="text-xl font-semibold">Scalable Storage</h4>
                  <p className="text-gray-600">AWS S3 for reliable file storage</p>
                </div>
                <div className="text-center">
                  <Cloud className="mx-auto h-12 w-12 text-blue-600 mb-3" />
                  <h4 className="text-xl font-semibold">Cloud-First</h4>
                  <p className="text-gray-600">Built for modern cloud infrastructure</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </>
  );
};

export default TechnologyStack;
