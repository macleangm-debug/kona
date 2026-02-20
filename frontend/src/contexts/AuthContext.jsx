import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import axios from "axios";
import { API } from "@/config";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Token expiration check (JWT exp claim)
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    // Add 30 second buffer before actual expiration
    return Date.now() >= (exp - 30000);
  } catch {
    return false; // If can't decode, let server validate
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const logoutInProgress = useRef(false);
  const lastFetchTime = useRef(0);

  // Stable reference for logout to avoid re-renders
  const handleLogout = useCallback((message = null) => {
    if (logoutInProgress.current) return;
    logoutInProgress.current = true;
    
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    if (message) {
      setAuthError(message);
    } else {
      setAuthError(null);
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      logoutInProgress.current = false;
    }, 100);
  }, []);

  // Fetch user on initial load or token change
  useEffect(() => {
    let isMounted = true;
    
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Check if token appears expired before making request
      if (isTokenExpired(token)) {
        console.warn("Token appears expired, clearing session");
        if (isMounted) {
          handleLogout("Session expired. Please log in again.");
          setLoading(false);
        }
        return;
      }
      
      // Debounce - don't fetch if we just fetched
      const now = Date.now();
      if (now - lastFetchTime.current < 2000) {
        setLoading(false);
        return;
      }
      lastFetchTime.current = now;
      
      try {
        const res = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setUser(res.data);
          setAuthError(null);
        }
      } catch (e) {
        // Only clear token for explicit auth failures on the /auth/me endpoint
        if (e.response?.status === 401) {
          if (isMounted) {
            console.warn("Token invalid or expired");
            handleLogout("Session expired. Please log in again.");
          }
        } else if (e.response?.status === 403) {
          // 403 might mean account disabled/banned
          if (isMounted) {
            console.warn("Access forbidden");
            handleLogout("Your account access has been restricted.");
          }
        } else {
          // For network errors, server errors (5xx), don't clear session
          // User's token might still be valid, just server issue
          console.error("Error fetching user (keeping session):", e.message);
          if (isMounted && user === null) {
            // Only show error if we don't have cached user data
            setAuthError("Connection issue. Retrying...");
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
  }, [token, handleLogout, user]);

  // Setup axios interceptor to handle auth errors globally
  // But ONLY for actual authentication failures, not all 401s
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const url = error.config?.url || '';
        
        // Only auto-logout for 401 on auth-specific endpoints
        // Other 401s (e.g., accessing protected content) should be handled by components
        const isAuthEndpoint = url.includes('/auth/me') || url.includes('/auth/refresh');
        
        if (status === 401 && isAuthEndpoint && !logoutInProgress.current) {
          console.warn("Auth endpoint returned 401, logging out");
          handleLogout("Session expired. Please log in again.");
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
