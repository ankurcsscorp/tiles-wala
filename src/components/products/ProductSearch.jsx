import React from "react";
import { MenuItem, Stack, TextField } from "@mui/material";

export default function ProductSearch({ value, onChange, categories = [], filters, onFilterChange }) {
  return <Stack useFlexGap className="ui-filter-grid" direction={{ xs:"column", md:"row" }} spacing={1.5} sx={{ mb:2 }}>
    <TextField size="small" className="ui-search-field" label="Search products" placeholder="SKU, name, brand, collection, size or finish" value={value} onChange={(event)=>onChange(event.target.value)} fullWidth />
    <TextField slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true}}} size="small" select label="Category" value={filters.categoryId} onChange={(event)=>onFilterChange("categoryId",event.target.value)} sx={{minWidth:{md:170}}}>
      <MenuItem value="">All categories</MenuItem>{categories.map((category)=><MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
    </TextField>
    <TextField size="small" label="Brand" value={filters.brand} onChange={(event)=>onFilterChange("brand",event.target.value)} />
    <TextField size="small" label="Collection" value={filters.collection} onChange={(event)=>onFilterChange("collection",event.target.value)} />
    <TextField size="small" label="Tile size" value={filters.tileSize} onChange={(event)=>onFilterChange("tileSize",event.target.value)} />
    <TextField size="small" label="Finish" value={filters.finish} onChange={(event)=>onFilterChange("finish",event.target.value)} />
  </Stack>;
}
