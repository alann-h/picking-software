import React from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Button,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Speed,
  Analytics,
  Star
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from './SEO';
import BreadcrumbNavigation from './BreadcrumbNavigation';

const Blog: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const blogPosts = [
    {
      id: 1,
      title: '10 Ways to Improve Warehouse Efficiency with Smart Picker',
      excerpt: 'Discover proven strategies to boost your warehouse productivity using Smart Picker\'s advanced features and best practices.',
      content: 'Warehouse efficiency is crucial for maintaining competitive advantage in today\'s fast-paced market. Smart Picker offers numerous features designed to streamline operations and reduce errors...',
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

  const categories = [
    { name: 'All', count: blogPosts.length },
    { name: 'Efficiency Tips', count: blogPosts.filter(post => post.category === 'Efficiency Tips').length },
    { name: 'Integration', count: blogPosts.filter(post => post.category === 'Integration').length },
    { name: 'Case Study', count: blogPosts.filter(post => post.category === 'Case Study').length },
    { name: 'Setup Guide', count: blogPosts.filter(post => post.category === 'Setup Guide').length }
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

  const featuredPosts = blogPosts.filter(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <>
      <SEO 
        title="Blog & Resources - Smart Picker Warehouse Management Tips"
        description="Expert insights, tips, and case studies for warehouse management, order picking efficiency, and QuickBooks & Xero integration. Stay updated with the latest industry trends."
        keywords="warehouse management blog, order picking tips, QuickBooks integration guide, Xero integration guide, warehouse efficiency, inventory management trends, barcode scanning best practices"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "Smart Picker Blog",
          "description": "Expert insights and tips for warehouse management and order picking efficiency",
          "url": "https://smartpicker.au/blog",
          "publisher": {
            "@type": "Organization",
            "name": "Smart Picker",
            "url": "https://smartpicker.au"
          },
          "blogPost": blogPosts.map(post => ({
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "datePublished": post.publishDate,
            "author": {
              "@type": "Organization",
              "name": "Smart Picker Team"
            },
            "url": `https://smartpicker.au/blog/${post.id}`
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
                Blog & Resources
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}
              >
                Expert insights, tips, and case studies for warehouse management excellence
              </Typography>
              
              <Stack
                direction="row"
                spacing={1}
                justifyContent="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
                <Chip
                  icon={<TrendingUp />}
                  label="Industry Insights"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={<Speed />}
                  label="Efficiency Tips"
                  variant="outlined"
                  color="primary"
                />
                <Chip
                  icon={<Analytics />}
                  label="Case Studies"
                  variant="outlined"
                  color="primary"
                />
              </Stack>
            </Box>
          </motion.div>

          {/* Featured Posts */}
          <motion.div variants={itemVariants}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Featured Articles
            </Typography>
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {featuredPosts.map((post) => (
                <Grid size={{ xs: 12, md: 6 }} key={post.id}>
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
                    <CardMedia
                      component="img"
                      height="200"
                      image={post.image}
                      alt={post.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Chip
                          label={post.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip
                          icon={<Star />}
                          label="Featured"
                          size="small"
                          color="secondary"
                          variant="filled"
                        />
                      </Box>
                      
                      <Typography
                        variant="h6"
                        component="h3"
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {post.title}
                      </Typography>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5
                        }}
                      >
                        {post.excerpt}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
                        <Typography variant="caption" color="text.secondary">
                          {post.readTime} • {new Date(post.publishDate).toLocaleDateString()}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: 'none' }}
                          onClick={() => post.slug ? navigate(`/blog/${post.slug}`) : console.log('No detailed post available')}
                        >
                          Read More
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Regular Posts */}
          <motion.div variants={itemVariants}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              Latest Articles
            </Typography>
            <Grid container spacing={3}>
              {regularPosts.map((post) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={post.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 2,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.3s ease-in-out'
                      }
                    }}
                  >
                    <CardMedia
                      component="img"
                      height="160"
                      image={post.image}
                      alt={post.title}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Chip
                        label={post.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography
                        variant="subtitle1"
                        component="h3"
                        gutterBottom
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '1rem'
                        }}
                      >
                        {post.title}
                      </Typography>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.4
                        }}
                      >
                        {post.excerpt}
                      </Typography>
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt="auto">
                        <Typography variant="caption" color="text.secondary">
                          {post.readTime}
                        </Typography>
                        <Button
                          variant="text"
                          size="small"
                          sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                          onClick={() => post.slug ? navigate(`/blog/${post.slug}`) : console.log('No detailed post available')}
                        >
                          Read More
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </motion.div>

          {/* Newsletter Signup */}
          <motion.div variants={itemVariants}>
            <Box
              textAlign="center"
              mt={6}
              p={4}
              sx={{
                backgroundColor: 'primary.main',
                color: 'white',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Stay Updated
              </Typography>
              <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
                Get the latest warehouse management tips and Smart Picker updates delivered to your inbox
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                <Button
                  variant="contained"
                  color="secondary"
                  sx={{ textTransform: 'none', px: 4 }}
                >
                  Subscribe to Newsletter
                </Button>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  No spam, unsubscribe anytime
                </Typography>
              </Stack>
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </>
  );
};

export default Blog;
