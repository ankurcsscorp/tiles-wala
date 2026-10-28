import React,{useState} from 'react';
import {Alert,Box,Button,Stack} from '@mui/material';
import api from '../../api';
const BASE='http://localhost:4000/api/tiles/financial-reports/ledger';
async function errorText(error){
 let data=error?.response?.data;
 if(typeof Blob!=='undefined'&&data instanceof Blob){try{data=JSON.parse(await data.text());}catch{data=null;}}
 return data?.message||error.message||'Unable to prepare the ledger';
}
export default function LedgerActions({partyType,partyId,storeId,fromDate,toDate,endpoint}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const url=endpoint||`${BASE}/${partyType}/${partyId}`;
 const params={storeId:storeId||undefined,fromDate:fromDate||undefined,toDate:toDate||undefined};
 const download=async()=>{
  setBusy(true);setError('');try{
   const result=await api.get(url+'/pdf',{params,responseType:'blob'}),blobUrl=URL.createObjectURL(result.data),link=document.createElement('a');
   link.href=blobUrl;const filename=result.headers?.['content-disposition']?.match(/filename="?([^";]+)"?/i)?.[1];
   link.download=(filename||`Ledger-${partyType}-${partyId}.pdf`).replace(/[\\/]/g,'-');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(blobUrl),1000);
  }catch(e){setError(await errorText(e));}finally{setBusy(false);}
 };
 const print=async()=>{
  const preview=window.open('','_blank');
  if(!preview){setError('Allow pop-ups for Tiles Wala to print the ledger, then try again. Download PDF is also available.');return;}
  setBusy(true);setError('');
  try{
   preview.document.title='Preparing ledger';
   const result=await api.get(url+'/print',{params,responseType:'text'});
   if(preview.closed)throw new Error('The print window was closed. Select Print Ledger to try again.');
   preview.document.open();preview.document.write(result.data);preview.document.close();preview.opener=null;
   await preview.document.fonts?.load?.('12px Ledger');await preview.document.fonts?.ready;
   preview.focus();preview.print();
  }catch(e){preview.close();setError(await errorText(e));}finally{setBusy(false);}
 };
 return <Box className="ledger-actions"><Stack direction="row" useFlexGap sx={{gap:1,flexWrap:'wrap'}}><Button variant="outlined" disabled={!partyId||busy} onClick={print}>Print Ledger</Button><Button variant="contained" disabled={!partyId||busy} onClick={download}>{busy?'Preparing…':'Download PDF'}</Button></Stack>{error&&<Alert severity="error" sx={{mt:1}}>{error}</Alert>}</Box>;
}
