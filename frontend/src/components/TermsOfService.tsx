import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useTheme
} from '@mui/material';
import { ExpandMore, Gavel, Security, Cookie, Business, Payment } from '@mui/icons-material';
import SEO from './SEO';

const TermsOfService: React.FC = () => {
  const theme = useTheme();

  return (
    <>
      <SEO 
        title="Terms of Service - Smart Picker"
        description="Terms of Service for Smart Picker - Professional inventory management software. Read our terms, conditions, and policies."
        keywords="terms of service, terms and conditions, smart picker, legal, australia, NSW"
      />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Gavel sx={{ fontSize: 48, color: '#1E40AF', mb: 2 }} />
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
              Terms of Service
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Last updated: {new Date().toLocaleDateString('en-AU')}
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ mb: 3 }}>
            These Terms of Service ("Terms") govern your use of Smart Picker ("Service") operated by Smart Picker 
            ("Company", "we", "us", or "our"). By accessing or using our Service, you agree to be bound by these Terms.
          </Typography>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">1. Service Description</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1">
                Smart Picker is a professional inventory management and order picking software that provides:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Barcode scanning and product identification" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Inventory management and tracking" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Order processing and run management" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="QuickBooks Online integration" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="User management and access control" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">2. Acceptable Use</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Use the Service for any illegal or unauthorized purpose" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Attempt to gain unauthorized access to our systems" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Interfere with or disrupt the Service" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Share your account credentials with others" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Use the Service to store or transmit malicious code" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Cookie sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">3. Cookies and Tracking Technologies</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1">
                Our Service uses cookies and similar tracking technologies to enhance your experience and provide essential functionality:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Session Cookies" 
                    secondary="Essential for user authentication and security. These cookies are necessary for the Service to function properly and cannot be disabled."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="CSRF Protection Cookies" 
                    secondary="Security cookies that protect against cross-site request forgery attacks."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Functionality Cookies" 
                    secondary="Remember your preferences and settings to provide a personalized experience."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Consent Management" 
                    secondary="Track your cookie preferences and consent choices."
                  />
                </ListItem>
              </List>
              <Typography variant="body1"  sx={{ mt: 2 }}>
                By using our Service, you consent to the use of these cookies. You can manage your cookie preferences 
                through your browser settings, though disabling certain cookies may affect Service functionality.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Payment sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">4. Payment and Subscription</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" >
                Subscription fees are billed in advance on a monthly or annual basis. You agree to:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Pay all fees when due" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Provide accurate billing information" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Notify us of any billing disputes within 30 days" />
                </ListItem>
              </List>
              <Typography variant="body1"  sx={{ mt: 2 }}>
                We reserve the right to modify pricing with 30 days' notice. Unpaid accounts may be suspended or terminated.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">5. Data Protection and Privacy</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" >
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, 
                which is incorporated into these Terms by reference.
              </Typography>
              <Typography variant="body1" >
                We implement appropriate technical and organizational measures to protect your data against unauthorized access, 
                alteration, disclosure, or destruction.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Gavel sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">6. Limitation of Liability</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" >
                To the maximum extent permitted by Australian law:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="We are not liable for indirect, incidental, or consequential damages" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="We are not liable for data loss, business interruption, or lost profits" />
                </ListItem>
              </List>
              <Typography variant="body1"  sx={{ mt: 2 }}>
                These limitations do not apply to liability that cannot be excluded under Australian Consumer Law.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Gavel sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">7. Governing Law and Jurisdiction</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" >
                These Terms are governed by and construed in accordance with the laws of New South Wales, Australia. 
                Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive 
                jurisdiction of the courts of New South Wales.
              </Typography>
              <Typography variant="body1" >
                If any provision of these Terms is found to be unenforceable, the remaining provisions will continue 
                in full force and effect.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Gavel sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">8. Changes to Terms</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" >
                We may update these Terms from time to time. We will notify you of any material changes by:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Posting the new Terms on our website" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Sending you an email notification" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Displaying a notice in the Service" />
                </ListItem>
              </List>
              <Typography variant="body1"  sx={{ mt: 2 }}>
                Your continued use of the Service after such changes constitutes acceptance of the new Terms.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Typography variant="body1" color="text.secondary">
              If you have any questions about these Terms of Service, please contact us at:
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              <strong>Smart Picker</strong><br />
              New South Wales, Australia<br />
              Email: support@smartpicker.au
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default TermsOfService;
