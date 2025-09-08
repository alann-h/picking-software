import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CloudUpload, AlertTriangle } from 'lucide-react';
import FileUpload from '../FileUpload';
import { useSnackbarContext } from '../SnackbarContext';
import { uploadProducts } from '../../api/products';
import { useQueryClient } from '@tanstack/react-query';

const UploadTab: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { handleOpenSnackbar } = useSnackbarContext();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!selectedFile) {
      throw new Error('No file selected');
    }
    try {
      const response = await uploadProducts(selectedFile);
      return response;
    } catch (err) {
      handleOpenSnackbar('Error starting upload: ' + (err as Error).message, 'error');
    }
  };

  const handleSuccess = () => {
    handleOpenSnackbar('File processed successfully!', 'success');
    setSelectedFile(null);
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Upload Product Data
          </h2>
          <p className="text-gray-500">
            Bulk upload your product inventory using CSV files. The format guide is included below for your reference.
          </p>
        </div>

        {/* File Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <CloudUpload className="h-7 w-7" />
                <h3 className="text-xl font-bold">
                  File Upload & Format Guide
                </h3>
              </div>
            </div>
            <div>
              <FileUpload
                onFileSelect={setSelectedFile}
                onUpload={handleUpload}
                selectedFile={selectedFile}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-bold text-amber-800">
                  💡 Upload Tips
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Ensure your CSV file has the correct column headers</li>
                    <li>Product names and SKUs are required fields</li>
                    <li>Large files may take several minutes to process</li>
                    <li>Processing status will be shown in the interface</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default UploadTab;