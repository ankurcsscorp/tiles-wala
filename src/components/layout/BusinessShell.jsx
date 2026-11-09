import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Box, Button, Collapse, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, TextField, ThemeProvider, Tooltip, Typography, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Logout from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext';
import { useStores } from '../../context/StoreContext';
import { isActiveItem, navigationForRole, pageTitle } from './navigation';
import theme from './businessTheme';
import { useDealerCart } from '../../context/DealerCartContext';
import './BusinessShell.css';

export default function BusinessShell({ children }) {
  const { user, logout } = useAuth();
  const { itemCount } = useDealerCart();
  const { stores, selectedStoreId, selectStore, loading } = useStores();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const desktop = useMediaQuery('(min-width:1200px)');
  const overlay = useMediaQuery('(max-width:899px)');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState({});
  const [accountAnchor, setAccountAnchor] = useState(null);
  const role = user?.userType?.toLowerCase();
  const groups = navigationForRole(role,user?.permissions);
  const useAccountNameWithoutStore = ['dealer', 'tile mistire'].includes(role);
  const activeGroup = groups.find((group) => group.items.some((item) => isActiveItem(item, pathname)))?.label;
  const rail = !overlay && (!desktop || collapsed);
  const width = rail ? 76 : 260;

  useEffect(() => {
    setMobileOpen(false);
    setClosedGroups((current) => ({ ...current, [activeGroup]: false }));
  }, [pathname, activeGroup]);
  useEffect(() => { if (!overlay) setMobileOpen(false); }, [overlay]);

  const signOut = () => { setAccountAnchor(null); logout(); navigate('/'); };
  const toggleSidebar = () => {
    if (overlay) setMobileOpen((open) => !open);
    else if (!desktop) setMobileOpen(true);
    else setCollapsed((current) => !current);
  };
  const sidebar = (compact = false, instance) => <>
    <Box className="sidebar-brand">
      <img src="/images/brandlogo.png" alt="A & A Home Decor" />
      {!compact && <Box><Typography fontWeight={750}>Tiles Wala</Typography><Typography variant="caption" color="text.secondary">A & A HOME DECOR</Typography></Box>}
      {!compact && <IconButton className="drawer-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><ChevronLeft /></IconButton>}
    </Box>
    <Box component="nav" aria-label="Main navigation" className="sidebar-navigation">
      {groups.map((group, index) => <Box key={group.label} className="nav-group">
        {!compact ? <Button className="nav-group-heading" fullWidth aria-expanded={!closedGroups[group.label]} aria-controls={`nav-${instance}-group-${index}`} onClick={() => setClosedGroups((current) => ({ ...current, [group.label]: !current[group.label] }))} endIcon={<ExpandMore sx={{ transform: closedGroups[group.label] ? 'rotate(-90deg)' : 'none' }} />}>
          {group.label}
        </Button> : <Box className="nav-group-divider" />}
        <Collapse id={`nav-${instance}-group-${index}`} in={compact || !closedGroups[group.label]} timeout="auto" unmountOnExit>
          <List disablePadding>{group.items.map((item) => {
            const Icon = item.icon;
            const active = isActiveItem(item, pathname);
            const external = item.path.startsWith('https:');
            return <Tooltip key={item.path} title={compact ? item.label : ''} placement="right">
              <ListItemButton component={external ? 'a' : Link} {...(external ? { href: item.path, target: '_blank', rel: 'noopener noreferrer' } : { to: item.path })}
                selected={active} aria-current={active ? 'page' : undefined} aria-label={item.label} onClick={() => setMobileOpen(false)} className="sidebar-link">
                <ListItemIcon>{item.path==='/dealer/cart'?<Badge color="secondary" badgeContent={itemCount} max={99}><Icon fontSize="small" /></Badge>:<Icon fontSize="small" />}</ListItemIcon>
                {!compact && <ListItemText primary={item.path==='/dealer/cart'&&itemCount?`${item.label} (${itemCount})`:item.label} slotProps={{primary:{ fontSize: '.83rem', fontWeight: active ? 650 : 500 }}} />}
              </ListItemButton>
            </Tooltip>;
          })}</List>
        </Collapse>
      </Box>)}
    </Box>
    <Box className="sidebar-account"><Tooltip title={compact ? 'Sign Out' : ''} placement="right"><Button color="inherit" onClick={signOut} aria-label="Sign Out" startIcon={<Logout fontSize="small" />}>{!compact && 'Sign Out'}</Button></Tooltip></Box>
  </>;
  const activeStore = stores.find((store) => String(store.id) === String(selectedStoreId));

  return <ThemeProvider theme={theme}>
    <Box className={`business-shell ${rail ? 'sidebar-collapsed' : ''}`} style={{ '--sidebar-width': `${width}px` }}>
      <a className="skip-to-content" href="#main-content">Skip to content</a>
      {!overlay && <Drawer variant="permanent" className="business-sidebar" sx={{ width, '& .MuiDrawer-paper': { width } }}>{sidebar(rail, 'permanent')}</Drawer>}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} className="business-sidebar temporary-sidebar" sx={{ '& .MuiDrawer-paper': { width: 280, maxWidth: '90vw' } }}>{sidebar(false, 'temporary')}</Drawer>
      <Box className="business-workspace">
        <Box component="header" className="business-header">
          <IconButton onClick={toggleSidebar} aria-label={overlay || !desktop ? 'Open navigation' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={overlay || !desktop ? mobileOpen : !collapsed}><MenuIcon /></IconButton>
          <Box className="header-page"><Typography variant="caption" color="text.secondary">Workspace</Typography><Typography component="h1" fontWeight={700}>{pageTitle(pathname)}</Typography></Box>
          <Box className="header-store">
            {stores.length > 1 && (activeStore || !useAccountNameWithoutStore) ? <TextField select label="Active store" value={activeStore ? String(selectedStoreId) : ''} disabled={loading} onChange={(event) => selectStore(event.target.value)} fullWidth>
              {stores.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}
            </TextField> : <Typography variant="body2" title={activeStore?.name || (useAccountNameWithoutStore ? user?.name : undefined)}>{loading ? 'Loading stores…' : activeStore?.name || (useAccountNameWithoutStore ? user?.name : 'No active store')}</Typography>}
          </Box>
          <Tooltip title="Account"><IconButton aria-label="Open account menu" aria-controls={accountAnchor ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={Boolean(accountAnchor)} onClick={(event) => setAccountAnchor(event.currentTarget)}><Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '.9rem' }}>{(user?.name || user?.mobile || 'U').slice(0, 1).toUpperCase()}</Avatar></IconButton></Tooltip>
          <Menu id="account-menu" anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)}>
            <Box sx={{ px: 2, py: 1, maxWidth: 260, overflowWrap: 'anywhere' }}><Typography fontWeight={650}>{user?.name || user?.mobile}</Typography><Typography variant="caption" color="text.secondary">{user?.userType}</Typography></Box>
            <MenuItem onClick={signOut}><ListItemIcon><Logout fontSize="small" /></ListItemIcon>Sign Out</MenuItem>
          </Menu>
        </Box>
        <Box component="main" id="main-content" tabIndex={-1} className="business-content">{children}</Box>
      </Box>
    </Box>
  </ThemeProvider>;
}
