import React from 'react';
import {Alert,Button,Stack,Typography} from '@mui/material';

export default function SalesValidationAlert({issue,isAdmin,onRefresh,onChooseGst}){
  if(!issue)return null;
  const productSetup=issue.productId&&['PRODUCT_TAX_CLASSIFICATION_REQUIRED','PRODUCT_TAX_RATE_REQUIRED','DOCUMENT_NOT_ELIGIBLE'].includes(issue.code);
  return <Alert severity="error"><Typography>{issue.message}</Typography>
    <Stack direction="row" gap={1} useFlexGap flexWrap="wrap">
      {productSetup&&isAdmin&&<Button component="a" href={`/products?edit=${encodeURIComponent(issue.productId)}`} target="_blank" rel="noopener noreferrer">Update product</Button>}
      {productSetup&&!isAdmin&&<Typography variant="body2">Ask an administrator to review this product in Products.</Typography>}
      {productSetup&&onRefresh&&<Button onClick={onRefresh}>Refresh product details</Button>}
      {onChooseGst&&<Button onClick={onChooseGst}>Use GST Tax Invoice for this sale</Button>}
    </Stack>
  </Alert>;
}
