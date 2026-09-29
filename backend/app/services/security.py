"""Bounded request bodies, process-local abuse guard and redacted error responses.
Deploy a shared gateway limiter for multi-worker/global enforcement.
"""
import time,hashlib
from collections import OrderedDict
from starlette.responses import JSONResponse
class SecurityMiddleware:
 def __init__(self,app):self.app=app;self.buckets=OrderedDict()
 async def __call__(self,scope,receive,send):
  if scope['type']!='http':return await self.app(scope,receive,send)
  import os
  if os.getenv('APP_ENV')=='production' and scope.get('scheme')!='https':return await JSONResponse({'detail':'HTTPS 연결이 필요합니다.'},400)(scope,receive,send)
  path=scope.get('path','');headers=dict(scope.get('headers',[]));method=scope['method']
  if path.startswith('/api/'):
   key=hashlib.sha256(((scope.get('client') or ('unknown',0))[0]+('review' if path=='/api/auth/review' else '')).encode()).digest();minute=int(time.time()/60)
   old,count=self.buckets.get(key,(minute,0));count=count+1 if old==minute else 1;self.buckets[key]=(minute,count);self.buckets.move_to_end(key)
   while len(self.buckets)>10000:self.buckets.popitem(last=False)
   if count>(10 if path=='/api/auth/review' else 240):return await JSONResponse({'detail':'요청이 많습니다. 잠시 후 다시 시도하세요.'},429,headers={'Retry-After':'60'})(scope,receive,send)
   if headers.get(b'cookie') and not headers.get(b'authorization') and method not in ('GET','HEAD','OPTIONS'):
    import os
    allowed=os.getenv('SYNEX_CORS_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(',')
    if headers.get(b'origin',b'').decode() not in allowed:return await JSONResponse({'detail':'허용되지 않은 요청 출처입니다.'},403)(scope,receive,send)
   messages=[];size=0
   while True:
    message=await receive()
    if message['type']=='http.disconnect':return
    size+=len(message.get('body',b''))
    if size>2*1024*1024:return await JSONResponse({'detail':'요청 크기 제한을 초과했습니다.'},413)(scope,receive,send)
    messages.append(message)
    if not message.get('more_body'):break
   async def bounded_receive():return messages.pop(0) if messages else await receive()
  else:bounded_receive=receive
  async def secure_send(message):
   if message['type']=='http.response.start':
    message['headers']=list(message.get('headers',[]))+[(b'x-content-type-options',b'nosniff'),(b'referrer-policy',b'no-referrer'),(b'x-frame-options',b'DENY'),(b'cache-control',b'no-store')]
    if scope.get('scheme')=='https':message['headers'].append((b'strict-transport-security',b'max-age=31536000'))
   await send(message)
  await self.app(scope,bounded_receive,secure_send)
