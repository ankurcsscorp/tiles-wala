import {act,renderHook,waitFor} from '@testing-library/react';
import useBillingSettings from './useBillingSettings';
import api from '../api';
jest.mock('../api',()=>({get:jest.fn()}));
beforeEach(()=>jest.clearAllMocks());
test('normalizes the existing layout preference for both billing modules',async()=>{
 api.get.mockResolvedValue({data:{data:{invoiceLayout:'SIMPLE_LAYOUT'}}});
 const {result}=renderHook(()=>useBillingSettings('1'));
 await waitFor(()=>expect(result.current.ready).toBe(true));expect(result.current.settings.billingMode).toBe('SIMPLE');
});
test('ignores a late response for the previous store',async()=>{
 let firstResolve,secondResolve;
 api.get.mockImplementation(url=>new Promise(resolve=>{if(url.includes('/stores/1/'))firstResolve=resolve;else secondResolve=resolve;}));
 const {result,rerender}=renderHook(({id})=>useBillingSettings(id),{initialProps:{id:'1'}});rerender({id:'2'});
 await act(async()=>secondResolve({data:{data:{invoiceLayout:'STANDARD_GST_LAYOUT'}}}));expect(result.current.settings.billingMode).toBe('GST');
 await act(async()=>firstResolve({data:{data:{invoiceLayout:'SIMPLE_LAYOUT'}}}));expect(result.current.settings.billingMode).toBe('GST');
});
test('reloads preferences for a new entry and reports failures without permitting saves',async()=>{
 api.get.mockResolvedValue({data:{data:{invoiceLayout:'SIMPLE_LAYOUT'}}});const {result,rerender}=renderHook(({enabled})=>useBillingSettings('1',{enabled}),{initialProps:{enabled:true}});
 await waitFor(()=>expect(result.current.ready).toBe(true));rerender({enabled:false});expect(result.current.ready).toBe(false);
 api.get.mockRejectedValue(new Error('offline'));rerender({enabled:true});await waitFor(()=>expect(result.current.error).toMatch(/Unable to load/));expect(result.current.ready).toBe(false);
 api.get.mockResolvedValue({data:{data:{invoiceLayout:'STANDARD_GST_LAYOUT'}}});act(()=>result.current.reload());await waitFor(()=>expect(result.current.settings.billingMode).toBe('GST'));
});

test('preserves explicit two-mode settings instead of deriving tax treatment from appearance',async()=>{
 api.get.mockResolvedValue({data:{data:{billingMode:'NON_GST',invoiceLayout:'SIMPLE_LAYOUT'}}});const {result}=renderHook(()=>useBillingSettings('1'));
 await waitFor(()=>expect(result.current.ready).toBe(true));expect(result.current.settings.billingMode).toBe('NON_GST');expect(result.current.settings.twoModeBilling).toBe(true);
});
