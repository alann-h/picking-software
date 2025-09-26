import React, { useState, useEffect } from 'react';
import { Save, User, AlertTriangle, X } from 'lucide-react';
import { UserData } from '../../utils/types';
import { ExtendedUserData } from './types';
import { canEditUser } from './utils';
import { z } from 'zod';
import clsx from 'clsx';

interface EditUserDialogProps {
    open: boolean;
    user: ExtendedUserData | null;
    onClose: () => void;
    onSave: (userId: string, data: Partial<UserData>) => Promise<void>;
    currentUser: ExtendedUserData | null;
}

// Zod validation schemas
const UserUpdateSchema = z.object({
    given_name: z.string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
        .optional(),
    family_name: z.string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be 50 characters or less')
        .regex(/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
        .optional(),
    display_email: z.string()
        .email('Please enter a valid email address')
        .max(255, 'Email address is too long')
        .optional(),
    is_admin: z.boolean().optional(),
});

type UserUpdateData = z.infer<typeof UserUpdateSchema>;

// Zod validation utility function
const validateWithZod = (schema: z.ZodSchema<any>, data: unknown): { isValid: boolean; errors: Record<string, string> } => {
    try {
        schema.parse(data);
        return { isValid: true, errors: {} };
    } catch (error) {
        if (error instanceof z.ZodError) {
            const newErrors: Record<string, string> = {};
            error.issues.forEach((issue) => {
                if (issue.path[0]) {
                    newErrors[issue.path[0] as string] = issue.message;
                }
            });
            return { isValid: false, errors: newErrors };
        }
        return { isValid: false, errors: { general: 'Validation failed' } };
    }
};

const EditUserDialog: React.FC<EditUserDialogProps> = ({ open, user, onClose, onSave, currentUser }) => {
    const [formData, setFormData] = useState<UserUpdateData>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                given_name: user.given_name || '',
                family_name: user.family_name || '',
                display_email: user.display_email || '',
                is_admin: user.is_admin || false,
            });
            setErrors({});
            setHasChanges(false);
        }
    }, [user]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [open, onClose]);

    const handleChange = (field: keyof UserUpdateData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const validation = validateWithZod(UserUpdateSchema, formData);
        setErrors(validation.errors);
        return validation.isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentUser) return;

        if (!canEditUser(user, currentUser)) {
            console.error('Unauthorized attempt to edit user');
            return;
        }

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        try {
            await onSave(user.id, formData);
            onClose();
        } catch (error) {
            console.error('Failed to update user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (hasChanges) {
            console.log('Discarding unsaved changes');
        }
        onClose();
    };

    if (!user || !currentUser || !canEditUser(user, currentUser)) {
        return null;
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-10 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30" />
            <div className="relative z-10 w-full max-w-xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <User className="h-6 w-6 text-blue-600" />
                                Edit User: {user.display_email}
                            </h3>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isLoading}
                                className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-6">
                            <div>
                                <label htmlFor="given_name" className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    id="given_name"
                                    type="text"
                                    value={formData.given_name || ''}
                                    onChange={(e) => handleChange('given_name', e.target.value)}
                                    className={clsx("mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base", errors.given_name && "border-red-500")}
                                    maxLength={50}
                                    required
                                />
                                {errors.given_name && <p className="mt-1 text-xs text-red-500">{errors.given_name}</p>}
                            </div>
                            <div>
                                <label htmlFor="family_name" className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    id="family_name"
                                    type="text"
                                    value={formData.family_name || ''}
                                    onChange={(e) => handleChange('family_name', e.target.value)}
                                    className={clsx("mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base", errors.family_name && "border-red-500")}
                                    maxLength={50}
                                    required
                                />
                                {errors.family_name && <p className="mt-1 text-xs text-red-500">{errors.family_name}</p>}
                            </div>
                            <div>
                                <label htmlFor="display_email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    id="display_email"
                                    type="email"
                                    value={formData.display_email || ''}
                                    onChange={(e) => handleChange('display_email', e.target.value)}
                                    className={clsx("mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base", errors.display_email && "border-red-500")}
                                    maxLength={255}
                                    required
                                />
                                {errors.display_email && <p className="mt-1 text-xs text-red-500">{errors.display_email}</p>}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-2">Admin privileges allow full system access including user management.</p>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleChange('is_admin', !formData.is_admin)}
                                        className={clsx(
                                            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                                            formData.is_admin ? 'bg-blue-600' : 'bg-gray-200'
                                        )}
                                    >
                                        <span className="sr-only">Grant admin privileges</span>
                                        <span
                                            className={clsx(
                                                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                                                formData.is_admin ? 'translate-x-5' : 'translate-x-0'
                                            )}
                                        />
                                    </button>
                                    <label className="text-sm font-medium text-gray-800">Grant admin privileges</label>
                                </div>
                                {formData.is_admin && (
                                    <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
                                        <div className="flex items-start">
                                            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                                            <div className="ml-2 text-xs text-yellow-700">
                                                <strong>Warning:</strong> Admin users have full access to the system, including managing other users and all data.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !hasChanges}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserDialog;