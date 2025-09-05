import { Box, Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, useMediaQuery, Container } from "@mui/material";

// Login-specific skeletons
export const LoginFormSkeleton = () => (
  <Stack spacing={3}>
    <Skeleton variant="text" width="60%" height={40} sx={{ mx: 'auto' }} />
    <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto' }} />
    
    {/* Email field */}
    <Skeleton variant="rounded" height={56} />
    
    {/* Password field */}
    <Skeleton variant="rounded" height={56} />
    
    {/* Forgot password link */}
    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Skeleton variant="text" width={120} height={20} />
    </Box>
    
    {/* Remember me checkbox */}
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
      <Skeleton variant="text" width={150} height={20} />
    </Box>
    
    {/* Login button */}
    <Skeleton variant="rounded" height={48} />
  </Stack>
);

export const SocialLoginButtonsSkeleton = () => (
  <Stack spacing={2}>
    {/* Divider */}
    <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
      <Skeleton variant="rectangular" height={1} sx={{ flex: 1 }} />
      <Skeleton variant="text" width={120} height={20} sx={{ mx: 2 }} />
      <Skeleton variant="rectangular" height={1} sx={{ flex: 1 }} />
    </Box>
    
    {/* QuickBooks button */}
    <Skeleton variant="rounded" height={48} />
    
    {/* Xero button */}
    <Skeleton variant="rounded" height={48} />
  </Stack>
);

export const LoginPageSkeleton = () => (
  <Box
    sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4,
      px: 2
    }}
  >
    <Container component="main" maxWidth="sm">
      <Paper
        elevation={8}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(30, 64, 175, 0.15)'
        }}
      >
        {/* Header skeleton */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Skeleton variant="text" width="60%" height={48} sx={{ mx: 'auto', mb: 1 }} />
          <Skeleton variant="text" width="80%" height={24} sx={{ mx: 'auto' }} />
        </Box>
        
        {/* Form skeleton */}
        <LoginFormSkeleton />
        
        {/* Social buttons skeleton */}
        <SocialLoginButtonsSkeleton />
      </Paper>
    </Container>
  </Box>
);

export const UserSessionIndicatorSkeleton = () => (
  <Box sx={{
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: 2,
    padding: 2,
    mb: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Skeleton variant="circular" width={20} height={20} />
      <Skeleton variant="text" width={200} height={20} />
    </Box>
    <Skeleton variant="text" width={100} height={20} />
  </Box>
);

export const RunListSkeleton = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={120} />)}
    </Stack>
);

export const CreateRunSkeleton = () => (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Skeleton variant="text" width="40%" height={40} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 5 }}>
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="rounded" height={56} />
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
                <Skeleton variant="text" width="60%" height={30} />
                <Skeleton variant="rounded" height={250} />
            </Grid>
        </Grid>
    </Paper>
);

const QuoteItemSkeleton = () => (
<Paper variant='outlined' sx={{ p: 1.5, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Stack spacing={1} flexGrow={1}>
        <Skeleton variant="text" width="45%" height={24} />
        <Stack direction="row" spacing={2}>
            <Skeleton variant="rounded" width={60} height={22} />
            <Skeleton variant="text" width={80} height={20} />
        </Stack>
    </Stack>
    <Skeleton variant="circular" width={32} height={32} sx={{ ml: 1 }} />
</Paper>
);

export const AvailableQuotesSkeleton = () => (
    <Paper variant="outlined" sx={{ flexGrow: 1, p: 1, overflowY: 'hidden', bgcolor: 'grey.50' }}>
        {[...Array(3)].map((_, i) => <QuoteItemSkeleton key={i} />)}
    </Paper>
);

export const UserTableSkeleton = () => (
    <TableContainer component={Paper} variant="outlined">
        <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                    {[...Array(6)].map((_, i) => <TableCell key={i}><Skeleton variant="text" width="80%" /></TableCell>)}
                </TableRow>
            </TableHead>
            <TableBody>
                {[...Array(3)].map((_, rowIndex) => (
                    <TableRow key={rowIndex}>
                        {[...Array(6)].map((_, cellIndex) => (
                            <TableCell key={cellIndex}><Skeleton variant="text" /></TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </TableContainer>
);

const SkeletonRow = () => (
  <TableRow>
    <TableCell><Skeleton /></TableCell>
    <TableCell><Skeleton /></TableCell>
    <TableCell><Skeleton /></TableCell>
    <TableCell><Skeleton /></TableCell>
    <TableCell><Skeleton variant="circular" width={40} height={40} /></TableCell>
  </TableRow>
);

export const QuoteSkeleton = () => {
  return (
    <Paper elevation={3} sx={{ padding: { xs: 1, sm: 2, md: 3 }, margin: { xs: 1, sm: 2 } }}>
      {/* Header */}
      <Skeleton variant="text" width="40%" height={48} sx={{ mb: 2 }} />

      {/* Quote Info Bar */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Skeleton variant="text" width="30%" height={32} />
        <Skeleton variant="text" width="25%" height={32} />
        <Skeleton variant="text" width="20%" height={32} />
      </Stack>

      {/* Action Buttons & Filters */}
      <Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />

      {/* Product Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><Skeleton width="60%" /></TableCell>
              <TableCell><Skeleton width="80%" /></TableCell>
              <TableCell><Skeleton width="40%" /></TableCell>
              <TableCell><Skeleton width="50%" /></TableCell>
              <TableCell><Skeleton width="30%" /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </TableBody>
        </Table>
      </TableContainer>

      {/* Notes & Final Action */}
      <Skeleton variant="rectangular" height={150} sx={{ mt: 4, borderRadius: 1 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Skeleton variant="rounded" width={180} height={48} />
      </Box>
    </Paper>
  );
};

export const OrderHistorySkeleton = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Grid container spacing={3} sx={{ mt: 1 }}>
      {Array.from({ length: isMobile ? 1 : 6 }).map((_, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <Paper elevation={0} sx={{ height: '100%', border: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ p: 3 }}>
              <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Skeleton variant="text" width="80%" height={24} />
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="70%" height={24} />
                <Skeleton variant="text" width="50%" height={24} />
              </Stack>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};


