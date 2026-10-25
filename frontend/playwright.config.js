import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./e2e',fullyParallel:false,workers:1,retries:0,timeout:60000,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1280,height:900},screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader','--disable-dev-shm-usage']}},
 webServer:[
  {command:'python -m uvicorn app.main:app --host 127.0.0.1 --port 8000',cwd:'../backend',url:'http://127.0.0.1:8000/api/health/status',reuseExistingServer:!process.env.CI,timeout:30000},
  {command:'npm run dev -- --host 127.0.0.1 --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:30000}
 ]
});
