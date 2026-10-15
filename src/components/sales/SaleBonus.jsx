import React from "react";
import { Box, Container, Paper, Typography } from "@mui/material";

const SalesBonus = () => (
  <Container maxWidth="md">
    <Paper
      elevation={2}
      sx={{
        my: 8,
        p: { xs: 4, sm: 6 },
        textAlign: "center",
      }}
    >
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales Bonus
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Coming Soon
        </Typography>
      </Box>
    </Paper>
  </Container>
);

export default SalesBonus;