import React,{useEffect,useState} from 'react';
import {Alert,Box,Button,ButtonBase,Card,CardContent,CircularProgress,Stack,ToggleButton,ToggleButtonGroup,Typography} from '@mui/material';
import {Link} from 'react-router-dom';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';
import api from '../../api';
import {formatINR} from '../../utils/dealerPricing';

const ROOT='http://localhost:4000/api/tiles/dealer-portal';
const periods=[['daily','Daily'],['weekly','Weekly'],['monthly','Monthly'],['yearly','Yearly']];
const money=value=>formatINR(Number(value||0));

function TrendChart({title,data,type,onSelect}){
 const values=data.map(d=>type==='bar'?Number(d.purchaseValue):Number(d.orderCount));
 const max=Math.max(1,...values),width=720,height=240,left=52,right=14,top=18,bottom=42,innerW=width-left-right,innerH=height-top-bottom;
 const points=data.map((d,i)=>({x:left+(data.length===1?innerW/2:i*innerW/(data.length-1)),y:top+innerH-(values[i]/max)*innerH,d,value:values[i]}));
 const labelStep=Math.max(1,Math.ceil(data.length/7));
 return <Card variant="outlined" sx={{height:'100%',minWidth:0}}><CardContent sx={{p:{xs:1.5,sm:2.25}}}>
  <Typography variant="h6" fontWeight={750} sx={{mb:1.5}}>{title}</Typography>
  {!data.length?<Typography color="text.secondary" sx={{py:5,textAlign:'center'}}>No activity for this period.</Typography>:<Box sx={{width:'100%',minWidth:0}}>
   <Box component="svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} sx={{display:'block',width:'100%',height:{xs:210,sm:250},overflow:'visible'}}>
    {[0,.5,1].map(f=><g key={f}><line x1={left} x2={width-right} y1={top+innerH*f} y2={top+innerH*f} stroke="#e6eaf0"/><text x={left-8} y={top+innerH*f+4} textAnchor="end" fill="#687386" fontSize="11">{type==='bar'?money(max*(1-f)):Math.round(max*(1-f))}</text></g>)}
    {type==='bar'?points.map((p,i)=>{const bw=Math.min(30,innerW/data.length*.55);return <g key={p.d.periodKey} role="button" tabIndex="0" onClick={()=>onSelect?.(p.d)} onKeyDown={e=>e.key==='Enter'&&onSelect?.(p.d)}><title>{`${p.d.label}: ${money(p.value)}`}</title><rect x={p.x-bw/2} y={p.y} width={bw} height={top+innerH-p.y} rx="4" fill="#315fce" opacity=".88"/><text x={p.x} y={height-12} textAnchor="middle" fill="#687386" fontSize="11">{i%labelStep===0?p.d.label:''}</text></g>}):<g><polyline points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#315fce" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>{points.map((p,i)=><g key={p.d.periodKey} role="button" tabIndex="0" onClick={()=>onSelect?.(p.d)} onKeyDown={e=>e.key==='Enter'&&onSelect?.(p.d)}><title>{`${p.d.label}: ${p.value} orders`}</title><circle cx={p.x} cy={p.y} r="5" fill="#fff" stroke="#315fce" strokeWidth="3"/><text x={p.x} y={height-12} textAnchor="middle" fill="#687386" fontSize="11">{i%labelStep===0?p.d.label:''}</text></g>)}</g>}
   </Box>
  </Box>}
 </CardContent></Card>;
}

export default function DealerDashboard(){
 const [period,setPeriod]=useState('monthly');const [data,setData]=useState(null);const [recent,setRecent]=useState([]);const [profile,setProfile]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');
  Promise.all([api.get(`${ROOT}/dashboard/analytics`,{params:{period},signal:controller.signal}),api.get(`${ROOT}/orders`,{signal:controller.signal}),api.get(`${ROOT}/profile`,{signal:controller.signal})])
   .then(([analytics,orders,dealer])=>{setData(analytics.data);setRecent(orders.data||[]);setProfile(dealer.data);})
   .catch(e=>{if(e.name!=='CanceledError'&&e.code!=='ERR_CANCELED')setError(e.response?.data?.message||'Unable to load dealer dashboard.');})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[period]);
 const summary=data?.summary||{};const cards=[
  {title:'Total Orders',value:summary.totalOrders??'—',note:'In selected period',icon:<ShoppingBagOutlined/>,to:'/dealer/orders'},
  {title:'Purchase Value',value:money(summary.purchaseValue),note:'Finalized invoices, net of returns',icon:<ReceiptLongOutlined/>,to:'/dealer/invoices'},
  {title:'Average Order Value',value:money(summary.averageOrderValue),note:'Confirmed orders in period',icon:<TrendingUpOutlined/>,to:'/dealer/orders'},
  {title:'Total Outstanding',value:money(summary.outstandingAmount),note:'Current Balance',icon:<AccountBalanceWalletOutlined/>,to:'/dealer/ledger'},
  {title:'Available Advance / Credit',value:money(summary.availableCredit),note:'Current Balance',icon:<CreditCardOutlined/>,to:'/dealer/ledger'},
 ];
 return <Box sx={{width:'100%',maxWidth:1440,mx:'auto',p:{xs:1.5,sm:2.5,lg:4},pb:{xs:11,sm:4},boxSizing:'border-box'}}>
  <Box sx={{display:'flex',flexWrap:'wrap',justifyContent:'space-between',alignItems:{xs:'stretch',sm:'center'},gap:2,mb:3}}>
   <Box sx={{minWidth:0}}><Typography variant="overline" color="primary">Dealer Portal</Typography><Typography variant="h4" fontWeight={800}>My Business Overview</Typography><Typography color="text.secondary">Track your orders, purchases and payments{profile?.businessName?` · ${profile.businessName}`:''}.</Typography></Box>
   <ToggleButtonGroup exclusive size="small" value={period} onChange={(e,v)=>v&&setPeriod(v)} aria-label="Analytics time period" sx={{alignSelf:{xs:'stretch',sm:'auto'},'& .MuiToggleButton-root':{flex:1,px:{xs:1,sm:1.5},textTransform:'none'}}}>{periods.map(([value,label])=><ToggleButton key={value} value={value}>{label}</ToggleButton>)}</ToggleButtonGroup>
  </Box>
  {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
  {loading?<Box sx={{minHeight:300,display:'grid',placeItems:'center'}}><CircularProgress/></Box>:data&&<>
   <Box sx={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,205px),1fr))',gap:{xs:1.25,sm:1.5},alignItems:'stretch'}}>
    {cards.map(c=><Card key={c.title} variant="outlined" sx={{minWidth:0,height:'100%'}}><ButtonBase component={Link} to={c.to} sx={{display:'block',width:'100%',height:'100%',textAlign:'left',borderRadius:1}}><CardContent sx={{height:'100%',boxSizing:'border-box'}}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}><Typography variant="body2" color="text.secondary">{c.title}</Typography><Box sx={{display:'flex',color:'primary.main'}}>{c.icon}</Box></Stack><Typography variant="h5" fontWeight={800} sx={{mt:1.25,overflowWrap:'anywhere'}}>{c.value}</Typography><Typography variant="caption" color="text.secondary">{c.note}</Typography></CardContent></ButtonBase></Card>)}
   </Box>
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',lg:'repeat(2,minmax(0,1fr))'},gap:2,mt:2}}>
    <TrendChart title="Purchase Value Trend" data={data.chartData||[]} type="bar" onSelect={()=>{}}/>
    <TrendChart title="Order Count Trend" data={data.chartData||[]} type="line" onSelect={()=>{}}/>
   </Box>
   <Card variant="outlined" sx={{mt:2}}><CardContent sx={{p:{xs:1.5,sm:2.25}}}><Typography variant="h6" fontWeight={750} sx={{mb:1.5}}>Payment Overview</Typography>
    <Box sx={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,165px),1fr))',gap:1.5}}>
     {[['Total Outstanding',money(summary.outstandingAmount),'Current Balance'],['Available Credit',money(summary.availableCredit),'Current Balance'],['Verified Payments',money(summary.verifiedPaymentsInPeriod),'Selected period'],['Pending Verification',money(summary.pendingVerificationAmount),'Awaiting review']].map(([label,value,note])=><Box key={label} sx={{p:1.5,bgcolor:'action.hover',borderRadius:1.5,minWidth:0}}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h6" fontWeight={750} sx={{overflowWrap:'anywhere'}}>{value}</Typography><Typography variant="caption" color="text.secondary">{note}</Typography></Box>)}
    </Box><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{mt:1.5}}>{[['Paid',summary.paymentStatus?.paid],['Partially Paid',summary.paymentStatus?.partiallyPaid],['Unpaid',summary.paymentStatus?.unpaid]].map(([label,count])=><Typography key={label} variant="body2" color="text.secondary">{label}: <b>{count??0}</b></Typography>)}</Stack>
   </CardContent></Card>
   <Card variant="outlined" sx={{mt:2,p:{xs:1.5,sm:2}}}><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{mb:1}}><Typography variant="h6" fontWeight={750}>Recent orders</Typography><Button component={Link} to="/dealer/orders" size="small">View all</Button></Stack>
    {(recent||[]).slice(0,5).map(o=><Box key={o.id} sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr) auto',sm:'minmax(220px,1.5fr) minmax(130px,1fr) minmax(110px,.7fr) auto'},alignItems:'center',columnGap:{xs:1,sm:2},rowGap:.75,py:1.25,borderBottom:'1px solid',borderColor:'divider'}}><Typography fontWeight={650}>{o.order_number}</Typography><Typography variant="body2" color="text.secondary">{o.status.replaceAll('_',' ')}</Typography><Typography fontWeight={650}>{money(o.grand_total)}</Typography><Button component={Link} to={`/dealer/orders?orderId=${encodeURIComponent(o.id)}`} size="small">Details</Button></Box>)}
    {!recent?.length&&<Typography color="text.secondary">Your submitted orders will appear here. Browsing and adding to cart do not create an order.</Typography>}
   </Card>
  </>}
 </Box>;
}
