import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Paper,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Search,
  QrCodeScanner,
  People,
  IntegrationInstructions,
  Assignment,
  Speed,
  Analytics,
  CloudQueue,
  CheckCircle
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from './SEO';
import { getPageStructuredData } from '../utils/structuredData';

const AboutUs: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <Search sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Advanced Customer Search',
      description: 'Powerful search capabilities to quickly find customers and their quotes. Streamlined workflow from customer identification to order processing.',
      benefits: ['Quick customer lookup', 'Quote history access', 'Real-time customer data']
    },
    {
      icon: <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Smart Run System',
      description: 'Organize and prioritize warehouse operations with intelligent run management. Create work queues that optimize picker efficiency and order fulfillment.',
      benefits: ['Priority-based workflows', 'Batch processing', 'Progress tracking']
    },
    {
      icon: <QrCodeScanner sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Barcode Scanner Integration',
      description: 'Mobile-first barcode scanning ensures 100% accuracy in order fulfillment. Every item is validated in real-time, eliminating picking errors.',
      benefits: ['Zero picking errors', 'Real-time validation', 'Mobile optimized']
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Digitalized Order Preparation',
      description: 'Replace paper-based processes with a modern, digital workflow. Real-time updates, instant feedback, and seamless order progression.',
      benefits: ['Paperless operations', 'Real-time updates', 'Digital audit trail']
    },
    {
      icon: <People sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Comprehensive User Management',
      description: 'Role-based access control with Admin and Picker roles. Secure, scalable user management that grows with your business.',
      benefits: ['Role-based permissions', 'Secure access control', 'Scalable user system']
    },
    {
      icon: <IntegrationInstructions sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Seamless Accounting Integration',
      description: 'Direct OAuth 2.0 connection to QuickBooks and Xero. Pull quotes, push estimates, and maintain perfect sync between systems.',
      benefits: ['OAuth 2.0 security', 'Real-time sync', 'Automated workflows', 'Dual platform support']
    }
  ];

  const AnimatedComponent: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
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
        title="About Smart Picker | Warehouse Management & Accounting Integration"
        description="Learn how Smart Picker transforms warehouse operations with barcode scanning, digital workflows, and seamless QuickBooks & Xero integration. Discover our features and solutions."
        keywords="warehouse management, QuickBooks integration, Xero integration, barcode scanning, digital workflows, order fulfillment, inventory management, Smart Picker features"
        structuredData={getPageStructuredData('faq')}
      />
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        py: 6
      }}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <AnimatedComponent>
          <Box textAlign="center" mb={8} sx={{ px: { xs: 2, sm: 4 } }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: isMobile ? '2.5rem' : '3.5rem',
                fontWeight: 800,
                color: 'primary.main',
                mb: 2,
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              Smart Picker
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                color: 'text.secondary',
                mb: 3,
                maxWidth: '800px',
                mx: 'auto',
                px: { xs: 1, sm: 0 }
              }}
            >
              Warehouse Accuracy Platform for QuickBooks & Xero
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontSize: '1.2rem',
                color: 'text.secondary',
                maxWidth: '600px',
                mx: 'auto',
                lineHeight: 1.6,
                px: { xs: 1, sm: 0 }
              }}
            >
              Bridge the gap between sales quotes and physical order fulfillment with our 
              secure, guided, and barcode-validated digital workflow.
            </Typography>
          </Box>
        </AnimatedComponent>

        {/* Problem & Solution Section */}
        <AnimatedComponent delay={0.2}>
          <Paper elevation={3} sx={{ p: 4, mb: 6, borderRadius: 3 }}>
            <Grid container spacing={4} alignItems="flex-start">
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h4" sx={{ color: 'error.main', mb: 2, fontWeight: 600, textAlign: { xs: 'center', md: 'left' } }}>
                  The Problem We Solve
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7, textAlign: { xs: 'center', md: 'left' } }}>
                  For businesses using QuickBooks or Xero, the gap between creating sales quotes and 
                  physically preparing orders is often manual, inefficient, and prone to costly errors.
                </Typography>
                <Stack spacing={1} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                  {['Manual paper-based processes', 'Picking errors and inconsistencies', 'No real-time validation', 'Security concerns with warehouse access'].map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', md: 'left' } }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h4" sx={{ color: 'success.main', mb: 2, fontWeight: 600, textAlign: { xs: 'center', md: 'left' } }}>
                  Our Solution
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7, textAlign: { xs: 'center', md: 'left' } }}>
                  Smart Picker transforms this workflow with digital processes, barcode validation, 
                  and seamless QuickBooks & Xero integration.
                </Typography>
                <Stack spacing={1} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                  {['100% picking accuracy', 'Digital audit trails', 'Real-time validation', 'Secure role-based access'].map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                      <CheckCircle sx={{ color: 'success.main', fontSize: 20, flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', md: 'left' } }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </AnimatedComponent>

        {/* Features Grid */}
        <AnimatedComponent delay={0.4}>
          <Typography variant="h3" textAlign="center" sx={{ mb: 6, fontWeight: 700 }}>
            Core Features
          </Typography>
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid size={{ xs: 12, md: 6, lg: 4}} key={index}>
                <Card 
                  elevation={4}
                  sx={{ 
                    height: '100%',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: theme.shadows[8]
                    }
                  }}
                >
                  <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box textAlign="center" mb={2}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, textAlign: 'center' }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6, flex: 1 }}>
                      {feature.description}
                    </Typography>
                    <Stack spacing={1}>
                      {feature.benefits.map((benefit, benefitIndex) => (
                        <Box key={benefitIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            {benefit}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </AnimatedComponent>

        {/* How It Works Section */}
        <AnimatedComponent delay={0.6}>
          <Box sx={{ mt: 8 }}>
            <Typography variant="h3" textAlign="center" sx={{ mb: 6, fontWeight: 700 }}>
              How It Works
            </Typography>
            <Grid container spacing={4}>
              {[
                {
                  step: '1',
                  title: 'Setup & Integration',
                  description: 'Connect QuickBooks or Xero and upload your product catalog. Our system automatically enriches product data with live information.',
                  icon: <CloudQueue sx={{ fontSize: 30, color: 'primary.main' }} />
                },
                {
                  step: '2',
                  title: 'Quote Selection',
                  description: 'Pickers select open quotes from the dashboard and begin the fulfillment process with guided workflows.',
                  icon: <Assignment sx={{ fontSize: 30, color: 'primary.main' }} />
                },
                {
                  step: '3',
                  title: 'Barcode Validation',
                  description: 'Scan each item\'s barcode for instant validation. Real-time feedback ensures accuracy at every step.',
                  icon: <QrCodeScanner sx={{ fontSize: 30, color: 'primary.main' }} />
                },
                {
                  step: '4',
                  title: 'Admin Review',
                  description: 'Completed orders are submitted for admin review with full audit trails and adjustment capabilities.',
                  icon: <Analytics sx={{ fontSize: 30, color: 'primary.main' }} />
                },
                {
                  step: '5',
                  title: 'Accounting Sync',
                  description: 'Upon approval, updated estimates are automatically created in QuickBooks or Xero, ready for invoicing.',
                  icon: <IntegrationInstructions sx={{ fontSize: 30, color: 'primary.main' }} />
                }
              ].map((step, index) => (
                <Grid size={{ xs: 12, md: 6, lg: 4}} key={index}>
                  <Paper elevation={2} sx={{ p: 3, height: '100%', position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1.2rem'
                        }}
                      >
                        {step.step}
                      </Box>
                      {step.icon}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                      {step.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </AnimatedComponent>

        {/* Technology Stack */}
        <AnimatedComponent delay={0.8}>
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <Typography variant="h3" sx={{ mb: 4, fontWeight: 700 }}>
              Built for Modern Business
            </Typography>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
              <Grid container spacing={3} justifyContent="center">
                {[
                  { name: 'React + Material UI', color: 'primary' },
                  { name: 'Node.js + Express', color: 'secondary' },
                  { name: 'PostgreSQL', color: 'primary' },
                  { name: 'AWS Lambda', color: 'secondary' },
                  { name: 'QuickBooks API', color: 'primary' },
                  { name: 'Xero API', color: 'secondary' },
                  { name: 'OAuth 2.0', color: 'secondary' }
                ].map((tech, index) => (
                  <Grid key={index}>
                    <Chip
                      label={tech.name}
                      color={tech.color as any}
                      variant="outlined"
                      sx={{ fontSize: '1rem', px: 2, py: 1 }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Box>
        </AnimatedComponent>

        {/* Call to Action */}
        <AnimatedComponent delay={1.0}>
          <Box sx={{ mt: 8, textAlign: 'center', px: { xs: 2, sm: 4 } }}>
            <Paper 
              elevation={4}
              sx={{ 
                p: { xs: 4, sm: 6 }, 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                color: 'white'
              }}
            >
              <Typography variant="h3" sx={{ mb: 3, fontWeight: 700, fontSize: { xs: '1.75rem', sm: '3rem' } }}>
                Ready to Transform Your Warehouse Operations?
              </Typography>
              <Typography variant="h5" sx={{ mb: 4, opacity: 0.9, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                Join businesses that have eliminated picking errors and streamlined their order fulfillment process.
              </Typography>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                justifyContent="center" 
                alignItems="center"
                sx={{ px: { xs: 1, sm: 0 } }}
              >
                <Chip
                  label="100% Accuracy Guarantee"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '1rem' }}
                />
                <Chip
                  label="QuickBooks & Xero Native"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '1rem' }}
                />
                <Chip
                  label="Mobile First"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '1rem' }}
                />
              </Stack>
            </Paper>
          </Box>
        </AnimatedComponent>
      </Container>
    </Box>
    </>
  );
};

export default AboutUs;
