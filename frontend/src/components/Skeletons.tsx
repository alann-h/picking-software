import { Grid, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

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