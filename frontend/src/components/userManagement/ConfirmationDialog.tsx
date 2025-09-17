import React, { Fragment } from 'react';
import { Dialog, Transition, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  content: string;
  confirmText?: string;
  confirmColor?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = 'Confirm',
  confirmColor = 'primary',
}) => {
    const colorSchemes = {
        primary: {
            bg: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
            icon: <Info className="h-6 w-6 text-blue-600" />,
        },
        error: {
            bg: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
            icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        },
        warning: {
            bg: 'bg-yellow-500 hover:bg-yellow-600 focus-visible:ring-yellow-500',
            icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
        },
        success: {
            bg: 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500',
            icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        },
        secondary: {
            bg: 'bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-500',
            icon: <XCircle className="h-6 w-6 text-gray-600" />,
        },
        info: {
            bg: 'bg-cyan-600 hover:bg-cyan-700 focus-visible:ring-cyan-500',
            icon: <Info className="h-6 w-6 text-cyan-600" />,
        }
    };

    const scheme = colorSchemes[confirmColor] || colorSchemes.primary;

    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
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
                            <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        {scheme.icon}
                                    </div>
                                    <div className="flex-1">
                                        <DialogTitle as="h3" className="text-lg font-bold leading-6 text-gray-900">
                                            {title}
                                        </DialogTitle>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-600">
                                                {content}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={clsx(
                                            'inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer',
                                            scheme.bg
                                        )}
                                        onClick={onConfirm}
                                    >
                                        {confirmText}
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

export default ConfirmationDialog;