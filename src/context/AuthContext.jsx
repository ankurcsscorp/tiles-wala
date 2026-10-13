import React, { createContext, useContext, useState } from "react";
import api from "../api";

const AUTH_API_URL = "http://localhost:4000/api/tiles/auth";
const STORAGE_KEY = "tilesWalaAuth";

const AuthContext = createContext(null);

const getStoredAuth = () => {
  const storedAuth = localStorage.getItem(STORAGE_KEY);
  if (!storedAuth) return { user: null, token: null };

  try {
    const authData = JSON.parse(storedAuth);
    const userType = authData?.user?.userType ?? authData?.user?.user_type;

    if (
      authData?.user &&
      typeof authData.token === "string" &&
      authData.token &&
      typeof userType === "string" &&
      userType.trim()
    ) {
      return {
        ...authData,
        user: { ...authData.user, userType: userType.trim() },
      };
    }
  } catch (error) {
    console.error("Unable to read saved authentication:", error);
  }

  localStorage.removeItem(STORAGE_KEY);
  return { user: null, token: null };
};

const normalizeAuthResponse = (response) => {
  const { user, token } = response.data ?? {};
  const userType = user?.userType ?? user?.user_type;

  if (
    !user ||
    typeof token !== "string" ||
    !token ||
    typeof userType !== "string" ||
    !userType.trim()
  ) {
    throw new Error("The server returned an invalid authentication response.");
  }

  return {
    user: { ...user, userType: userType.trim() },
    token,
  };
};

export const AuthProvider = ({ children }) => {
  const [authData, setAuthData] = useState(getStoredAuth);

  const saveAuth = (response) => {
    const nextAuthData = normalizeAuthResponse(response);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextAuthData));
    setAuthData(nextAuthData);
    return nextAuthData.user;
  };

  const login = async (credentials) => {
    const response = await api.post(`${AUTH_API_URL}/login`, credentials);
    return saveAuth(response);
  };

  const signup = async (details) => {
    const response = await api.post(`${AUTH_API_URL}/signup`, details);
    return saveAuth(response);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthData({ user: null, token: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user: authData.user,
        token: authData.token,
        isAuthenticated: Boolean(authData.user && authData.token),
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
};
