import React, { useEffect, useState } from "react";
import { Autocomplete, Button, Stack, TextField } from "@mui/material";
import api from "../../api";

const API = "http://localhost:4000/api/tiles/customers";

/** Reusable billing control: the parent owns the invoice draft; add-customer never resets it. */
export default function CustomerSearch({ value, onSelect, onAddNew, label = "Customer" }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) { setOptions([]); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const response = await api.get(`${API}/search`, { params: { q: query.trim() } }); if (active) setOptions(response.data); }
      catch { if (active) setOptions([]); }
      finally { if (active) setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  return <Stack useFlexGap className="ui-picker" direction={{ xs: "column", sm: "row" }} spacing={1}>
    <Autocomplete fullWidth value={value || null} options={options} loading={loading} inputValue={query || (value ? `${value.name}${value.phone ? ` · ${value.phone}` : ""}` : "")} filterOptions={(available)=>available}
      getOptionLabel={(customer) => customer ? `${customer.name}${customer.phone ? ` · ${customer.phone}` : ""}` : ""}
      isOptionEqualToValue={(a,b) => String(a.id) === String(b.id)} onInputChange={(_, next) => setQuery(next)} onChange={(_, next) => onSelect?.(next)}
      renderInput={(params) => <TextField {...params} label={label} placeholder="Search name or mobile" />}
      noOptionsText={query.trim().length < 2 ? "Type at least 2 characters" : "No matching customers"} />
    {onAddNew && <Button variant="outlined" onClick={onAddNew} sx={{ minWidth: { sm: 150 } }}>Add customer</Button>}
  </Stack>;
}
