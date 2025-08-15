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
  Divider,
  useTheme
} from '@mui/material';
import { ExpandMore, Security, Cookie, Business, DataUsage, ContactSupport } from '@mui/icons-material';
import SEO from './SEO';

const PrivacyPolicy: React.FC = () => {
  const theme = useTheme();

  return (
    <>
      <SEO 
        title="Privacy Policy - Smart Picker"
        description="Smart Picker Privacy Policy - Learn how we collect, use, and protect your personal information in compliance with Australian privacy law."
        keywords="privacy policy, data protection, personal information, Smart Picker, australia, NSW, privacy act"
      />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Security sx={{ fontSize: 48, color: '#1E40AF', mb: 2 }} />
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
              Privacy Policy
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Last updated: {new Date().toLocaleDateString('en-AU')}
            </Typography>
          </Box>

          <Typography variant="body1" sx={{ mb: 3 }}>
            This Privacy Policy describes how Smart Picker ("Company", "we", "us", or "our") collects, uses, 
            and protects your personal information when you use our inventory management service. This policy 
            complies with the Privacy Act 1988 (Cth) and other applicable Australian privacy laws.
          </Typography>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Business sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">1. Information We Collect</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom>Personal Information</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We collect the following types of personal information:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Email address and contact information" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="First and last name" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Company information and business details" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Account credentials and authentication data" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Payment and billing information" />
                </ListItem>
              </List>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Usage Data</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We automatically collect usage information including:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="IP address and device information" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Browser type and version" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Pages visited and time spent" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Feature usage and interaction data" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Error logs and performance metrics" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Cookie sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">2. Cookies and Tracking Technologies</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We use cookies and similar technologies to provide essential functionality and enhance your experience:
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Essential Cookies</Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Session Cookies" 
                    secondary="Required for user authentication and security. These cannot be disabled as they are essential for the service to function."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="CSRF Protection Cookies" 
                    secondary="Security cookies that protect against cross-site request forgery attacks."
                  />
                </ListItem>
              </List>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Functional Cookies</Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Preference Cookies" 
                    secondary="Remember your settings and preferences for a personalized experience."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Consent Management" 
                    secondary="Track your cookie preferences and consent choices."
                  />
                </ListItem>
              </List>

              <Typography variant="body1" sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <strong>Cookie Management:</strong> You can control cookies through your browser settings. 
                However, disabling essential cookies may prevent the service from functioning properly.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DataUsage sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">3. How We Use Your Information</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We use your personal information for the following purposes:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Service Provision" 
                    secondary="To provide, maintain, and improve our inventory management service"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Account Management" 
                    secondary="To manage your account, process payments, and provide customer support"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Security" 
                    secondary="To protect against fraud, unauthorized access, and ensure system security"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Communication" 
                    secondary="To send important service updates, security notices, and support communications"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Analytics" 
                    secondary="To analyze usage patterns and improve our service (using anonymized data)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Legal Compliance" 
                    secondary="To comply with applicable laws, regulations, and legal processes"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">4. Data Sharing and Disclosure</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We may share your information in the following circumstances:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Service Providers" 
                    secondary="With trusted third-party providers who assist in operating our service (e.g., hosting, payment processing)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="QuickBooks Integration" 
                    secondary="With QuickBooks Online as required for the integration features you've authorized"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Legal Requirements" 
                    secondary="When required by law, court order, or government request"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Business Transfers" 
                    secondary="In connection with a merger, acquisition, or sale of assets (with notice to you)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="With Your Consent" 
                    secondary="For any other purpose with your explicit consent"
                  />
                </ListItem>
              </List>
              
              <Typography variant="body1" sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <strong>Data Protection:</strong> All third-party providers are contractually bound to protect 
                your data and use it only for specified purposes.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">5. Data Security and Retention</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="h6" gutterBottom>Security Measures</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We implement comprehensive security measures to protect your data:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Encryption of data in transit and at rest" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Regular security audits and vulnerability assessments" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Access controls and authentication systems" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Secure data centers with physical security" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Regular security training for staff" />
                </ListItem>
              </List>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Data Retention</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We retain your data only as long as necessary:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Account Data" 
                    secondary="Retained while your account is active and for 7 years after closure for legal compliance"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Usage Data" 
                    secondary="Retained for 2 years for service improvement and security purposes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Payment Data" 
                    secondary="Retained for 7 years as required by Australian tax law"
                  />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">6. Your Rights and Choices</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Under Australian privacy law, you have the following rights:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Access" 
                    secondary="Request a copy of the personal information we hold about you"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Correction" 
                    secondary="Request correction of inaccurate or incomplete information"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Deletion" 
                    secondary="Request deletion of your personal information (subject to legal requirements)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Portability" 
                    secondary="Request transfer of your data to another service provider"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Objection" 
                    secondary="Object to certain types of processing"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Withdraw Consent" 
                    secondary="Withdraw consent for processing where consent is the legal basis"
                  />
                </ListItem>
              </List>

              <Typography variant="body1" sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <strong>Exercise Your Rights:</strong> Contact us at privacy@smartpicker.au to exercise any of these rights. 
                We will respond within 30 days and may request verification of your identity.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">7. International Data Transfers</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Your data may be processed in countries outside Australia, including:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText 
                    primary="United States" 
                    secondary="For cloud hosting and payment processing services"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="European Union" 
                    secondary="For certain analytics and support services"
                  />
                </ListItem>
              </List>
              
              <Typography variant="body1" sx={{ mt: 2 }}>
                We ensure adequate protection through:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Data processing agreements with service providers" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Standard contractual clauses for EU transfers" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Adequacy decisions where applicable" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">8. Children's Privacy</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1">
                Our service is designed for business use and is not intended for individuals under 18 years of age. 
                We do not knowingly collect personal information from children. If you believe we have collected 
                information from a child, please contact us immediately.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Security sx={{ color: '#1E40AF' }} />
                <Typography variant="h6" fontWeight="bold">9. Changes to This Policy</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body1" sx={{ mb: 2 }}>
                We may update this Privacy Policy periodically. We will notify you of material changes by:
              </Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Posting the updated policy on our website" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Sending emails to registered users" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Displaying updates in the application" />
                </ListItem>
              </List>
              <Typography variant="body1" sx={{ mt: 2 }}>
                Continued use of our service after changes constitutes acceptance of the updated policy.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 4 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              If you have questions about this Privacy Policy or wish to exercise your rights, contact us:
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Smart Picker</strong><br />
              New South Wales, Australia<br />
              Support: support@smartpicker.au
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              For complaints about privacy, you may also contact the Office of the Australian Information Commissioner (OAIC).
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
};

export default PrivacyPolicy;
