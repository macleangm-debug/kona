import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import axios from "axios";
import { API } from "@/config";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Stable reference for logout to avoid re-renders
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setAuthError(null);
  }, []);

  // Fetch user on initial load or token change
  useEffect(() => {
    let isMounted = true;
    
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setUser(res.data);
          setAuthError(null);
        }
      } catch (e) {
        // Only clear token if it's specifically an auth error (401/403)
        if (e.response?.status === 401 || e.response?.status === 403) {
          if (isMounted) {
            console.warn("Session expired or invalid token");
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            setAuthError("Session expired. Please log in again.");
          }
        } else {
          // For other errors (network, server), don't clear the session
          console.error("Error fetching user:", e.message);
          if (isMounted) {
            setAuthError("Connection error. Please check your internet.");
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    
    fetchUser();
    
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Setup axios interceptor to handle 401 errors globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only handle auth errors from specific auth endpoints
        const isAuthEndpoint = error.config?.url?.includes('/auth/me');
        
        if (error.response?.status === 401 && isAuthEndpoint) {
          // Session definitely expired
          handleLogout();
        }
        
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [handleLogout]);

  const login = async (email, password, phone = null) => {
    const payload = { password };
    if (email) {
      payload.email = email;
    } else if (phone) {
      payload.phone = phone;
    }
    const res = await axios.post(`${API}/auth/login`, payload);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setAuthError(null);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/auth/register`, data);
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    setAuthError(null);
    return res.data;
  };

  const logout = () => {
    handleLogout();
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
        setAuthError(null);
      } catch (e) {
        if (e.response?.status === 401) {
          handleLogout();
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading, 
      refreshUser,
      authError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
