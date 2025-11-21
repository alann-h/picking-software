import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Truck } from 'lucide-react';
import { useSnackbarContext } from './SnackbarContext';
import { CreateRun } from './runs/CreateRun';
import { RunList } from './runs/RunList';
import { CreateRunSkeleton, RunListSkeleton } from './Skeletons';
import { useAuth } from '../hooks/useAuth';

const Runs: React.FC = () => {
  const { isAdmin, userCompanyId } = useAuth();
  const navigate = useNavigate();
  const { handleOpenSnackbar } = useSnackbarContext();

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
      <div className="mx-auto my-4 max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Truck className="h-6 w-6 text-blue-800" />
            </div>
            <div>
              <h1 className="mb-1 text-3xl font-bold">Manage Picking Runs</h1>
              <p className="text-gray-500">
                Create, organize, and track your warehouse picking operations
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4 sm:space-y-5">

          {/* Create Run Section */}
          <div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-4 sm:p-6">
                <h2 className="text-xl font-semibold">
                  Create New Run
                </h2>
              </div>
              <div className="p-4 sm:p-6">
                <Suspense fallback={<CreateRunSkeleton />}>
                  <CreateRun />
                </Suspense>
              </div>
            </div>
          </div>

          {/* Run List Section */}
          <div>
            <div className="border border-gray-200 rounded-xl overflow-hidden min-h-[400px]">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 sm:p-6">
                <h2 className="text-xl font-semibold">
                  Active & Completed Runs
                </h2>
                <p className="text-sm opacity-90 mt-0.5">
                  Monitor progress and manage your picking operations
                </p>
              </div>
              <div className="p-4 sm:p-6">
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