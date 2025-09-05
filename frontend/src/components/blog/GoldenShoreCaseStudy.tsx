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
  Avatar,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Business,
  Speed,
  TrendingUp,
  CheckCircle,
  Edit,
  Visibility,
  Note,
  QrCodeScanner,
  Person,
  Schedule,
  Inventory,
  ArrowBack
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';
import { useNavigate } from 'react-router-dom';

const GoldenShoreCaseStudy: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const challenges = [
    {
      icon: <Edit sx={{ fontSize: 30, color: 'error.main' }} />,
      title: 'Illegible Handwriting',
      description: 'Pickers struggled to read handwritten orders, leading to frequent mistakes and delays.',
      impact: '15% error rate in order fulfillment'
    },
    {
      icon: <Visibility sx={{ fontSize: 30, color: 'error.main' }} />,
      title: 'No Product Verification',
      description: 'No way to verify if products actually existed on the original quote, causing confusion.',
      impact: '20% of orders had missing or incorrect items'
    },
    {
      icon: <Schedule sx={{ fontSize: 30, color: 'error.main' }} />,
      title: 'Difficult Adjustments',
      description: 'Making quantity changes or handling backorders required erasing and rewriting, creating messy orders.',
      impact: '30% longer processing time for adjustments'
    },
    {
      icon: <Person sx={{ fontSize: 30, color: 'error.main' }} />,
      title: 'Poor Communication',
      description: 'No way for pickers to communicate issues or questions back to administrators.',
      impact: 'Frequent delays due to miscommunication'
    }
  ];

  const solutions = [
    {
      icon: <QrCodeScanner sx={{ fontSize: 30, color: 'success.main' }} />,
      title: 'Barcode Scanning Validation',
      description: 'Every product is scanned and validated against the quote, ensuring 100% accuracy.',
      result: '0% picking errors'
    },
    {
      icon: <Inventory sx={{ fontSize: 30, color: 'success.main' }} />,
      title: 'Real-Time Product Information',
      description: 'Pickers can see quantity on hand, product details, and verify against the original quote.',
      result: 'Instant product verification'
    },
    {
      icon: <Edit sx={{ fontSize: 30, color: 'success.main' }} />,
      title: 'Easy Quantity Adjustments',
      description: 'Simple touch interface for adjusting quantities, marking unavailable items, or setting backorders.',
      result: '50% faster adjustments'
    },
    {
      icon: <Note sx={{ fontSize: 30, color: 'success.main' }} />,
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
                label="Case Study"
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
                Case Study: How Golden Shore Products Increased Picking Speed by 40%
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
              >
                Real-world success story of transforming warehouse operations from paper-based chaos to digital efficiency
              </Typography>
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  📅 Published: January 12, 2025
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ⏱️ 7 min read
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  👤 Smart Picker Team
                </Typography>
              </Stack>
            </Box>
          </motion.div>

          {/* Company Overview */}
          <motion.div variants={itemVariants}>
            <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 2 }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: 'primary.main',
                    mr: 3,
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                  }}
                >
                  GS
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                    Golden Shore Products
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Mid-sized distribution company specializing in marine and outdoor equipment
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                Golden Shore Products, a family-owned distribution company serving the marine and outdoor equipment 
                industry, was struggling with inefficient order processing methods. With over 2,000 products in their 
                catalog and growing customer demands, their paper-based system was becoming a significant bottleneck 
                in their operations.
              </Typography>
            </Paper>
          </motion.div>

          {/* Challenges Section */}
          <motion.div variants={itemVariants}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4, color: 'error.main' }}>
              The Challenges
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {challenges.map((challenge, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'error.light' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box sx={{ mr: 2 }}>
                          {challenge.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                          {challenge.title}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {challenge.description}
                      </Typography>
                      
                      <Chip
                        label={challenge.impact}
                        color="error"
                        variant="outlined"
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Solutions Section */}
          <motion.div variants={itemVariants}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4, color: 'success.main' }}>
              The Smart Picker Solution
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {solutions.map((solution, index) => (
                <Grid size={{ xs: 12, md: 6 }} key={index}>
                  <Card sx={{ height: '100%', border: '1px solid', borderColor: 'success.light' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Box sx={{ mr: 2 }}>
                          {solution.icon}
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                          {solution.title}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {solution.description}
                      </Typography>
                      
                      <Chip
                        label={solution.result}
                        color="success"
                        variant="outlined"
                        size="small"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Results Section */}
          <motion.div variants={itemVariants}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4, color: 'primary.main' }}>
              The Results
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {results.map((result, index) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                  <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                    <CardContent>
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: 700,
                          color: 'primary.main',
                          mb: 1
                        }}
                      >
                        {result.metric}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {result.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {result.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Implementation Timeline */}
          <motion.div variants={itemVariants}>
            <Paper elevation={2} sx={{ p: 4, mb: 6, borderRadius: 2 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
                Implementation Timeline
              </Typography>
              
              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Week 1-2: Setup & Training
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="QuickBooks integration setup" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Team training on barcode scanning" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Workflow configuration and testing" />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Week 3-4: Full Rollout
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Complete transition from paper to digital" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Performance monitoring and optimization" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle sx={{ color: 'success.main' }} />
                      </ListItemIcon>
                      <ListItemText primary="Team feedback collection and improvements" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>

          {/* Testimonial */}
          <motion.div variants={itemVariants}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                mb: 6,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                border: '1px solid',
                borderColor: 'primary.light'
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, fontStyle: 'italic' }}>
                "Smart Picker transformed our warehouse operations completely. We went from preparing orders 
                with constant mistakes and workers unable to tell if we had stock or not, to having a 
                streamlined, digital process that's 40% faster and 100% accurate. The run system allows 
                our workers to know exactly which orders to do, with the priority system telling them 
                the most important ones first. It's been a game-changer for our business."
              </Typography>
              <Box display="flex" alignItems="center" mt={3}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Sam Hattom
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Operations Manager, Golden Shore Products
                  </Typography>
                </Box>
              </Box>
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

export default GoldenShoreCaseStudy;
