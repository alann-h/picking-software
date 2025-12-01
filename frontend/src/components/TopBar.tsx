import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { logoutAllDevices, getUserSessions, logout } from '../api/auth';
import { clearCachedCsrfToken } from '../utils/apiHelpers';
import {
  ClipboardList,
  Play,
  History,
  RefreshCcw,
  Menu,
  ChevronDown,
  HelpCircle,
  Newspaper,
  DollarSign,
  Shield,
  LayoutDashboard,
  Package,
  FileUp,
  Users,
  LogOut,
  MonitorSmartphone,
  X,
  Settings,
} from 'lucide-react';

// ====================================================================================
// 0. Helper Functions
// ====================================================================================

/**
 * Extracts initials from a full name (e.g., "Alan Hattom" -> "AH")
 */
const getInitials = (name: string | null): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  // Get first letter of first name and first letter of last name
  const firstInitial = parts[0].charAt(0).toUpperCase();
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
};

/**
 * A hook to detect clicks outside of a specified element.
 */
const useClickOutside = (ref: React.RefObject<HTMLElement | null>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};


interface TopBarProps {
  disableTopBar: boolean;
}

// Helper component for Dropdown Menu Items
const DropdownButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; isDanger?: boolean }> = ({ icon, children, isDanger = false, ...props }) => {
  const textColor = isDanger ? 'text-red-600' : 'text-gray-700';
  const iconColor = isDanger ? 'text-red-500' : 'text-gray-500';
  const hoverBg = isDanger ? 'hover:bg-red-500/10' : 'hover:bg-blue-500/10';

  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors duration-150 cursor-pointer ${textColor} ${hoverBg}`}
      {...props}
    >
      <span className={iconColor}>{icon}</span>
      <span className="flex-grow">{children}</span>
    </button>
  );
};

// Helper for the outer dropdown panel
const DropdownPanel: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={`absolute top-full right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-lg bg-white py-1 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
};

// ====================================================================================
// 1. Child component for items that need authentication
// ====================================================================================
const AuthenticatedNavItems: React.FC<{ handleMenuItemClick: (path: string) => void }> = ({ handleMenuItemClick }) => {
  const { isAdmin } = useAuth();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(adminMenuRef, () => setAdminMenuOpen(false));

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative" ref={adminMenuRef}>
      <button
        type="button"
        title="Admin Operations"
        onClick={() => setAdminMenuOpen(true)}
        className="rounded-full p-2 text-blue-600 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-blue-500/10 cursor-pointer"
      >
        <Menu size={24} />
      </button>

      {adminMenuOpen && (
        <DropdownPanel className="w-60">
          <AdminMenuContent 
            onMenuItemClick={handleMenuItemClick} 
            onClose={() => setAdminMenuOpen(false)} 
          />
        </DropdownPanel>
      )}
    </div>
  );
};

// ====================================================================================
// 1.5. Admin Menu Content
// ====================================================================================
const AdminMenuContent: React.FC<{ onMenuItemClick: (path: string) => void; onClose: () => void }> = ({ onMenuItemClick, onClose }) => {
  const handleClick = (path: string) => {
    onMenuItemClick(path);
    onClose();
  };

  return (
    <div className="flex flex-col">
      <DropdownButton onClick={() => handleClick('/orders-to-check')} icon={<ClipboardList size={18} />}>
        Orders to Check
      </DropdownButton>
      <DropdownButton onClick={() => handleClick('/run')} icon={<Play size={18} />}>
        Manage Runs
      </DropdownButton>
      <DropdownButton onClick={() => handleClick('/order-history')} icon={<History size={18} />}>
        Order History
      </DropdownButton>
      <DropdownButton onClick={() => handleClick('/kyte-converter')} icon={<RefreshCcw size={18} />}>
        Kyte to QuickBooks
      </DropdownButton>
    </div>
  );
}

