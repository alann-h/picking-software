import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  Divider,
  Paper,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  QrCodeScanner,
  FilterList,
  Assignment,
  Person,
  Add,
  Timeline,
  Info,
  Edit,
  Schedule,
  Note,
  Sync,
  Speed,
  CheckCircle,
  TrendingUp,
  ArrowBack
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';

const WarehouseEfficiencyGuide: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const efficiencyMethods = [
    {
      icon: <QrCodeScanner sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Barcode Scanning for 100% Accuracy',
      description: 'Eliminate picking errors with real-time barcode validation. Every item is scanned and verified against the quote, ensuring zero mistakes.',
      benefits: [
        'Real-time product validation',
        'Automatic error detection',
        'Reduced picking mistakes to zero',
        'Instant feedback to pickers'
      ]
    },
    {
      icon: <FilterList sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Automatic Product Filtering',
      description: 'Smart Picker automatically filters and displays only the products needed for each order, eliminating confusion and reducing search time.',
      benefits: [
        'Shows only required products',
        'Eliminates unnecessary searching',
        'Reduces cognitive load on pickers',
        'Faster order preparation'
      ]
    },
    {
      icon: <Assignment sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Intelligent Run System',
      description: 'Organize orders into efficient picking runs with priority-based workflows and batch processing capabilities.',
      benefits: [
        'Priority-based order processing',
        'Batch picking optimization',
        'Progress tracking and monitoring',
        'Workflow automation'
      ]
    },
    {
      icon: <Person sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Comprehensive User Tracking',
      description: 'Track picker performance, time spent on each order, and identify areas for improvement with detailed analytics.',
      benefits: [
        'Performance metrics and KPIs',
        'Time tracking per order',
        'Productivity analysis',
        'Training opportunity identification'
      ]
    },
    {
      icon: <Add sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Dynamic Product Management',
      description: 'Add products on-the-fly, adjust quantities, and handle backorders seamlessly during the picking process.',
      benefits: [
        'Add products instantly',
        'Real-time quantity adjustments',
        'Backorder management',
        'Unavailable product handling'
      ]
    },
    {
      icon: <Timeline sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Real-Time Progress Tracking',
      description: 'Visual progress bars and detailed product information keep pickers informed and motivated throughout the process.',
      benefits: [
        'Visual progress indicators',
        'Detailed product information',
        'Time tracking per item',
        'Completion status updates'
      ]
    },
    {
      icon: <Edit sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Flexible Quantity Adjustments',
      description: 'Easily adjust quantities, mark items as unavailable, or set backorders with simple touch interactions.',
      benefits: [
        'One-tap quantity changes',
        'Unavailable item marking',
        'Backorder status setting',
        'Instant quote updates'
      ]
    },
    {
      icon: <Note sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Digital Note-Taking System',
      description: 'Pickers can add notes for each order, which are immediately visible to administrators for better communication.',
      benefits: [
        'Real-time note sharing',
        'Admin-picker communication',
        'Issue documentation',
        'Process improvement insights'
      ]
    },
    {
      icon: <Sync sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Automatic Quote Updates',
      description: 'Changes are automatically synced to QuickBooks Online or Xero, eliminating manual data entry and reducing errors.',
      benefits: [
        'Real-time quote synchronization',
        'Automatic invoice preparation',
        'Eliminates manual data entry',
        'Reduces accounting errors'
      ]
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Kyte Integration for Instant Quotes',
      description: 'Create quotes instantly with Kyte integration, streamlining the entire order-to-fulfillment process.',
      benefits: [
        'Instant quote creation',
        'Seamless workflow integration',
        'Reduced order processing time',
        'Improved customer experience'
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
        title="10 Ways to Improve Warehouse Efficiency with Smart Picker | Complete Guide"
        description="Discover proven strategies to boost warehouse productivity using Smart Picker's advanced features including barcode scanning, automatic filtering, run management, and real-time synchronization."
        keywords="warehouse efficiency, order picking optimization, barcode scanning, inventory management, warehouse productivity, Smart Picker features, picking accuracy"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "10 Ways to Improve Warehouse Efficiency with Smart Picker",
          "description": "Complete guide to improving warehouse efficiency using Smart Picker's advanced order picking features",
          "datePublished": "2025-09-05",
          "step": efficiencyMethods.map((method, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": method.title,
            "text": method.description
          }))
        }}
      />
      
      <BreadcrumbNavigation />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back Button */}
          <motion.div variants={itemVariants}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/blog')}
              sx={{ mb: 3, textTransform: 'none' }}
            >
              Back to Blog
            </Button>
          </motion.div>

          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box textAlign="center" mb={6}>
              <Chip
                label="Efficiency Tips"
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
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
                10 Ways to Improve Warehouse Efficiency with Smart Picker
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
              >
                Discover proven strategies to boost your warehouse productivity using Smart Picker's advanced features and best practices
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  📅 Published: September 05, 2025
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ⏱️ 5 min read
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  👤 Smart Picker Team
                </Typography>
              </Stack>
            </Box>
          </motion.div>

          {/* Introduction */}
          <motion.div variants={itemVariants}>
            <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Why Warehouse Efficiency Matters
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
                In today's competitive market, warehouse efficiency directly impacts your bottom line. Manual processes, 
                picking errors, and inefficient workflows can cost businesses thousands of dollars annually. Smart Picker 
                transforms these challenges into opportunities for growth and profitability.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                This comprehensive guide explores 10 proven methods to dramatically improve your warehouse operations 
                using Smart Picker's advanced features, from barcode scanning to real-time synchronization with your 
                accounting system.
              </Typography>
            </Paper>
          </motion.div>

          {/* Efficiency Methods Grid */}
          <Grid container spacing={4}>
            {efficiencyMethods.map((method, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <motion.div variants={itemVariants}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 3,
                      '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-4px)',
                        transition: 'all 0.3s ease-in-out'
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box sx={{ mr: 2 }}>
                          {method.icon}
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: '1.1rem'
                          }}
                        >
                          {index + 1}. {method.title}
                        </Typography>
                      </Box>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3, lineHeight: 1.6 }}
                      >
                        {method.description}
                      </Typography>
                      
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                        Key Benefits:
                      </Typography>
                      
                      <List dense>
                        {method.benefits.map((benefit, benefitIndex) => (
                          <ListItem key={benefitIndex} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={benefit}
                              primaryTypographyProps={{
                                variant: 'body2',
                                color: 'text.secondary'
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Implementation Tips */}
          <motion.div variants={itemVariants}>
            <Paper elevation={2} sx={{ p: 4, mt: 6, borderRadius: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Implementation Tips for Maximum Efficiency
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Getting Started
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Train your team on barcode scanning best practices" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Set up proper run categories and priorities" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Configure QuickBooks or Xero integration" />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Best Practices
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Use notes for communication between pickers and admins" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Regularly review performance metrics and adjust workflows" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Keep product data synchronized with your accounting system" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
          {/* Call to Action */}
          <motion.div variants={itemVariants}>
            <Box
              textAlign="center"
              mt={4}
              p={4}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Ready to Get Started?
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                Set up your Smart Picker system today and start improving your warehouse efficiency
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                sx={{ textTransform: 'none', px: 4 }}
                onClick={() => navigate('/login')}
              >
                Start Setup Now
              </Button>
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </>
  );
};

export default WarehouseEfficiencyGuide;
