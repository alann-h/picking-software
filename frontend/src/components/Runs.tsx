import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Truck, Download } from 'lucide-react';
import { useSnackbarContext } from './SnackbarContext';
import { CreateRun } from './runs/CreateRun';
import { RunList } from './runs/RunList';
import { CreateRunSkeleton, RunListSkeleton } from './Skeletons';
import { useAuth } from '../hooks/useAuth';
import { exportRunsToCSV } from '../utils/exportToExcel';
import { getRuns } from '../api/runs';

const Runs: React.FC = () => {
  const { isAdmin, userCompanyId } = useAuth();
  const navigate = useNavigate();
  const { handleOpenSnackbar } = useSnackbarContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!userCompanyId) return;
    try {
      setIsExporting(true);
      const runs = await getRuns(userCompanyId);
      const success = exportRunsToCSV(runs);
      if (success) {
        handleOpenSnackbar('Export completed successfully', 'success');
      } else {
        handleOpenSnackbar('No completed runs found to export', 'info');
      }
    } catch (error) {
      console.error('Export failed:', error);
      handleOpenSnackbar('Failed to export runs', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Redirect non-admin users
  if (!isAdmin) {
      handleOpenSnackbar('You do not have permission to view this page.', 'error');
      navigate('/dashboard');
    return null;
  }

  // Redirect users without company association
  if (!userCompanyId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
          <div className="flex">
            <div className="py-1"><AlertTriangle className="h-6 w-6 text-yellow-500 mr-4" /></div>
            <div>
              <p className="font-bold">Company Association Required</p>
              <p className="text-sm">You are not currently associated with a company. Please contact your administrator to set up your company profile.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>Smart Picker | Manage Runs</title>
      <div className="mx-auto my-2 sm:my-4 max-w-7xl px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-3 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-blue-800" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Manage Picking Runs</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Create, organize, and track your warehouse picking operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-3 sm:space-y-4">

          {/* Create Run Section */}
          <div>
            <div className="border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-3 sm:p-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold">
                  Create New Run
                </h2>
              </div>
              <div className="p-2 sm:p-4">
                <Suspense fallback={<CreateRunSkeleton />}>
                  <CreateRun />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Run List Section */}
          <div>
            <div className="border border-gray-200 rounded-lg sm:rounded-xl overflow-hidden min-h-[300px] sm:min-h-[400px] shadow-sm">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-3 sm:p-4 flex justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-base sm:text-lg lg:text-xl font-semibold">
                    Active & Completed Runs
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5 hidden sm:block">
                    Monitor progress and manage your picking operations
                  </p>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Export Completed Runs"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
              </div>
              <div className="p-2 sm:p-4">
                <Suspense fallback={<RunListSkeleton />}>
                  <RunList
                    userCompanyId={userCompanyId}
                    isAdmin={isAdmin}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Runs;