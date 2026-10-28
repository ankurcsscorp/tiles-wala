import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import UserManagement from './UserManagement';
import api from '../../api';
import {defaultPermissions} from '../../utils/permissions';
jest.mock('../../api',()=>({get:jest.fn(),put:jest.fn()}));
jest.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{id:'1',userType:'Admin'}})}));
const roles=['Admin','Salesperson','Tile Mistire','Plumber Mistiri'].map(userType=>({userType,permissions:defaultPermissions(userType)}));
beforeEach(()=>{
 jest.clearAllMocks();
 api.get.mockImplementation(url=>Promise.resolve({data:url.endsWith('/permissions')?{modules:[{key:'sales',label:'Sales & billing',manage:true},{key:'dashboard',label:'Dashboard',manage:false}],roles}:{items:[{id:'2',name:'Alice',mobile:'9876543210',userType:'Salesperson',isActive:true,permissionOverrides:{}}],total:1}}));
 api.put.mockResolvedValue({data:{}});
});
const choose=async(label,value,scope=screen)=>{fireEvent.mouseDown(scope.getByRole('combobox',{name:label}));fireEvent.click(await screen.findByRole('option',{name:value}));};
test('Admin can save per-user overrides with the View/Manage dependency',async()=>{
 render(<UserManagement/>);fireEvent.click(await screen.findByRole('button',{name:'Manage Alice'}));
 const dialog=within(screen.getByRole('dialog'));
 await choose('Sales & billing: view','Deny',dialog);
 fireEvent.click(dialog.getByRole('button',{name:'Save user access'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/users/2/access',{userType:'Salesperson',isActive:true,permissionOverrides:{'sales.view':false,'sales.manage':false}}));
 expect(await screen.findByText(/User access saved/)).toBeInTheDocument();
});
test('read-only module permissions save without inventing a manage key',async()=>{
 render(<UserManagement/>);fireEvent.click(await screen.findByRole('button',{name:'Manage Alice'}));
 const dialog=within(screen.getByRole('dialog'));await choose('Dashboard: view','Deny',dialog);
 fireEvent.click(dialog.getByRole('button',{name:'Save user access'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({permissionOverrides:{'dashboard.view':false}})));
});
test('user type defaults save separately without modifying individual users',async()=>{
 render(<UserManagement/>);await screen.findByRole('button',{name:'Manage Alice'});
 fireEvent.click(screen.getByRole('button',{name:'User type defaults'}));await choose('User type','Tile Mistire');
 await choose('Sales & billing: manage','Allow');
 fireEvent.click(screen.getByRole('button',{name:'Save user type defaults'}));
 await waitFor(()=>expect(api.put).toHaveBeenCalledWith('http://localhost:4000/api/tiles/users/roles/Tile%20Mistire',{permissions:expect.objectContaining({'sales.view':true,'sales.manage':true})}));
});
test('failed updates remain in the dialog for correction',async()=>{
 api.put.mockRejectedValue({response:{data:{message:'Active administrator access is required'}}});
 render(<UserManagement/>);fireEvent.click(await screen.findByRole('button',{name:'Manage Alice'}));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Save user access'}));
 expect(await screen.findByText('Active administrator access is required')).toBeInTheDocument();expect(screen.getByRole('dialog')).toBeInTheDocument();
});
