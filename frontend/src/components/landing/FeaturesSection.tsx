import React from 'react';
import { 
  Box, 
  Typography, 
  Container,
  Grid
} from '@mui/material';
import { Smartphone, CloudSync, Assignment } from '@mui/icons-material';
import AnimatedSection from './AnimatedSection';
import FeatureCard from './FeatureCard';

const FeaturesSection = () => (
  <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, sm: 4 }, backgroundColor: '#F8FAFC' }}>
    <Container maxWidth="lg">
      <AnimatedSection>
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ color: '#1F2937' }}>
            Why Choose Smart Picker?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto', color: '#6B7280' }}>
            Built for modern businesses that need efficiency, accuracy, and simplicity
          </Typography>
        </Box>
      </AnimatedSection>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FeatureCard
            icon={<Smartphone />}
            title="Mobile-First Design"
            description="Scan barcodes and manage inventory directly from your smartphone or tablet. No more paper-based processes."
            delay={0.2}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FeatureCard
            icon={<CloudSync />}
            title="Real-Time Sync"
            description="All your data syncs instantly across devices and integrates seamlessly with QuickBooks Online."
            delay={0.4}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <FeatureCard
            icon={<Assignment />}
            title="Run-Based System"
            description="Group orders into efficient 'runs' for pickers to prepare multiple orders simultaneously, maximizing warehouse productivity."
            delay={0.6}
          />
        </Grid>
      </Grid>
    </Container>
  </Box>
);

export default FeaturesSection;