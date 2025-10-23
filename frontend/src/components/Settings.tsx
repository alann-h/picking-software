import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings as SettingsIcon, Package as InventoryIcon, Upload as UploadFileIcon, Users as GroupIcon, RefreshCw as SyncIcon } from 'lucide-react';
import clsx from 'clsx';

import { getAllProducts } from '../api/products';
import { Product } from '../utils/types';
import ProductsTab from './tabs/ProductsTab';
import UploadTab from './tabs/UploadTab';
import UsersTab from './tabs/UsersTab';
import SyncSettingsTab from './tabs/SyncSettingsTab';
import { useAuth } from '../hooks/useAuth';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: getAllProducts as () => Promise<Product[]>,
    staleTime: 5 * 60 * 1000,
  });

  // Initialize search term from URL parameters
  const [searchTerm, setSearchTerm] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('search') || '';
  });

  // Update search term when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const urlSearchTerm = urlParams.get('search') || '';
    setSearchTerm(urlSearchTerm);
  }, [location.search]);

  const currentPath = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/settings/upload')) return 'upload';
    if (path.includes('/settings/users')) return 'users';
    if (path.includes('/settings/sync')) return 'sync';
    return 'products';
  }, [location.pathname]);

  const handleMenuClick = (path: string) => {
    navigate(`/settings/${path}`);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredProducts = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return allProducts.filter((product) =>
      product.productName.toLowerCase().includes(searchLower) ||
      (product.sku && product.sku.toLowerCase().includes(searchLower))
    );
  }, [allProducts, searchTerm]);

  const menuItems = [
    {
      label: 'Current Products',
      icon: <InventoryIcon className="h-5 w-5" />,
      path: 'products',
      description: 'Manage your product inventory and details'
    },
    {
      label: 'Sync Settings',
      icon: <SyncIcon className="h-5 w-5" />,
      path: 'sync',
      description: 'Configure automatic sync categories'
    },
    ...(isAdmin ? [
      {
        label: 'Upload Data',
        icon: <UploadFileIcon className="h-5 w-5" />,
        path: 'upload',
        description: 'Bulk upload products and data files'
      },
      {
        label: 'User Management',
        icon: <GroupIcon className="h-5 w-5" />,
        path: 'users',
        description: 'Manage user accounts and permissions'
      }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-2 sm:px-4">
      <title>Smart Picker | Settings</title>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div>
            <div className="text-center sm:text-left">
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white"
                >
                  <SettingsIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-br from-blue-700 to-blue-900 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-md text-gray-500">
                    Configure your Smart Picker system
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Settings Content */}
          <div>
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Vertical Menu Sidebar */}
              <aside className="lg:w-80 lg:flex-shrink-0">
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div
                    className="bg-gray-50 border-b border-gray-200 p-4"
                  >
                    <h2 className="text-lg font-semibold text-gray-800">
                      Navigation
                    </h2>
                  </div>
                  
                  <nav className="p-2">
                    <ul className="space-y-1">
                      {menuItems.map((item) => (
                        <li key={item.path}>
                          <button
                            onClick={() => handleMenuClick(item.path)}
                            className={clsx(
                              'w-full text-left flex items-center gap-3 py-3 px-4 rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                              {
                                'bg-blue-50 text-blue-700 hover:bg-blue-100': currentPath === item.path,
                                'text-gray-700 hover:bg-gray-100': currentPath !== item.path,
                              }
                            )}
                          >
                            <span className={clsx('transition-colors', { 'text-blue-600': currentPath === item.path, 'text-gray-500': currentPath !== item.path })}>
                              {item.icon}
                            </span>
                            <div>
                              <span className={clsx(
                                'font-semibold',
                                { 'text-blue-700': currentPath === item.path, 'text-gray-800': currentPath !== item.path }
                              )}>
                                {item.label}
                              </span>
                              <p className="text-xs text-gray-500 hidden lg:block">
                                {item.description}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>
              </aside>

              {/* Content Area */}
              <main className="flex-1">
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="p-4 sm:p-6 md:p-8">
                    <Routes>
                      <Route
                        path="products"
                        element={
                          <ProductsTab
                            searchTerm={searchTerm}
                            onSearchChange={handleSearchChange}
                            filteredProducts={filteredProducts}
                            isLoading={isLoading}
                            isAdmin={isAdmin}
                          />
                        }
                      />
                      <Route 
                        path="sync" 
                        element={<SyncSettingsTab />} 
                      />
                      <Route 
                        path="upload" 
                        element={isAdmin ? <UploadTab /> : <Navigate to="/settings/products" replace />} 
                      />
                      <Route 
                        path="users/*" 
                        element={isAdmin ? <UsersTab /> : <Navigate to="/settings/products" replace />} 
                      />
                      <Route path="*" element={<Navigate to="products" replace />} />
                    </Routes>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
