import {useEffect,useState} from 'react';
import api from '../api';

export const normalizeBillingSettings=data=>{
 const invoiceLayout=data?.invoiceLayout||(data?.invoiceType==='NON_GST'?'SIMPLE_LAYOUT':data?.invoiceType==='GST'?'STANDARD_GST_LAYOUT':null);
 if(!['STANDARD_GST_LAYOUT','SIMPLE_LAYOUT'].includes(invoiceLayout))throw new Error('Invalid billing settings response');
 const twoModeBilling=['GST','NON_GST'].includes(data?.billingMode);
 return {...data,invoiceLayout,twoModeBilling,billingMode:twoModeBilling?data.billingMode:invoiceLayout==='SIMPLE_LAYOUT'?'SIMPLE':'GST'};
};
// Both editors fetch on opening or store change. Existing drafts use their own snapshots.
export default function useBillingSettings(storeId,{enabled=true}={}) {
 const [state,setState]=useState({storeId:'',settings:null,error:''});
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true;
  if(!enabled||!storeId){setState({storeId:'',settings:null,error:''});return;}
  setState({storeId:String(storeId),settings:null,error:''});
  api.get(`http://localhost:4000/api/tiles/stores/${storeId}/invoice-settings`)
   .then(r=>{const settings=normalizeBillingSettings(r.data.data);if(alive)setState({storeId:String(storeId),settings,error:''});})
   .catch(e=>{if(alive)setState({storeId:String(storeId),settings:null,error:e.response?.data?.message||'Unable to load billing settings. Please retry.'});});
  return()=>{alive=false;};
 },[storeId,enabled,retry]);
 const current=enabled&&String(storeId)===state.storeId?state:{settings:null,error:''};
 return {settings:current.settings,error:current.error,ready:Boolean(current.settings),loading:Boolean(enabled&&storeId&&!current.settings&&!current.error),reload:()=>setRetry(x=>x+1)};
}
