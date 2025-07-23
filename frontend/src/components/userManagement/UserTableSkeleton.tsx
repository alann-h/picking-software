// UserTableSkeleton.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Skeleton } from '@mui/material';

const UserTableSkeleton = () => (
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

export default UserTableSkeleton;