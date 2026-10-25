import {validateSalesPayment} from './salesPayment';
test.each([['',null,'2550.00'],['0',null,'2550.00'],['1000',null,'1550.00'],['2550.00',null,'0.00'],['25550',true,null],['-1',true,null],['abc',true,null],['1.001',true,null],['Infinity',true,null],['1e3',true,null]])('payment %s validates against 2550 with decimal precision',(value,error,balance)=>{
 const result=validateSalesPayment(value,'2550.00');expect(Boolean(result.error)).toBe(Boolean(error));expect(result.balance).toBe(balance);
});
test('paise comparisons do not lose floating point precision',()=>{
 expect(validateSalesPayment('0.10','0.30').balance).toBe('0.20');
 expect(validateSalesPayment('2550.01','2550.00').error).toBeTruthy();
});
