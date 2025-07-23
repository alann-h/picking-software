// EditableCell.tsx
import React, { useState, useEffect } from 'react';
import { TableCell, TextField } from '@mui/material';
import { UserData } from '../../utils/types';
import { z } from 'zod';

// Define schemas for validation within the cell
const emailSchema = z.email("Invalid email format");
const nameSchema = z.string().min(1, "Name cannot be empty");
const passwordSchema = z.string().min(8, "Min 8 chars").refine(data => /[A-Z]/.test(data), "Needs uppercase").refine(data => /[0-9]/.test(data), "Needs number").refine(data => /[^A-Za-z0-9]/.test(data), "Needs symbol");

const schemas = {
    given_name: nameSchema,
    family_name: nameSchema,
    display_email: emailSchema,
    password: passwordSchema,
};

type EditableField = 'given_name' | 'family_name' | 'display_email' | 'password';

interface EditableCellProps {
    user: UserData;
    field: EditableField;
    onSave: (userId: string, data: Partial<UserData>) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({ user, field, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(user[field] || '');
    const [error, setError] = useState('');

    useEffect(() => {
        // Reset value if user prop changes from outside
        setValue(field === 'password' ? '' : user[field] || '');
    }, [user, field]);

    const handleSave = () => {
        if (field !== 'password' && value === user[field]) {
            setIsEditing(false);
            return;
        }
        
        const schema = schemas[field];
        const result = schema.safeParse(value);

        if (!result.success) {
            setError(result.error.message);
            return;
        }

        onSave(user.id, { [field]: value });
        setIsEditing(false);
        setError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setIsEditing(false);
            setValue(user[field] || '');
            setError('');
        }
    };
    
    if (isEditing) {
        return (
            <TableCell>
                <TextField
                    autoFocus
                    fullWidth
                    size="small"
                    variant="outlined"
                    type={field === 'password' ? 'password' : 'text'}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    error={!!error}
                    helperText={error}
                />
            </TableCell>
        );
    }

    return (
        <TableCell onClick={() => setIsEditing(true)} sx={{ cursor: 'pointer' }}>
            {field === 'password' ? '••••••••' : user[field]}
        </TableCell>
    );
};

export default EditableCell;