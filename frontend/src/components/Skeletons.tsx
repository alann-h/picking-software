import { Box, Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, useMediaQuery } from "@mui/material";

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


