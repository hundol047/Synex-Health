import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,retries:0,timeout:60000,
 reporter:[['list'],['html',{open:'never'}]],
 use:{extraHTTPHeaders:{Origin:'http://127.0.0.1:5173'},baseURL:'http://127.0.0.1:5173',viewport:{width:1280,height:900},screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']}},
 webServer:[
  {env:{AUTH_MODE:'demo',SYNEX_ALLOW_DEMO:'true',DEMO_ACCESS_CODE:process.env.DEMO_ACCESS_CODE||'test-only-demo-code',RETENTION_POLICY:'테스트 데이터 삭제 요청 시까지'},command:'python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',cwd:'../backend',url:'http://127.0.0.1:8000/api/health/status',reuseExistingServer:!process.env.CI,timeout:30000},
  {command:'npm run dev -- --host 127.0.0.1 --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:30000}
 ]
});
