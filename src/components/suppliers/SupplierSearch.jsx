import GSTPartyFields from "../gst/GSTPartyFields";
import React,{useEffect,useState} from "react";
import {Alert,Autocomplete,Button,Dialog,DialogActions,DialogContent,DialogTitle,Stack,TextField} from "@mui/material";
import api from "../../api";

const API="http://localhost:4000/api/tiles/suppliers";
/** The purchase form owns its draft; this picker only reports supplier selection/add intent. */
export default function SupplierSearch({value,onSelect,onAddNew,label="Supplier"}){
  const [query,setQuery]=useState("");const [options,setOptions]=useState([]);const [loading,setLoading]=useState(false);
  const [quickOpen,setQuickOpen]=useState(false);const [quickForm,setQuickForm]=useState({name:"",code:"",mobile:"",email:""});const [quickError,setQuickError]=useState("");const [saving,setSaving]=useState(false);
  useEffect(()=>{if(query.trim().length<2){setOptions([]);return undefined;}let active=true;const timer=setTimeout(async()=>{setLoading(true);try{const response=await api.get(`${API}/search`,{params:{q:query.trim()}});if(active)setOptions(response.data);}catch{if(active)setOptions([]);}finally{if(active)setLoading(false);}},250);return()=>{active=false;clearTimeout(timer);};},[query]);
  const quickCreate=async(event)=>{event.preventDefault();setSaving(true);setQuickError("");try{const {data}=await api.post(API,{...quickForm});onSelect?.(data);setQuery("");setQuickOpen(false);setQuickForm({name:"",code:"",mobile:"",email:""});}catch(error){setQuickError(error?.response?.data?.message||"Unable to add supplier");}finally{setSaving(false);}};
  return <Stack useFlexGap className="ui-picker" direction={{xs:"column",sm:"row"}} spacing={1}>
    <Autocomplete fullWidth value={value||null} options={options} loading={loading} inputValue={query||(value?`${value.name}${value.phone?` · ${value.phone}`:""}`:"")} filterOptions={(available)=>available}
      getOptionLabel={(supplier)=>supplier?`${supplier.name}${supplier.phone?` · ${supplier.phone}`:""}`:""} isOptionEqualToValue={(a,b)=>String(a.id)===String(b.id)}
      onInputChange={(_,next)=>setQuery(next)} onChange={(_,next)=>onSelect?.(next)} renderInput={(params)=><TextField {...params} label={label} placeholder="Search supplier or mobile"/>}
      noOptionsText={query.trim().length<2?"Type at least 2 characters":"No matching suppliers"}/>
    <Button variant="outlined" onClick={onAddNew||(()=>setQuickOpen(true))} sx={{minWidth:{sm:150}}}>Add supplier</Button>
    {!onAddNew&&<Dialog open={quickOpen} onClose={()=>setQuickOpen(false)} fullWidth maxWidth="sm"><form onSubmit={quickCreate}><DialogTitle>Add supplier and return to purchase</DialogTitle><DialogContent><Stack className="ui-form-grid" useFlexGap spacing={2} sx={{pt:1}}>{quickError&&<Alert severity="error">{quickError}</Alert>}{[["name","Supplier name","text"],["code","Supplier code","text"],["mobile","Mobile number","tel"],["email","Email","email"]].map(([key,title,type])=><TextField key={key} autoFocus={key==="name"} required={key==="name"} label={title} type={type} value={quickForm[key]} onChange={(event)=>setQuickForm((old)=>({...old,[key]:event.target.value}))} fullWidth/> )}<GSTPartyFields form={quickForm} setForm={setQuickForm} disabled={saving}/><TextField label="Billing address" value={quickForm.billingAddress?.line1||""} onChange={event=>setQuickForm(current=>({...current,billingAddress:{...current.billingAddress,line1:event.target.value}}))}/><TextField label="Billing address line 2" value={quickForm.billingAddress?.line2||""} onChange={event=>setQuickForm(current=>({...current,billingAddress:{...current.billingAddress,line2:event.target.value}}))}/>{[["city","City"],["state","State"],["pinCode","PIN code"]].map(([key,label])=><TextField key={key} label={label} value={quickForm[key]||""} onChange={event=>setQuickForm(current=>({...current,[key]:event.target.value}))}/>)}</Stack></DialogContent><DialogActions><Button onClick={()=>setQuickOpen(false)}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving?"Saving…":"Add and select"}</Button></DialogActions></form></Dialog>}
  </Stack>;
}
