import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Link,
  Chip,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Code,
  Cloud,
  Security,
  Speed,
  Storage,
  Api
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from './SEO';

const TechnologyStack: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const technologies = [
    {
      category: 'Frontend',
      icon: <Code sx={{ fontSize: 40, color: 'primary.main' }} />,
      technologies: [
        { name: 'React', url: 'https://react.dev/', description: 'Modern JavaScript library for building user interfaces' },
        { name: 'Material-UI', url: 'https://mui.com/', description: 'React component library for consistent design' },
        { name: 'TypeScript', url: 'https://www.typescriptlang.org/', description: 'Type-safe JavaScript for better development' },
        { name: 'Vite', url: 'https://vitejs.dev/', description: 'Fast build tool and development server' }
      ]
    },
    {
      category: 'Backend',
      icon: <Api sx={{ fontSize: 40, color: 'primary.main' }} />,
      technologies: [
        { name: 'Node.js', url: 'https://nodejs.org/', description: 'JavaScript runtime for server-side development' },
        { name: 'Express.js', url: 'https://expressjs.com/', description: 'Web application framework for Node.js' },
        { name: 'PostgreSQL', url: 'https://www.postgresql.org/', description: 'Advanced open-source relational database' },
        { name: 'Swagger', url: 'https://swagger.io/', description: 'API documentation and testing framework' }
      ]
    },
    {
      category: 'Cloud & Infrastructure',
      icon: <Cloud sx={{ fontSize: 40, color: 'primary.main' }} />,
      technologies: [
        { name: 'AWS S3', url: 'https://aws.amazon.com/s3/', description: 'Scalable object storage for file uploads' },
        { name: 'AWS Lambda', url: 'https://aws.amazon.com/lambda/', description: 'Serverless computing for background processing' },
        { name: 'Railway', url: 'https://railway.app/', description: 'Modern hosting platform for applications' },
        { name: 'Cloudflare', url: 'https://www.cloudflare.com/', description: 'CDN and security services' }
      ]
    },
    {
      category: 'Integrations',
      icon: <Security sx={{ fontSize: 40, color: 'primary.main' }} />,
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

  return (
    <>
      <SEO 
        title="Technology Stack - Smart Picker | Built with Modern Technologies"
        description="Discover the modern technology stack powering Smart Picker. Built with React, Node.js, PostgreSQL, AWS, and seamless QuickBooks & Xero integration."
        keywords="technology stack, React, Node.js, PostgreSQL, AWS, QuickBooks API, Xero API, warehouse management technology, modern web development"
      />
      
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 6
      }}>
        <Container maxWidth="lg">
          {/* Header */}
          <AnimatedCard>
            <Box textAlign="center" mb={8}>
              <Typography
                variant="h1"
                sx={{
                  fontSize: isMobile ? '2.5rem' : '3.5rem',
                  fontWeight: 800,
                  color: 'primary.main',
                  mb: 2
                }}
              >
                Technology Stack
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  fontSize: isMobile ? '1.5rem' : '2rem',
                  color: 'text.secondary',
                  mb: 3,
                  maxWidth: '800px',
                  mx: 'auto'
                }}
              >
                Built with modern, scalable technologies to deliver enterprise-grade warehouse management
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: '1.1rem',
                  color: 'text.secondary',
                  maxWidth: '600px',
                  mx: 'auto',
                  lineHeight: 1.7
                }}
              >
                Smart Picker leverages cutting-edge technologies and industry-standard APIs to provide 
                seamless integration with your existing business systems.
              </Typography>
            </Box>
          </AnimatedCard>

          {/* Technology Categories */}
          <Grid container spacing={4}>
            {technologies.map((category, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={category.category}>
                <AnimatedCard delay={index * 0.1}>
                  <Card sx={{ height: '100%', borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        {category.icon}
                        <Typography variant="h4" fontWeight="bold" sx={{ ml: 2, color: 'primary.main' }}>
                          {category.category}
                        </Typography>
                      </Box>
                      
                      <Stack spacing={3}>
                        {category.technologies.map((tech: any) => (
                          <Box key={tech.name}>
                            <Link
                              href={tech.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                textDecoration: 'none',
                                '&:hover': {
                                  textDecoration: 'underline'
                                }
                              }}
                            >
                              <Typography variant="h6" fontWeight="600" color="primary.main" sx={{ mb: 1 }}>
                                {tech.name}
                              </Typography>
                            </Link>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                              {tech.description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              </Grid>
            ))}
          </Grid>

          {/* Integration Partners Section */}
          <AnimatedCard delay={0.4}>
            <Box textAlign="center" mt={8}>
              <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                Official Integration Partners
              </Typography>
              <Typography variant="body1" sx={{ fontSize: '1.1rem', color: 'text.secondary', mb: 4, maxWidth: '600px', mx: 'auto' }}>
                Smart Picker is an official integration partner with leading accounting software providers
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
                <Link
                  href="https://developer.intuit.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  <Chip
                    label="QuickBooks Developer Network"
                    sx={{
                      fontSize: '1rem',
                      py: 3,
                      px: 2,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }}
                  />
                </Link>
                
                <Link
                  href="https://developer.xero.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: 'none' }}
                >
                  <Chip
                    label="Xero Developer Hub"
                    sx={{
                      fontSize: '1rem',
                      py: 3,
                      px: 2,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }}
                  />
                </Link>
              </Stack>
            </Box>
          </AnimatedCard>

          {/* Performance & Security */}
          <AnimatedCard delay={0.5}>
            <Box textAlign="center" mt={8}>
              <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                Performance & Security
              </Typography>
              <Grid container spacing={3} justifyContent="center">
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Speed sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight="600">Fast Loading</Typography>
                    <Typography variant="body2" color="text.secondary">Optimized for speed with modern build tools</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Security sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight="600">Enterprise Security</Typography>
                    <Typography variant="body2" color="text.secondary">OAuth 2.0 and industry-standard encryption</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Storage sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight="600">Scalable Storage</Typography>
                    <Typography variant="body2" color="text.secondary">AWS S3 for reliable file storage</Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box textAlign="center">
                    <Cloud sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" fontWeight="600">Cloud-First</Typography>
                    <Typography variant="body2" color="text.secondary">Built for modern cloud infrastructure</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </AnimatedCard>
        </Container>
      </Box>
    </>
  );
};

export default TechnologyStack;
