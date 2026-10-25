// Keep contact, payment and accounting fields untouched by GST autofill.
export function applyGSTDetails(form, data, lookupToken) {
  const address = data.address || {};
  const next = { ...form, gstin: data.gstin, gstLookupToken: lookupToken, gstVerifiedAt: data.fetchedAt, gstDataSource: data.source, clearGstVerification: false };
  for (const [key, value] of Object.entries({ name: data.tradeName || data.legalName, city: address.city, state: address.state, pinCode: address.pincode })) {
    if (value) next[key] = value;
  }
  next.billingAddress = { ...form.billingAddress };
  if (address.addressLine1) { next.billingAddress.line1 = address.addressLine1; }
  if (address.addressLine2) next.billingAddress.line2 = address.addressLine2;
  next.gstDetails = { legalName: data.legalName || '', tradeName: data.tradeName || '', registrationStatus: data.registrationStatus || '', taxpayerType: data.taxpayerType || '', constitutionOfBusiness: data.constitutionOfBusiness || '', registrationDate: data.registrationDate || '', district: address.district || '', stateCode: address.stateCode || '', natureOfBusiness: data.natureOfBusiness || [] };
  return next;
}
export const storedGSTFields = (party) => ({ gstDetails: party?.gst_details || {}, gstVerifiedAt: party?.gst_verified_at || null, gstDataSource: party?.gst_data_source || null, gstLookupToken: null, clearGstVerification: false });
export const changeGSTIN = (form, gstin) => ({ ...form, gstin, gstDetails: gstin !== form.gstin ? { ...form.gstDetails, registrationStatus: '', registrationDate: '', stateCode: '' } : form.gstDetails, gstLookupToken: null, gstVerifiedAt: null, gstDataSource: null, clearGstVerification: true });
