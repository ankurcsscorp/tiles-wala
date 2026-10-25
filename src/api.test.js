import api, {resolveApiUrl} from './api';

afterEach(()=>localStorage.clear());

test('LAN requests proxy both business and GST endpoints',()=>{
  for(const hostname of ['10.27.25.11','192.168.1.20']){
    expect(resolveApiUrl('http://localhost:4000/api/tiles/products/43',{hostname})).toBe('/api/tiles/products/43');
    expect(resolveApiUrl('http://localhost:4000/api/gst/lookup/example?storeId=33',{hostname})).toBe('/api/gst/lookup/example?storeId=33');
  }
});
test('existing localhost sessions and unrelated URLs retain their destinations',()=>{
  expect(resolveApiUrl('http://localhost:4000/api/tiles/stores',{hostname:'localhost',useProxy:false})).toBe('http://localhost:4000/api/tiles/stores');
  expect(resolveApiUrl('/api/tiles/stores',{hostname:'10.27.25.11'})).toBe('/api/tiles/stores');
  expect(resolveApiUrl('https://example.com/api/tiles/stores',{hostname:'10.27.25.11'})).toBe('https://example.com/api/tiles/stores');
  expect(resolveApiUrl('http://localhost:4000/other',{hostname:'10.27.25.11'})).toBe('http://localhost:4000/other');
});
test('proxy mode works locally and the API client retains bearer authentication',async()=>{
  expect(resolveApiUrl('http://localhost:4000/api/tiles/stores',{hostname:'localhost',useProxy:true})).toBe('/api/tiles/stores');
  localStorage.setItem('tilesWalaAuth',JSON.stringify({token:'test-session'}));
  const response=await api.get('/api/tiles/stores',{adapter:async config=>({data:config,status:200,statusText:'OK',headers:{},config})});
  expect(response.data.headers.Authorization).toBe('Bearer test-session');
});
