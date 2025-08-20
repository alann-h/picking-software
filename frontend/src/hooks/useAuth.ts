import { useContext } from 'react';
// 1. Import the AuthContext from the provider file.
import { AuthContext } from '../components/AuthProvider';

// 2. Define and export the hook from its own file.
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};