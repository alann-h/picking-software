import React from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  useTheme,
  useMediaQuery,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  AlertTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ArrowBack,
  CheckCircle,
  Warning,
  Info,
  AccountCircle,
  Settings,
  Link,
  Security
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import SEO from '../SEO';
import BreadcrumbNavigation from '../BreadcrumbNavigation';

const SystemSetupGuide: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

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
        title="Complete System Setup Guide: QuickBooks, Xero & User Management - Smart Picker"
        description="Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users. Learn how to integrate with QuickBooks or Xero and configure user access."
        keywords="Smart Picker setup, QuickBooks integration setup, Xero integration setup, user management, warehouse software configuration, accounting software integration"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": "Complete System Setup Guide: QuickBooks, Xero & User Management",
          "description": "Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users.",
          "datePublished": "2025-09-05",
          "author": {
            "@type": "Organization",
            "name": "Smart Picker Team"
          },
          "url": "https://smartpicker.au/blog/system-setup-guide",
          "image": "https://smartpicker.au/quickbooks-logo.png"
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
                label="Setup Guide"
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
                Complete System Setup Guide: QuickBooks, Xero & User Management
              </Typography>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
              >
                Step-by-step guide to setting up Smart Picker with your accounting software and managing multiple users.
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

          {/* Featured Image */}
          <motion.div variants={itemVariants}>
            <Box mb={4}>
              <img
                src="/quickbooks-logo.png"
                alt="Smart Picker Setup Guide"
                style={{
                  width: '100%',
                  height: '300px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
            </Box>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Card sx={{ mb: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  Setting up Smart Picker is straightforward and can be completed in just a few minutes. 
                  The system integrates seamlessly with either QuickBooks Online or Xero, and includes 
                  comprehensive user management features that allow you to add multiple team members 
                  with individual access controls.
                </Typography>

                <Alert severity="info" sx={{ mb: 4 }}>
                  <AlertTitle>Important Note</AlertTitle>
                  Smart Picker supports integration with either QuickBooks Online OR Xero, but not both simultaneously. 
                  You can only have one active accounting software connection at a time.
                </Alert>

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, mt: 4 }}>
                  Step 1: Initial Login & Accounting Software Integration
                </Typography>

                <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  When you first access Smart Picker, you'll be prompted to connect your accounting software. 
                  This is a crucial step as it enables automatic synchronization of your customer data, 
                  products, and inventory information.
                </Typography>

                <Box mb={3}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Choose Your Integration:
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="QuickBooks Online Integration"
                        secondary="Connect directly with your QuickBooks Online account for seamless data sync"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Xero Integration"
                        secondary="Link your Xero account to automatically import customers and products"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Alert severity="warning" sx={{ mb: 4 }}>
                  <AlertTitle>Single Connection Limit</AlertTitle>
                  You can only connect one accounting software at a time. If you need to switch from 
                  QuickBooks to Xero (or vice versa), you'll need to disconnect the current integration 
                  first before connecting the new one.
                </Alert>

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, mt: 4 }}>
                  Step 2: User Management & Access Control
                </Typography>

                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  Once your accounting software is connected, you can add team members and manage their 
                  access through the User Management section in Settings. This allows you to control 
                  who can access the system and what level of permissions they have.
                </Typography>

                <Box mb={3}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Adding New Users:
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Settings color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Navigate to Settings"
                        secondary="Go to the Settings menu and select 'User Management'"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AccountCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Add User Details"
                        secondary="Enter the user's email address and create a secure password"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Set Permissions"
                        secondary="Configure what the user can access and modify within the system"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3, mt: 4 }}>
                  Step 3: System Configuration & Customization
                </Typography>

                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  After setting up your integration and users, you can customize various system settings 
                  to match your warehouse operations and preferences.
                </Typography>

                <Box mb={3}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Key Configuration Options:
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Barcode Scanner Settings"
                        secondary="Configure scanner preferences and validation rules"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Order Processing Rules"
                        secondary="Set up how orders are processed and prioritized"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Notification Preferences"
                        secondary="Configure alerts and notifications for order updates"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Divider sx={{ my: 4 }} />

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Best Practices for System Setup
                </Typography>

                <Box mb={3}>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Test Your Integration"
                        secondary="Verify that customer and product data is syncing correctly from your accounting software"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Start with Admin Access"
                        secondary="Begin with full administrative access and gradually add users with appropriate permissions"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Regular Data Sync"
                        secondary="Ensure your accounting software data is up-to-date before major operations"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Alert severity="success" sx={{ mb: 4 }}>
                  <AlertTitle>Setup Complete!</AlertTitle>
                  Once you've completed these steps, your Smart Picker system will be ready for efficient 
                  order picking operations. Your team can start using the mobile app immediately with 
                  real-time synchronization to your accounting software.
                </Alert>

                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Troubleshooting Common Setup Issues
                </Typography>

                <Typography variant="body1" paragraph sx={{ fontSize: '1.1rem', lineHeight: 1.7 }}>
                  If you encounter any issues during setup, here are some common solutions:
                </Typography>

                <Box mb={3}>
                  <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Common Issues & Solutions:
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Integration Connection Failed"
                        secondary="Ensure you have the correct login credentials and that your accounting software subscription is active"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="User Cannot Access System"
                        secondary="Verify the email address is correct and check that the user has been granted appropriate permissions"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Data Not Syncing"
                        secondary="Check your internet connection and ensure your accounting software is accessible"
                      />
                    </ListItem>
                  </List>
                </Box>

                <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.7, mt: 4 }}>
                  For additional support or questions about the setup process, our support team is available 
                  to help you get the most out of your Smart Picker system. Contact us through the support 
                  channels available in your account dashboard.
                </Typography>
              </CardContent>
            </Card>
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

export default SystemSetupGuide;
