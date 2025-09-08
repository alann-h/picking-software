// EditableCell.tsx
import React, { useState, useEffect } from 'react';
import { UserData } from '../../utils/types';
import { z } from 'zod';
import clsx from 'clsx';

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
    onSave: (_userId: string, _data: Partial<UserData>) => void;
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
            setError(result.error.issues[0]?.message || "Invalid input.");
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
            <td className="px-3 py-2 whitespace-nowrap">
                <div>
                    <input
                        autoFocus
                        type={field === 'password' ? 'password' : 'text'}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={clsx(
                            "block w-full rounded-md shadow-sm sm:text-sm py-1.5 px-2",
                            error 
                                ? "border-red-500 text-red-900 ring-1 ring-inset ring-red-300 placeholder-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500" 
                                : "border-gray-300 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600"
                        )}
                    />
                    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
                </div>
            </td>
        );
    }

    return (
        <td 
            onClick={() => setIsEditing(true)} 
            className="px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-gray-50 group"
        >
            <span className="text-sm text-gray-700 group-hover:text-blue-600">
                {field === 'password' ? '••••••••' : user[field]}
            </span>
        </td>
    );
};

export default EditableCell;