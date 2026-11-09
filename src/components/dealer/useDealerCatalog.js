import { useCallback, useEffect, useState } from 'react';
import api from '../../api';

const DEALER_PRODUCTS='http://localhost:4000/api/tiles/dealer/products';
export default function useDealerCatalog(){
 const [catalog,setCatalog]=useState({storeId:null,transportCharge:'0.00',transportOptions:[],items:[]});const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const reload=useCallback(async()=>{setLoading(true);setError('');try{const r=await api.get(DEALER_PRODUCTS);setCatalog({storeId:r.data.storeId,transportCharge:r.data.transportCharge??'0.00',transportOptions:r.data.transportOptions||[],items:r.data.items||[]});}catch(e){setError(e.response?.data?.message||'Dealer catalog could not be loaded.');}finally{setLoading(false);}},[]);
 useEffect(()=>{reload();},[reload]);
 return {catalog,loading,error,reload};
}
