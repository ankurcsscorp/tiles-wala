import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "./AuthContext";

const StoreContext = createContext(null);
const STORE_API = "http://localhost:4000/api/tiles/stores";
const STORE_KEY = "tilesWalaSelectedStore";

export const StoreProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(localStorage.getItem(STORE_KEY) || "");
  const [loading, setLoading] = useState(false);
  const refreshStores = useCallback(async () => {
    if (!isAuthenticated) { setStores([]); setSelectedStoreId(""); localStorage.removeItem(STORE_KEY); return; }
    setLoading(true);
    try {
      const response = await api.get(STORE_API);
      const available = (Array.isArray(response.data) ? response.data : []).filter((store) => store.is_active);
      setStores(available);
      const saved = localStorage.getItem(STORE_KEY);
      const selected = available.find((store) => String(store.id) === saved) || available[0];
      if (selected) { setSelectedStoreId(String(selected.id)); localStorage.setItem(STORE_KEY, String(selected.id)); }
      else { setSelectedStoreId(""); localStorage.removeItem(STORE_KEY); }
    } catch { setStores([]); }
    finally { setLoading(false); }
  }, [isAuthenticated]);
  useEffect(() => { refreshStores(); }, [refreshStores]);
  const selectStore = useCallback((id) => {
    if (!stores.some((store) => String(store.id) === String(id))) return;
    setSelectedStoreId(String(id)); localStorage.setItem(STORE_KEY, String(id));
  }, [stores]);
  const value = useMemo(() => ({ stores, selectedStoreId, selectedStore: stores.find((store) => String(store.id) === selectedStoreId) || null, selectStore, refreshStores, loading }), [stores, selectedStoreId, selectStore, refreshStores, loading]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStores = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStores must be used within StoreProvider");
  return context;
};
