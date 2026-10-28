import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,MenuItem,Paper,Stack,Switch,FormControlLabel,Table,TableBody,TableCell,TableContainer,TableHead,TableRow,TextField,Typography} from '@mui/material';
import api from '../../api';
import {useAuth} from '../../context/AuthContext';
const API='http://localhost:4000/api/tiles/users';

function PermissionGrid({modules,value,onChange,inherited={},roleMode=false,disabled=false}){
 const update=(key,selection)=>{
  const next={...value};if(selection==='inherit')delete next[key];else next[key]=selection==='allow';
  if(key.endsWith('.manage')&&selection==='allow')next[key.replace('.manage','.view')]=true;
  if(key.endsWith('.view')&&selection==='deny'&&modules.some(m=>m.manage&&`${m.key}.view`===key))next[key.replace('.view','.manage')]=false;
  onChange(next);
 };
 return <TableContainer><Table size="small" aria-label="Module permissions"><TableHead><TableRow><TableCell>Module</TableCell><TableCell>View</TableCell><TableCell>Manage</TableCell></TableRow></TableHead><TableBody>
  {modules.map(m=><TableRow key={m.key}><TableCell>{m.label}</TableCell>{['view','manage'].map(action=><TableCell key={action}>{action==='manage'&&!m.manage?'—':<TextField select size="small" fullWidth disabled={disabled} label={`${m.label}: ${action}`} value={Object.prototype.hasOwnProperty.call(value,`${m.key}.${action}`)?value[`${m.key}.${action}`]?'allow':'deny':roleMode?(inherited[`${m.key}.${action}`]?'allow':'deny'):'inherit'} onChange={e=>update(`${m.key}.${action}`,e.target.value)}>
   {!roleMode&&<MenuItem value="inherit">Inherit ({inherited[`${m.key}.${action}`]?'Allowed':'Denied'})</MenuItem>}<MenuItem value="allow">Allow</MenuItem><MenuItem value="deny">Deny</MenuItem>
  </TextField>}</TableCell>)}</TableRow>)}
 </TableBody></Table></TableContainer>;
}
export default function UserManagement(){
 const {user}=useAuth();
 const [tab,setTab]=useState('users'),[catalog,setCatalog]=useState({modules:[],roles:[]}),[rows,setRows]=useState([]),[total,setTotal]=useState(0),[query,setQuery]=useState(''),[offset,setOffset]=useState(0);
 const [editing,setEditing]=useState(null),[form,setForm]=useState(null),[role,setRole]=useState('Salesperson'),[rolePermissions,setRolePermissions]=useState({});
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const [u,c]=await Promise.all([api.get(API,{params:{q:query,offset}}),api.get(`${API}/permissions`)]);setRows(u.data.items);setTotal(u.data.total);setCatalog(c.data);}
  catch(e){setError(e.response?.data?.message||'Unable to load users');}finally{setLoading(false);}
 },[query,offset]);
 useEffect(()=>{const timer=setTimeout(load,200);return()=>clearTimeout(timer);},[load]);
 useEffect(()=>{setRolePermissions(catalog.roles.find(r=>r.userType===role)?.permissions||{});},[role,catalog]);
 const open=row=>{setEditing(row);setForm({userType:row.userType,isActive:row.isActive,permissionOverrides:{...row.permissionOverrides}});setError('');setSuccess('');};
 const save=async()=>{
  setBusy(true);setError('');
  try{await api.put(`${API}/${editing.id}/access`,form);setEditing(null);await load();setSuccess('User access saved. Changes apply to their next API request.');}
  catch(e){setError(e.response?.data?.message||'Unable to save user access');}finally{setBusy(false);}
 };
 const saveRole=async()=>{
  setBusy(true);setError('');setSuccess('');
  try{await api.put(`${API}/roles/${encodeURIComponent(role)}`,{permissions:rolePermissions});await load();setSuccess(`${role} defaults saved. Existing per-user overrides are preserved.`);}
  catch(e){setError(e.response?.data?.message||'Unable to save role defaults');}finally{setBusy(false);}
 };
 const inherited=catalog.roles.find(r=>r.userType===form?.userType)?.permissions||{};
 return <Box sx={{p:{xs:2,md:3},maxWidth:1300,mx:'auto'}}>
  <Typography variant="h4" fontWeight={750}>Manage Users</Typography><Typography color="text.secondary" sx={{my:1}}>Set permissions by user type, then customize access for individual users.</Typography>
  <Alert severity="info" sx={{my:2}}>Store assignments and manager approvals still apply. Assign stores and store roles in Stores. Administrators retain full access; user management, store administration, and commission administration remain Admin-only.</Alert>
  {error&&!editing&&<Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}{success&&<Alert severity="success">{success}</Alert>}
  <Stack direction="row" spacing={1} sx={{my:2}}><Button variant={tab==='users'?'contained':'outlined'} onClick={()=>setTab('users')}>Users</Button><Button variant={tab==='roles'?'contained':'outlined'} onClick={()=>setTab('roles')}>User type defaults</Button></Stack>
  {tab==='users'?<Paper sx={{p:2}}>
   <TextField label="Search users by name or mobile" fullWidth value={query} onChange={e=>{setQuery(e.target.value);setOffset(0);}} sx={{mb:2}}/>
   {loading?<Typography>Loading users…</Typography>:<TableContainer><Table><TableHead><TableRow>{['Name','Mobile','User type','Account','Permissions',''].map((x,i)=><TableCell key={i}>{x}</TableCell>)}</TableRow></TableHead><TableBody>
    {rows.map(row=><TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.mobile}</TableCell><TableCell>{row.userType}</TableCell><TableCell>{row.isActive?'Active':'Disabled'}</TableCell><TableCell>{Object.keys(row.permissionOverrides||{}).length?'Customized':'User type defaults'}</TableCell><TableCell><Button onClick={()=>open(row)}>Manage {row.name}</Button></TableCell></TableRow>)}
    {!rows.length&&<TableRow><TableCell colSpan={6}>No users found.</TableCell></TableRow>}
   </TableBody></Table></TableContainer>}
   <Stack direction="row" alignItems="center" spacing={2} sx={{mt:2}}><Button disabled={offset===0||loading} onClick={()=>setOffset(x=>Math.max(0,x-25))}>Previous</Button><Typography>{total} users</Typography><Button disabled={offset+25>=total||loading} onClick={()=>setOffset(x=>x+25)}>Next</Button></Stack>
  </Paper>:<Paper sx={{p:2}}>
   <TextField select label="User type" value={role} onChange={e=>setRole(e.target.value)} sx={{minWidth:220,mb:2}}>{catalog.roles.map(r=><MenuItem key={r.userType} value={r.userType}>{r.userType}</MenuItem>)}</TextField>
   <Typography sx={{mb:2}}>These defaults apply to every user of this type. Manage includes changes and requires View. Individual overrides take priority.</Typography>
   <PermissionGrid modules={catalog.modules} value={rolePermissions} onChange={setRolePermissions} inherited={inherited} roleMode disabled={busy||role==='Admin'}/>
   <Button variant="contained" sx={{mt:2}} disabled={busy||loading||role==='Admin'} onClick={saveRole}>Save user type defaults</Button>
  </Paper>}
  <Dialog open={Boolean(editing)} onClose={()=>!busy&&setEditing(null)} fullWidth maxWidth="md"><DialogTitle>Manage access: {editing?.name}</DialogTitle><DialogContent>
   {error&&<Alert severity="error">{error}</Alert>}{form&&editing&&<Stack spacing={2} sx={{pt:1}}>
    <Typography>{editing.mobile}</Typography><TextField select label="Account user type" disabled={busy} value={form.userType} onChange={e=>setForm({...form,userType:e.target.value})}>{catalog.roles.map(r=><MenuItem key={r.userType} value={r.userType}>{r.userType}</MenuItem>)}</TextField>
    {form.userType==='Admin'&&<Alert severity="info">Admin has full application access, including user and store administration.</Alert>}
    <FormControlLabel control={<Switch checked={form.isActive} disabled={busy||String(editing.id)===String(user?.id)} onChange={e=>setForm({...form,isActive:e.target.checked})}/>} label="Account active"/>
    <Button disabled={busy} onClick={()=>setForm({...form,permissionOverrides:{}})}>Reset to user type defaults</Button>
    <PermissionGrid modules={catalog.modules} value={form.permissionOverrides} onChange={permissionOverrides=>setForm({...form,permissionOverrides})} inherited={inherited} disabled={busy||form.userType==='Admin'}/>
   </Stack>}
  </DialogContent><DialogActions><Button disabled={busy} onClick={()=>setEditing(null)}>Cancel</Button><Button variant="contained" disabled={busy||!form} onClick={save}>{busy?'Saving…':'Save user access'}</Button></DialogActions></Dialog>
 </Box>;
}