// ====================================================================================
// 2. The main TopBar component
// ====================================================================================
const TopBar: React.FC<TopBarProps> = ({ disableTopBar }) => {
  const navigate = useNavigate();
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);

  const publicMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const mobileAdminMenuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useClickOutside(publicMenuRef, () => setPublicMenuOpen(false));
  useClickOutside(settingsMenuRef, () => setSettingsMenuOpen(false));
  useClickOutside(mobileAdminMenuRef, () => setMobileAdminMenuOpen(false));
  useClickOutside(dialogRef, () => setLogoutAllDialogOpen(false)); // Close dialog on overlay click

  const authData = disableTopBar ? null : useAuth();
  const userName = authData?.userName || null;
  const userEmail = authData?.userEmail || null;
  const { isAdmin } = authData || {};

  const handleTitleClick = () => {
    const targetPath = disableTopBar ? '/' : '/dashboard';
    navigate(targetPath);
  };

  const handleMenuItemClick = (path: string) => {
    if (path === '/logout') {
      handleLogout();
    } else if (path === '/logout-all') {
      setLogoutAllDialogOpen(true);
    } else if (path === '/sessions') {
      showActiveSessions();
    } else {
      navigate(path);
    }
    // Close all menus
    setPublicMenuOpen(false);
    setSettingsMenuOpen(false);
    setMobileAdminMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      clearCachedCsrfToken(); // Clear CSRF token cache
      localStorage.removeItem('rememberMe');
      window.location.href = '/login';
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await logoutAllDevices();
    } catch (error) {
      console.error('Error logging out from all devices:', error);
    } finally {
      clearCachedCsrfToken(); // Clear CSRF token cache
      localStorage.removeItem('rememberMe');
      setLogoutAllDialogOpen(false);
      window.location.href = '/login';
    }
  };

  const showActiveSessions = async () => {
     try {
       const sessions = await getUserSessions() as any;
       
       if (sessions.totalSessions === 0) {
         alert('You have no active sessions.');
         return;
       }
       
       const sessionDetails = sessions.activeSessions.map((s: any) => {
         const indicator = s.isCurrentSession ? '[CURRENT]' : '[OTHER]';
         const name = s.name || 'Unknown';
         const email = s.email || '';
         const expireDate = new Date(s.expiresAt);
         const expires = expireDate.toLocaleDateString() + ' ' + expireDate.toLocaleTimeString();
         return indicator + ' ' + name + ' - ' + email + '\n   Expires: ' + expires;
       }).join('\n\n');
       
       const message = 'You have ' + sessions.totalSessions + ' active session(s).\n\nSession details:\n' + sessionDetails;
       alert(message);
     } catch (error: any) {
       console.error('Error fetching sessions:', error);
       
       if (error.response?.status === 401) {
         alert('Your session has expired. Please log in again.');
       } else if (error.response?.status === 500) {
         alert('Server error while fetching sessions. Please try again later.');
       } else {
         alert('Could not fetch active sessions. Please try again.');
       }
     }
  };

  const handleMenuNavigation = (path: string) => {
    handleMenuItemClick(path);
    setPublicMenuOpen(false); // Ensure this menu closes
  };
  
  return (
    <header className="static border-b border-blue-500/10 bg-gradient-to-br from-white to-slate-50 print:hidden">
      <div className="flex w-full items-center justify-between px-4 py-2 sm:px-6">
        {/* Logo/Brand Section - Absolute Left */}
        <div 
          onClick={handleTitleClick} 
          className="flex cursor-pointer items-center gap-2 transition-transform duration-150 ease-in-out hover:scale-105 active:scale-95"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-800 to-blue-500 text-lg font-bold text-white transition-all">
            SP
          </div>
          <span className="hidden sm:block bg-gradient-to-br from-blue-800 to-blue-500 bg-clip-text text-xl font-bold text-transparent">
            Smart Picker
          </span>
        </div>

        {/* Navigation items - Absolute Right */}
        <nav className="flex items-center gap-2 sm:gap-3">
          {disableTopBar ? (
            // Public navigation items
            <>
              <button
                type="button"
                onClick={() => navigate('/about-us')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-blue-500/10 cursor-pointer"
              >
                About
              </button>
              
              {/* Public Resources Menu */}
              <div className="relative" ref={publicMenuRef}>
                <button
                  type="button"
                  onClick={() => setPublicMenuOpen(!publicMenuOpen)}
                  className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-blue-500/10 cursor-pointer"
                >
                  Resources
                  <ChevronDown size={16} className={`transition-transform ${publicMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {publicMenuOpen && (
                  <DropdownPanel className="w-56">
                     <DropdownButton onClick={() => handleMenuNavigation('/faq')} icon={<HelpCircle size={18} />}>
                      FAQ
                    </DropdownButton>
                     <DropdownButton onClick={() => handleMenuNavigation('/blog')} icon={<Newspaper size={18} />}>
                      Blog & Resources
                    </DropdownButton>
                     <DropdownButton onClick={() => handleMenuNavigation('/pricing')} icon={<DollarSign size={18} />}>
                      Pricing
                    </DropdownButton>
                     <DropdownButton onClick={() => handleMenuNavigation('/privacy-policy')} icon={<Shield size={18} />}>
                      Privacy Policy
                    </DropdownButton>
                      <DropdownButton onClick={() => handleMenuNavigation('/terms-of-service')} icon={<Shield size={18} />}>
                      Terms of Service
                    </DropdownButton>
                  </DropdownPanel>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rounded-full bg-gradient-to-br from-blue-800 to-blue-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-gradient-to-br hover:from-blue-900 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/40 cursor-pointer"
              >
                Login
              </button>
            </>
          ) : (
            // Protected route navigation items
            <>
              {/* Desktop Admin Nav */}
              <div className="hidden md:flex">
                <AuthenticatedNavItems handleMenuItemClick={handleMenuItemClick} />
              </div>

              {/* Mobile Admin Menu Button */}
              {isAdmin && (
                <div className="relative ml-1 flex md:hidden" ref={mobileAdminMenuRef}>
                  <button
                    type="button"
                    title="Admin Operations"
                    onClick={() => setMobileAdminMenuOpen(true)}
                    className="rounded-full p-2 text-blue-600 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-blue-500/10 cursor-pointer"
                  >
                    <Menu size={24} />
                  </button>

                  {mobileAdminMenuOpen && (
                    <DropdownPanel className="w-60">
                       <AdminMenuContent 
                          onMenuItemClick={handleMenuItemClick} 
                          onClose={() => setMobileAdminMenuOpen(false)} 
                       />
                    </DropdownPanel>
                  )}
                </div>
              )}

              {/* User Profile & Settings Menu */}
              {authData && (
                <div className="relative ml-1" ref={settingsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setSettingsMenuOpen(true)}
                    className="rounded-full p-0.5 transition-all duration-150 hover:bg-blue-500/10 cursor-pointer"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-blue-500 text-sm font-bold text-white">
                      {getInitials(userName)}
                    </div>
                  </button>

                  {settingsMenuOpen && (
                    <DropdownPanel>
                      <SettingsMenuContent
                        onMenuItemClick={handleMenuItemClick}
                        onClose={() => setSettingsMenuOpen(false)}
                        userName={userName}
                        userEmail={userEmail}
                      />
                    </DropdownPanel>
                  )}
                </div>
              )}
            </>
          )}
        </nav>
      </div>
      
      {/* Confirmation Dialog for Logout from All Devices */}
      {logoutAllDialogOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 bg-black/30"
          aria-labelledby="logout-all-dialog-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl" ref={dialogRef}>
            <div className="flex items-center justify-between border-b p-4">
              <h2 id="logout-all-dialog-title" className="text-lg font-semibold text-gray-900">
                Confirm Logout from All Devices
              </h2>
              <button type="button" onClick={() => setLogoutAllDialogOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600" id="logout-all-dialog-description">
                Are you sure you want to log out from all devices? This will invalidate all your other active sessions and cannot be undone.
              </p>
            </div>
            <div className="flex flex-row-reverse gap-3 rounded-b-lg border-t bg-gray-50 p-4">
              <button 
                type="button"
                onClick={handleLogoutAllDevices} 
                className="rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 cursor-pointer"
              >
                Logout from All Devices
              </button>
              <button 
                type="button"
                onClick={() => setLogoutAllDialogOpen(false)} 
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// ====================================================================================
// 3. Settings Menu Content Component
// ====================================================================================
const SettingsMenuContent: React.FC<{ 
  onMenuItemClick: (path: string) => void; 
  onClose: () => void;
  userName: string | null; 
  userEmail: string | null;
}> = ({ onMenuItemClick, onClose, userName, userEmail }) => {
    
    const { isAdmin } = useAuth(); // Safe to call, this only renders when authData exists

    const handleClick = (path: string) => {
      onMenuItemClick(path);
      onClose();
    };

    return (
      <div className="flex flex-col">
        {/* User Info Section */}
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-gray-900">
            {userName || 'User'}
          </p>
          <p className="truncate text-sm text-gray-500">
            {userEmail || 'user@example.com'}
          </p>
        </div>
        
        <div className="py-1">
           <DropdownButton onClick={() => handleClick('/dashboard')} icon={<LayoutDashboard size={18} />}>
            Dashboard
          </DropdownButton>
           <DropdownButton onClick={() => handleClick('/settings/products')} icon={<Package size={18} />}>
            Current Products
          </DropdownButton>
           <DropdownButton onClick={() => handleClick('/settings/sync')} icon={<Settings size={18} />}>
            Sync Settings
          </DropdownButton>
          
          {isAdmin && (
            <>
               <DropdownButton onClick={() => handleClick('/settings/upload')} icon={<FileUp size={18} />}>
                Upload Data
              </DropdownButton>
               <DropdownButton onClick={() => handleClick('/settings/users')} icon={<Users size={18} />}>
                User Management
              </DropdownButton>
            </>
          )}
        </div>
        
        {/* Divider */}
        <hr className="my-1 border-gray-100" />
        
        <div className="py-1">
           <DropdownButton onClick={() => handleClick('/sessions')} icon={<MonitorSmartphone size={18} />}>
            View Active Sessions
          </DropdownButton>
           <DropdownButton onClick={() => handleClick('/logout')} icon={<LogOut size={18} />} isDanger>
            Logout
          </DropdownButton>
           <DropdownButton onClick={() => handleClick('/logout-all')} icon={<MonitorSmartphone size={18} />} isDanger>
            Logout from All Devices
          </DropdownButton>
        </div>
      </div>
    );
}

export default TopBar;