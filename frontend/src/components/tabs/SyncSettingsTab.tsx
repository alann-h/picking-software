import React, { useState, useEffect } from 'react';
import { Save, Settings, AlertCircle, CheckCircle, Loader2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { getSyncSettings, saveSyncSettings, SyncSettings } from '../../api/sync';
import { useQueryClient } from '@tanstack/react-query';
import ProductSyncModal from '../ProductSyncModal';

const SyncSettingsTab: React.FC = () => {
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({ enabled: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Load current settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settings = await getSyncSettings();
      setSyncSettings(settings);
      
    } catch (err) {
      setError('Failed to load sync settings');
      console.error('Error loading sync settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = () => {
    const newEnabled = !syncSettings.enabled;
    setSyncSettings(prev => ({ ...prev, enabled: newEnabled }));
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save sync settings to API
      await saveSyncSettings({
        enabled: syncSettings.enabled
      });
      
      setHasChanges(false);
      setSuccess('Sync settings saved successfully!');
      
      // Refresh products data to reflect changes
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
    } catch (err) {
      setError('Failed to save sync settings');
      console.error('Error saving sync settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSyncSettings(prev => ({ ...prev, enabled: true }));
    setHasChanges(true);
    setSuccess(null);
    setError(null);
  };

  return (
    <div>
      <title>Smart Picker | Sync Settings</title>
      
      {/* Header Section */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Sync Settings
            </h2>
            <p className="text-gray-500">
              Configure automatic product synchronization from your accounting system
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Automatic Sync Configuration</h3>
              <p className="text-sm text-blue-700">
                The system automatically syncs all products twice a week to keep your inventory up to date. 
                Products without SKUs will be filtered out automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="font-medium">Sync Products Now</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Sync Settings */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Automatic Sync</h3>
                <p className="text-sm text-gray-500">
                  Enable or disable automatic product synchronization
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading settings...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={loadSettings}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 mb-1">Enable Automatic Sync</h4>
                    <p className="text-sm text-gray-600">
                      When enabled, all products will be automatically synced twice a week from your accounting system.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleEnabled}
                    className="flex items-center space-x-2 ml-4"
                  >
                    {syncSettings.enabled ? (
                      <ToggleRight className="h-8 w-8 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Status Information */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">Current Status</h4>
                      <p className="text-sm text-blue-700 mb-2">
                        {syncSettings.enabled 
                          ? 'Automatic sync is enabled. Products will be synced twice a week.'
                          : 'Automatic sync is disabled. Products will not be synced automatically.'
                        }
                      </p>
                      {syncSettings.lastSyncTime && (
                        <p className="text-sm text-blue-600">
                          <strong>Last sync:</strong> {new Date(syncSettings.lastSyncTime).toLocaleString()}
                        </p>
                      )}
                      {!syncSettings.lastSyncTime && syncSettings.enabled && (
                        <p className="text-sm text-blue-600">
                          <strong>Last sync:</strong> No sync has been performed yet
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-500">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors',
                hasChanges && !saving
                  ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Settings</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product Sync Modal */}
      <ProductSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />
    </div>
  );
};

export default SyncSettingsTab;
