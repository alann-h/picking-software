import React, { ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Card,
  CardContent
} from '@mui/material';
import AnimatedSection from './AnimatedSection';

const FeatureCard: React.FC<{
  icon: ReactNode;
  title: string;
  description: string;
  delay?: number;
}> = ({ icon, title, description, delay = 0 }) => (
  <AnimatedSection delay={delay}>
    <Card
      elevation={0}
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(59,130,246,0.1)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 20px 40px rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.2)',
        }
      }}
    >
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
            color: 'white',
            fontSize: '2rem'
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#1F2937' }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6, color: '#6B7280' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  </AnimatedSection>
);

export default FeatureCard;