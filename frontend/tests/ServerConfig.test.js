import {it,expect,vi} from 'vitest';
import {normalizeServer,verifyServer} from '../src/shared/lib/serverConfig.js';
it('accepts only an explicit HTTPS API origin',()=>{
 expect(normalizeServer(' https://health.test/ ')).toBe('https://health.test');
 for(const v of ['http://health.test','https://example.com','https://user:pass@health.test','https://health.test/api','https://health.test?token=value'])expect(()=>normalizeServer(v)).toThrow();
});
it('checks the service identity before allowing a connection',async()=>{
 await expect(verifyServer('https://health.test',{fetcher:async()=>({ok:true,json:async()=>({status:'ok'})})})).rejects.toThrow('Synex Health API');
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>({status:'ok',service:'synex-health'})}));
 await expect(verifyServer('https://health.test',{fetcher})).resolves.toMatchObject({status:'ok'});
 expect(fetcher.mock.calls[0][0]).toBe('https://health.test/api/health/status');
});
