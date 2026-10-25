import {it,expect} from 'vitest';
import {measurementConnection,schoolStatusLabel} from '../src/health/lib/integrationStatus.js';

it('does not enable imports for disconnected, unknown or incomplete account states',()=>{
  for(const operational_state of [undefined,'UNMAPPED','DISCONNECTED','CONFIGURED','AUTHENTICATED','new_state']) {
    expect(measurementConnection({operational_state,status:'connected'}).canSync).toBe(false);
  }
  expect(measurementConnection({operational_state:'ERROR',status:'not_connected'}).canSync).toBe(false);
  expect(measurementConnection({operational_state:'MAPPED'}).canSync).toBe(false);
});
it('enables mapped users and retries while keeping device-only builds disconnected',()=>{
  for(const operational_state of ['MAPPED','SYNCED','ERROR']) {
    const status={operational_state,status:operational_state==='ERROR'?'error':'pending'};
    expect(measurementConnection(status).canSync).toBe(true);
    expect(measurementConnection(status,true).canSync).toBe(false);
  }
  expect(measurementConnection({operational_state:'MAPPED',status:'pending'}).label).not.toContain('연결됨');
});
it('does not confuse an institution connection with imported personal records',()=>{
  expect(schoolStatusLabel('connected')).toBe('기관 연결 확인됨');
  expect(schoolStatusLabel(undefined)).toBe('연결 상태 미확인');
});
