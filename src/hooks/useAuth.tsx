import { useState, useEffect } from 'react';
import api from '../api/api.ts';

const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await api.checkAuth();
        setIsAuthenticated(!!response.user.id);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    verifyAuth();
  }, []);
  return isAuthenticated;
};

export default useAuth;
