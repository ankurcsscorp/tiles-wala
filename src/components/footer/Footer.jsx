import React from "react";
import { Link } from "react-router-dom";
import { Box, Container, Grid, Typography, TextField, Button, Divider } from "@mui/material";
import { Facebook, Instagram } from "@mui/icons-material";

const Footer = () => {
  const companyLinks = [
    { name: "Home Page", path: "/" },
    { name: "Cart", path: "/cart" },
    { name: "About Us", path: "/about" },
    { name: "Contact us", path: "/contact" },
    { name: "FAQs", path: "/faqs" },
    { name: "Terms & Conditions", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
  ];

  const featuredProducts = [
    "Miley 4.5×9.1 Glossy Porcelain Tile",
    "Rory Mirror in Antique Brass Iron",
    "Crawford Counter Stool in Brown",
    "Haverford Rug in Ecru / Mist",
    "Marmara Ice 60×120 White Polished",
  ];

  const showrooms = ["Southall", "Slough", "Twickenham"];

  return (
    <Box component="footer" sx={{ backgroundColor: "#405873", color: "#f5f5f5", py: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Column 1: Company Information */}
          <Grid item xs={12} sm={6} md={3}>
            <img src="/path-to-logo.png" alt="Tilewala Logo" style={{ maxWidth: "150px", marginBottom: "16px" }} />
            <Typography variant="body2" sx={{ mb: 1 }}>
              Address: Unit 13, Adrienne Business Centre, Adrienne Ave, Southall UB1 2FJ, United Kingdom
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <a href="tel:+447809670743" style={{ color: "#f5f5f5", textDecoration: "none" }}>Phone: 44 7809 670743</a>
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <a href="mailto:info@tilewala.com" style={{ color: "#f5f5f5", textDecoration: "none" }}>Email: info@tilewala.com</a>
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                placeholder="Enter email"
                variant="outlined"
                size="small"
                sx={{
                  backgroundColor: "transparent",
                  border: "1px solid #f5f5f5",
                  borderRadius: "8px",
                  input: { color: "#f5f5f5" },
                  flex: 1,
                }}
              />
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#fff",
                  color: "#405873",
                  borderRadius: "8px",
                  textTransform: "none",
                }}
              >
                Subscribe
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>Follow Us</Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <Instagram sx={{ color: "#f5f5f5", fontSize: "24px", "&:hover": { color: "#fff" } }} />
              </a>
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <Facebook sx={{ color: "#f5f5f5", fontSize: "24px", "&:hover": { color: "#fff" } }} />
              </a>
            </Box>
          </Grid>

          {/* Column 2: Company */}
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Company</Typography>
            {companyLinks.map((link, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                <Link to={link.path} style={{ color: "#f5f5f5", textDecoration: "none" }}>
                  {link.name}
                </Link>
              </Typography>
            ))}
          </Grid>

          {/* Column 3: Featured Products */}
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Featured Products</Typography>
            {featuredProducts.map((product, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                {product}
              </Typography>
            ))}
            <Typography variant="body2" sx={{ mt: 2, color: "#f5f5f5", cursor: "pointer" }}>
              View all categories →
            </Typography>
          </Grid>

          {/* Column 4: Showrooms */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>Showrooms</Typography>
            {showrooms.map((showroom, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                {showroom}
              </Typography>
            ))}
            <Typography variant="body2" sx={{ mt: 2, color: "#f5f5f5", cursor: "pointer" }}>
              View all showrooms →
            </Typography>
          </Grid>
        </Grid>

        {/* Bottom Section */}
        <Divider sx={{ my: 4, borderColor: "rgba(255, 255, 255, 0.2)" }} />
        <Typography variant="body2" sx={{ textAlign: "left" }}>
          © 2026, tilewala. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;