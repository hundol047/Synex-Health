import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {vi,it,expect,beforeEach} from 'vitest';
import SubscriptionPage from '../src/health/pages/SubscriptionPage.jsx';
import {BillingAPI} from '../src/shared/lib/subscriptions.js';
vi.mock('../src/shared/lib/subscriptions.js',()=>({BillingAPI:{plans:vi.fn(),status:vi.fn(),demo:vi.fn(),sync:vi.fn()},storePackages:vi.fn(),buyPackage:vi.fn(),restore:vi.fn(),manageURL:()=>null}));
beforeEach(()=>{vi.resetAllMocks();BillingAPI.plans.mockResolvedValue({plans:[{id:'plus',name:'Plus',price_label:'스토어에서 가격 확인',features:['월별 리포트']}]});});
it('does not offer a payment when billing is not configured',async()=>{
 BillingAPI.status.mockResolvedValue({mode:'disabled',active:false});
 render(<MemoryRouter><SubscriptionPage/></MemoryRouter>);
 expect(await screen.findByText(/현재 결제할 수 없습니다/)).toBeTruthy();
 expect(screen.queryByRole('button',{name:/체험/})).toBeNull();
});
it('clearly identifies a no-charge demo activation',async()=>{
 BillingAPI.status.mockResolvedValue({mode:'demo',demo:true,active:false});
 BillingAPI.demo.mockResolvedValue({mode:'demo',demo:true,active:true,will_renew:true});
 render(<MemoryRouter><SubscriptionPage/></MemoryRouter>);
 fireEvent.click(await screen.findByRole('button',{name:'Plus 데모 체험 · 결제 없음'}));
 expect(await screen.findByText(/실제 결제는 발생하지 않습니다/)).toBeTruthy();
 expect(BillingAPI.demo).toHaveBeenCalledWith('activate');
});
