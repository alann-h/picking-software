import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (_event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder="Search products by name"
      value={searchTerm}
      onChange={onSearchChange}
      slotProps={{
        input: {
          startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        },
      }}
    />
  );
};

export default SearchBar;