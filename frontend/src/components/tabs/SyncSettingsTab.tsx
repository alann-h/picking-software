import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Settings, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { getCategories, getSyncSettings, saveSyncSettings, refreshCategories, Category, SyncSettings } from '../../api/sync';
import { useQueryClient } from '@tanstack/react-query';

const SyncSettingsTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const queryClient = useQueryClient();

  // Load categories and current settings on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load categories and sync settings in parallel
      const [fetchedCategories, syncSettings] = await Promise.all([
        getCategories(),
        getSyncSettings()
      ]);
      
      setCategories(fetchedCategories);
      setSelectedCategories(syncSettings.selectedCategoryIds || []);
      
    } catch (err) {
      setError('Failed to load sync settings');
      console.error('Error loading sync settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCategories = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      const refreshedCategories = await refreshCategories();
      setCategories(refreshedCategories);
      setSuccess('Categories refreshed successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error refreshing categories:', err);
      setError('Failed to refresh categories. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newSelection);
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSelectAll = () => {
    const allCategoryIds = categories.map(cat => cat.id);
    setSelectedCategories(allCategoryIds);
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSelectNone = () => {
    setSelectedCategories([]);
    setHasChanges(true);
    setSuccess(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save sync settings to API
      await saveSyncSettings({
        enabled: true, // Always enabled when user saves
        selectedCategoryIds: selectedCategories
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
    setSelectedCategories([]);
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
              Configure which categories to sync automatically from QuickBooks Online
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Automatic Sync Configuration</h3>
              <p className="text-sm text-blue-700">
                The system automatically syncs products twice a week. Use this page to configure which categories 
                should be included in the automatic sync process. Products without SKUs will be filtered out automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={handleRefreshCategories}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Categories'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Category Selection */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Category Selection</h3>
                <p className="text-sm text-gray-500">
                  Select which categories to include in automatic sync
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {selectedCategories.length} of {categories.length} selected
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading categories...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="mt-3 text-sm text-red-600 hover:text-red-800 underline cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer transition-colors"
                  >
                    Select None
                  </button>
                </div>

                {/* Categories List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{category.name}</span>
                        {category.fullyQualifiedName !== category.name && (
                          <p className="text-sm text-gray-500">{category.fullyQualifiedName}</p>
                        )}
                      </div>
                    </label>
                  ))}
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
    </div>
  );
};

export default SyncSettingsTab;
