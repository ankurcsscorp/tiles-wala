import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import './Header.css';

// Public storefront navigation. Authenticated navigation lives in BusinessShell.
export default function Header() {
  const [open, setOpen] = useState(false);
  return <header className="public-header">
    <NavLink className="public-brand" to="/"><img src="/images/brandlogo.png" alt="" /><span>A & A HOME DECOR</span></NavLink>
    <IconButton className="public-menu-toggle" aria-label="Toggle navigation" aria-expanded={open} aria-controls="public-navigation" onClick={() => setOpen((value) => !value)}><MenuIcon /></IconButton>
    <nav id="public-navigation" aria-label="Storefront navigation" className={open ? 'public-navigation open' : 'public-navigation'}>
      <NavLink to="/" onClick={() => setOpen(false)}>New Collections</NavLink>
      <NavLink to="/contact" onClick={() => setOpen(false)}>Contact Us</NavLink>
      <a href="https://mybillbook.in/store/johnson_tiles_mahua" target="_blank" rel="noopener noreferrer">Online Store</a>
      <Button component={NavLink} to="/auth" variant="outlined" onClick={() => setOpen(false)}>Sign In</Button>
    </nav>
  </header>;
}
