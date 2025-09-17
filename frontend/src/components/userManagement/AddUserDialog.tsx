// AddUserDialog.tsx
import React, { useState, useMemo, Fragment } from 'react';
import { Dialog, Switch, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle, XCircle, Shield, User, Mail, ShieldCheck, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const userSchema = z.object({
  given_name: z.string().min(1, "First name is required."),
  family_name: z.string().min(1, "Last name is required."),
  display_email: z.email("Please enter a valid email address."),
  password: z.string()
    .min(8, "Password must be at least 8 characters long.")
    .refine(data => /[A-Z]/.test(data), "Needs an uppercase letter.")
    .refine(data => /[a-z]/.test(data), "Needs a lowercase letter.")
    .refine(data => /[0-9]/.test(data), "Needs a number.")
    .refine(data => /[^A-Za-z0-9]/.test(data), "Needs a symbol."),
  is_admin: z.boolean(),
});

type NewUser = z.infer<typeof userSchema>;
type FormErrors = Partial<Record<keyof NewUser, string>>;

const DEFAULT_USER: NewUser = {
  given_name: '',
  family_name: '',
  display_email: '',
  password: '',
  is_admin: false,
};

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onAddUser: (user: NewUser) => Promise<boolean>;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose, onAddUser }) => {
    const [newUser, setNewUser] = useState<NewUser>(DEFAULT_USER);
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = () => {
        onClose();
        setNewUser(DEFAULT_USER);
        setErrors({});
        setShowPassword(false);
    };

    const handleChange = (field: keyof NewUser, value: string | boolean) => {
        setNewUser(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async () => {
        const result = userSchema.safeParse(newUser);
        if (!result.success) {
            const newErrors: FormErrors = {};
            result.error.issues.forEach(err => {
                newErrors[err.path[0] as keyof NewUser] = err.message;
            });
            setErrors(newErrors);
            return;
        }
        
        setSubmitting(true);
        const success = await onAddUser(result.data);
        setSubmitting(false);

        if (success) {
            handleClose();
        }
    };

    // Password strength calculation
    const passwordStrength = useMemo(() => {
        const password = newUser.password;
        if (!password) return { score: 0, color: 'bg-gray-200', label: 'Enter a password' };
        
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            symbol: /[^A-Za-z0-9]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;
        
        if (score <= 2) return { score, color: 'bg-red-500', label: 'Weak' };
        if (score <= 3) return { score, color: 'bg-yellow-500', label: 'Fair' };
        if (score <= 4) return { score, color: 'bg-blue-500', label: 'Good' };
        return { score, color: 'bg-green-500', label: 'Strong' };
    }, [newUser.password]);

    // Password requirements checklist
    const passwordRequirements = [
        { key: 'length', label: 'At least 8 characters', met: newUser.password.length >= 8 },
        { key: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(newUser.password) },
        { key: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(newUser.password) },
        { key: 'number', label: 'One number', met: /[0-9]/.test(newUser.password) },
        { key: 'symbol', label: 'One symbol', met: /[^A-Za-z0-9]/.test(newUser.password) }
    ];

    const renderInputField = (
        field: keyof NewUser,
        label: string,
        type: string = 'text',
        Icon: React.ElementType,
        isPassword = false
    ) => (
        <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Icon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                id={field}
                type={isPassword ? (showPassword ? 'text' : 'password') : type}
                value={newUser[field] as string}
                onChange={e => handleChange(field, e.target.value)}
                placeholder={label}
                className={clsx(
                    "block w-full rounded-md border-gray-300 py-3 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm",
                    errors[field] && "border-red-500"
                )}
            />
            {isPassword && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="p-1 text-gray-500 hover:text-gray-700">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            )}
            {errors[field] && <p className="mt-1 text-xs text-red-500">{errors[field]}</p>}
        </div>
    );

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={handleClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 bg-black/30" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6">
                                    <DialogTitle as="h3" className="text-2xl font-bold flex items-center gap-3">
                                        <User className="h-7 w-7" />
                                        Add New User
                                    </DialogTitle>
                                    <p className="text-blue-200 mt-1">
                                        Create a new user account for your organization
                                    </p>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Basic Information */}
                                    <fieldset className="space-y-4">
                                        <legend className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                                            <User className="h-5 w-5 text-blue-600" />
                                            Basic Information
                                        </legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {renderInputField('given_name', 'First Name', 'text', User)}
                                            {renderInputField('family_name', 'Last Name', 'text', User)}
                                        </div>
                                    </fieldset>

                                    {/* Contact Information */}
                                    <fieldset className="space-y-4">
                                        <legend className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                                            <Mail className="h-5 w-5 text-blue-600" />
                                            Contact Information
                                        </legend>
                                        {renderInputField('display_email', 'Email Address', 'email', Mail)}
                                    </fieldset>

                                    {/* Password Security */}
                                    <fieldset className="space-y-4">
                                        <legend className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                                            <Shield className="h-5 w-5 text-blue-600" />
                                            Password Security
                                        </legend>
                                        {renderInputField('password', 'Password', 'password', Shield, true)}
                                        
                                        {newUser.password && (
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm text-gray-600">Password Strength</span>
                                                    <span className={`text-sm font-bold ${passwordStrength.color.replace('bg-', 'text-')}`}>{passwordStrength.label}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score / 5) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                            {passwordRequirements.map((req) => (
                                                <div key={req.key} className="flex items-center gap-1.5 text-sm">
                                                    {req.met ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                                                    <span className={clsx(req.met ? "text-gray-500 line-through" : "text-gray-700")}>{req.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Admin Access */}
                                    <fieldset className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <ShieldCheck className="h-6 w-6 text-blue-600" />
                                            <div>
                                                <legend className="font-semibold text-gray-800">Admin Access</legend>
                                                <p className="text-sm text-gray-600">Grant administrative privileges to this user</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={newUser.is_admin}
                                            onChange={checked => handleChange('is_admin', checked)}
                                            className="group relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            <span className="sr-only">Use setting</span>
                                            <span aria-hidden="true" className="pointer-events-none absolute h-full w-full rounded-md bg-white" />
                                            <span aria-hidden="true" className={clsx(newUser.is_admin ? 'bg-blue-600' : 'bg-gray-200', 'pointer-events-none absolute mx-auto h-4 w-9 rounded-full transition-colors duration-200 ease-in-out')} />
                                            <span aria-hidden="true" className={clsx(newUser.is_admin ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none absolute left-0 inline-block h-5 w-5 transform rounded-full border border-gray-200 bg-white shadow ring-0 transition-transform duration-200 ease-in-out')} />
                                        </Switch>
                                    </fieldset>
                                    
                                    {newUser.is_admin && (
                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                                            <div className="flex">
                                                <div className="flex-shrink-0"><AlertTriangle className="h-5 w-5 text-yellow-500" /></div>
                                                <div className="ml-3 text-sm text-yellow-700">
                                                    <p><strong>Warning:</strong> Admin users have full access to all system features, including user management and company settings. Only grant admin access to trusted users.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Adding User...' : 'Add User'}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AddUserDialog;