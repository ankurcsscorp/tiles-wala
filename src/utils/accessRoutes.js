const routes={
 '/billing':'sales','/sales':'sales','/purchases':'purchases','/payments':'payments','/returns':'returns',
 '/inventory':'inventory','/transfers':'transfers','/customers':'customers','/suppliers':'suppliers',
 '/financial-reports':'reports','/dashboard':'dashboard','/products':'products','/settings/invoices':'invoice_settings',
 '/enquiry-management':'enquiries','/sales-bonus':'bonus',
};
export const permissionForPath=path=>{const match=Object.entries(routes).find(([base])=>path===base||path.startsWith(`${base}/`));return match?`${match[1]}.view`:null;};
