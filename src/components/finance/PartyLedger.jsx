import { formatNumber } from '../../utils/numberFormat';
import React,{useEffect,useState} from 'react';
import {Alert,Box,Button,CircularProgress,MenuItem,Paper,Stack,Table,TableBody,TableCell,TableHead,TableRow,TextField,Typography} from '@mui/material';
import api from '../../api';
import {useStores} from '../../context/StoreContext';
import LedgerActions from './LedgerActions';
import {ledgerMoney,ledgerBalance,ledgerToday,ledgerVoucher} from '../../utils/ledgerMoney';
import './PartyLedger.css';
export default function PartyLedger({partyType,partyId}){
 const {stores,selectedStoreId}=useStores();
 const [storeId,setStoreId]=useState(selectedStoreId||''),[fromDate,setFromDate]=useState(''),[toDate,setToDate]=useState(ledgerToday),[offset,setOffset]=useState(0),[report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const endpoint=`http://localhost:4000/api/tiles/${partyType==='customer'?'customers':'suppliers'}/${partyId}/ledger`;
 useEffect(()=>{setStoreId(selectedStoreId||'');setOffset(0);},[selectedStoreId]);
 useEffect(()=>{
  let active=true;setLoading(true);setError('');setReport(null);
  api.get(endpoint+'/report',{params:{storeId:storeId||undefined,fromDate:fromDate||undefined,toDate:toDate||undefined,limit:100,offset}})
   .then(response=>{if(active)setReport(response.data);}).catch(e=>{if(active)setError(e.response?.data?.message||'Unable to load the ledger');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[endpoint,storeId,fromDate,toDate,offset]);
 const change=(setter,value)=>{setter(value);setOffset(0);};
 return <Box className="party-ledger">
  <div className="party-ledger-toolbar"><TextField select label="Ledger store" value={storeId} onChange={e=>change(setStoreId,e.target.value)}><MenuItem value="">All authorized stores</MenuItem>{stores.map(store=><MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}</TextField>
   <TextField label="From date" type="date" value={fromDate} onChange={e=>change(setFromDate,e.target.value)} slotProps={{inputLabel:{shrink:true}}}/><TextField label="To date" type="date" value={toDate} onChange={e=>change(setToDate,e.target.value)} slotProps={{inputLabel:{shrink:true}}}/>
   <LedgerActions {...{partyType,partyId,storeId,fromDate,toDate,endpoint}}/>
  </div>
  <Typography variant="body2" color="text.secondary" sx={{my:2}}>Opening balance includes transactions before the From date. Print and PDF include every transaction in the selected period.</Typography>
  {error&&<Alert severity="error">{error}</Alert>}{loading&&<CircularProgress size={24} aria-label="Loading ledger"/>}
  {report&&<>
   <div className="party-ledger-balances">{[['Opening balance',ledgerBalance(report.openingBalance,partyType)],['Period debit',ledgerMoney(report.totalDebit)],['Period credit',ledgerMoney(report.totalCredit)],['Closing balance',ledgerBalance(report.closingBalance,partyType)]].map(([label,value])=><Paper key={label} variant="outlined" sx={{p:2}}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h6">{value}</Typography></Paper>)}</div>
   <Typography variant="caption" color="text.secondary">{partyType==='customer'?'Dr: customer owes us · Cr: customer credit / advance':'Cr: payable to supplier · Dr: supplier owes us'} · {report.scope}</Typography>
   <div className="ui-table-scroll"><Table size="small" aria-label="Party ledger transactions"><TableHead><TableRow>{['Date','Store','Voucher','Reference','Payment mode','Credit','Debit','Running balance','Due date'].map(label=><TableCell key={label} align={['Credit','Debit','Running balance'].includes(label)?'right':'left'}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
    {offset===0&&<TableRow className="ledger-balance-row"><TableCell/><TableCell/><TableCell colSpan={5}>Opening Balance</TableCell><TableCell align="right">{ledgerBalance(report.openingBalance,partyType)}</TableCell><TableCell/></TableRow>}
    {report.items.map((row,index)=><TableRow key={`${row.store_id}-${row.entry_type}-${row.source_id}-${index}`}><TableCell>{row.entry_date}</TableCell><TableCell>{row.store_name}</TableCell><TableCell>{ledgerVoucher(row.entry_type)}</TableCell><TableCell>{row.reference}</TableCell><TableCell>{row.payment_method?.replaceAll('_',' ')||'—'}</TableCell><TableCell align="right">{ledgerMoney(row.credit)}</TableCell><TableCell align="right">{ledgerMoney(row.debit)}</TableCell><TableCell align="right">{ledgerBalance(row.running_balance,partyType)}</TableCell><TableCell>{row.due_date||'—'}</TableCell></TableRow>)}
    {!report.items.length&&<TableRow><TableCell colSpan={9}>No transactions in this period.</TableCell></TableRow>}
    {offset+report.items.length>=report.pagination.total&&<><TableRow className="ledger-balance-row"><TableCell/><TableCell/><TableCell colSpan={5}>Closing Balance</TableCell><TableCell align="right">{ledgerBalance(report.closingBalance,partyType)}</TableCell><TableCell/></TableRow><TableRow className="ledger-balance-row"><TableCell colSpan={5}>Period totals (excluding opening / closing rows)</TableCell><TableCell align="right">{ledgerMoney(report.totalCredit)}</TableCell><TableCell align="right">{ledgerMoney(report.totalDebit)}</TableCell><TableCell colSpan={2}/></TableRow></>}
   </TableBody></Table></div>
   <Stack direction="row" sx={{mt:2,justifyContent:'space-between',alignItems:'center'}}><Button disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-100))}>Previous</Button><Typography variant="body2">{formatNumber(report.pagination.total)} transactions</Typography><Button disabled={offset+100>=report.pagination.total} onClick={()=>setOffset(offset+100)}>Next</Button></Stack>
  </>}
 </Box>;
}
