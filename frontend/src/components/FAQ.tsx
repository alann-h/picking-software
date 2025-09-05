import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ExpandMore,
  HelpOutline,
  QuestionAnswer,
  SupportAgent,
  Security,
  Speed,
  IntegrationInstructions,
  QrCodeScanner,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from './SEO';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import { getPageStructuredData } from '../utils/structuredData';

const FAQ: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: <HelpOutline sx={{ fontSize: 24, color: 'primary.main' }} />,
      questions: [
        {
          question: 'What is Smart Picker and how does it work?',
          answer: 'Smart Picker is a comprehensive order picking software designed for warehouses and distribution centers. It uses barcode scanning technology to streamline the order fulfillment process, reduce errors, and improve efficiency. The system works by creating digital picking lists, validating items through barcode scanning, and providing real-time updates to your inventory management system.'
        },
        {
          question: 'How quickly can I get started with Smart Picker?',
          answer: 'You can get started with Smart Picker in just a few minutes. Simply sign up for an account, complete the QuickBooks integration setup, and begin creating your first picking runs. Our intuitive interface requires minimal training, and most users are productive within their first hour of use.'
        },
        {
          question: 'Do I need any special hardware to use Smart Picker?',
          answer: 'Smart Picker works on any device with a web browser and camera. For optimal performance, we recommend using a smartphone or tablet with a good camera for barcode scanning. No additional hardware purchases are required - the system uses your existing device\'s camera for barcode scanning functionality.'
        }
      ]
    },
    {
      title: 'Features & Functionality',
      icon: <QrCodeScanner sx={{ fontSize: 24, color: 'primary.main' }} />,
      questions: [
        {
          question: 'How accurate is the barcode scanning feature?',
          answer: 'Our barcode scanning technology achieves 99.9% accuracy when used properly. The system supports all standard barcode formats including UPC, EAN, Code 128, and QR codes. The scanning feature includes error detection and validation to ensure items are correctly identified before being added to orders.'
        },
        {
          question: 'Can I customize picking workflows for my business?',
          answer: 'Yes, Smart Picker offers flexible workflow customization. You can create custom run categories, set priority levels, assign specific pickers to runs, and configure notification settings. The system adapts to your business processes rather than forcing you to change your operations.'
        },
        {
          question: 'Does Smart Picker work offline?',
          answer: 'Smart Picker includes offline capabilities for areas with poor connectivity. You can continue picking orders offline, and the system will automatically sync all data when connectivity is restored. This ensures uninterrupted operations even in challenging warehouse environments.'
        }
      ]
    },
    {
      title: 'Integration & Compatibility',
      icon: <IntegrationInstructions sx={{ fontSize: 24, color: 'primary.main' }} />,
      questions: [
        {
          question: 'How does QuickBooks and Xero integration work?',
          answer: 'Smart Picker seamlessly integrates with both QuickBooks Online and Desktop versions, as well as Xero. The integration automatically syncs customer data, product information, and order details. When orders are completed, inventory levels are updated in real-time, and sales data is automatically recorded in your accounting system.'
        },
        {
          question: 'Can I integrate Smart Picker with other systems?',
          answer: 'Smart Picker offers API access for custom integrations with ERP systems, warehouse management systems, and other business applications. We also support webhook notifications for real-time data synchronization with external systems.'
        },
        {
          question: 'Is my data secure when using Smart Picker?',
          answer: 'Security is our top priority. Smart Picker uses enterprise-grade encryption for all data transmission and storage. We comply with industry-standard security protocols and offer features like user authentication, role-based access control, and audit trails for complete data protection.'
        }
      ]
    },
    {
      title: 'Pricing & Support',
      icon: <SupportAgent sx={{ fontSize: 24, color: 'primary.main' }} />,
      questions: [
        {
          question: 'What pricing plans are available?',
          answer: 'Smart Picker currently does not have a pricing plan. It is a free to use software for small businesses.'
        },
        {
          question: 'What kind of support do you provide?',
          answer: 'We provide comprehensive support including email support, live chat during business hours, detailed documentation, video tutorials, and webinars. Enterprise customers receive dedicated account management and priority support. Our support team is trained to help with both technical issues and workflow optimization.'
        },
        {
          question: 'Can I try Smart Picker before purchasing?',
          answer: 'No, Smart Picker is a free to use software for small businesses.'
        }
      ]
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

  return (
    <>
      <SEO 
        title="FAQ - Smart Picker Order Picking Software | Common Questions"
        description="Find answers to frequently asked questions about Smart Picker order picking software, barcode scanning, QuickBooks & Xero integration, pricing, and support."
        keywords="Smart Picker FAQ, order picking software questions, barcode scanning help, QuickBooks integration support, Xero integration support, warehouse management software"
        structuredData={getPageStructuredData('faq')}
      />
      
      <BreadcrumbNavigation />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <Box textAlign="center" mb={6}>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 2
                }}
              >
                Frequently Asked Questions
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}
              >
                Everything you need to know about Smart Picker order picking software
              </Typography>
              
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
                <Chip
                  icon={<QrCodeScanner />}
                  label="Barcode Scanning"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={<IntegrationInstructions />}
                  label="QuickBooks Integration"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={<Speed />}
                  label="Fast Setup"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={<Security />}
                  label="Secure & Reliable"
                  variant="outlined"
                  color="primary"
                />
              </Stack>
            </Box>
          </motion.div>

          <Grid container spacing={4}>
            {faqCategories.map((category, categoryIndex) => (
              <Grid size={{ xs: 12, md: 6 }} key={categoryIndex}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      height: '100%',
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease-in-out'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        mb={3}
                        sx={{ color: 'primary.main' }}
                      >
                        {category.icon}
                        <Typography
                          variant="h6"
                          component="h2"
                          sx={{
                            ml: 1,
                            fontWeight: 600,
                            color: 'text.primary'
                          }}
                        >
                          {category.title}
                        </Typography>
                      </Box>

                      {category.questions.map((faq, faqIndex) => (
                        <Accordion
                          key={faqIndex}
                          sx={{
                            mb: 1,
                            '&:before': { display: 'none' },
                            '&.Mui-expanded': {
                              margin: '0 0 8px 0'
                            }
                          }}
                        >
                          <AccordionSummary
                            expandIcon={<ExpandMore />}
                            sx={{
                              px: 0,
                              py: 1,
                              '& .MuiAccordionSummary-content': {
                                margin: '8px 0'
                              }
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 500,
                                color: 'text.primary',
                                pr: 2
                              }}
                            >
                              {faq.question}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: 0, pt: 0, pb: 2 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ lineHeight: 1.6 }}
                            >
                              {faq.answer}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          <motion.div variants={itemVariants}>
            <Box
              textAlign="center"
              mt={6}
              p={4}
              sx={{
                backgroundColor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Still have questions?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Our support team is here to help you get the most out of Smart Picker
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
              >
                <Chip
                  icon={<SupportAgent />}
                  label="Contact Support"
                  variant="filled"
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  icon={<QuestionAnswer />}
                  label="Live Chat"
                  variant="outlined"
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                />
              </Stack>
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </>
  );
};

export default FAQ;
