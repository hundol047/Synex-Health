import {test,expect} from '@playwright/test';

test('eye colors change visible iris pixels, persist, and stay separate from skin tone',async({page},info)=>{
 test.setTimeout(240000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))errors.push(m.text());});
 await page.setViewportSize({width:1100,height:1000});
 await page.addInitScript(()=>{localStorage.setItem('synex-personal-onboarding-v1','done');localStorage.setItem('synex-personal-consent-v1','accepted');});
 await page.goto('/health/character');const canvas=page.locator('canvas');
 await expect(canvas).toHaveAttribute('data-character-skin-detail','atlas',{timeout:30000});
 await page.getByRole('button',{name:'얼굴·헤어',exact:true}).click();
 await page.getByRole('button',{name:'눈동자 갈색',exact:true}).click();
 await page.getByRole('button',{name:'눈 색 확대해서 보기',exact:true}).click();
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-eyes','#8b633e');
 const brown=await canvas.screenshot({path:info.outputPath('brown-iris.png')});
 await page.getByRole('button',{name:'미리보기 눈동자 파랑',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-eyes','#467fac');
 const blue=await canvas.screenshot({path:info.outputPath('blue-iris.png')});
 // Decode real rendered PNGs with the browser. A saved hex string alone does
 // not prove that opaque sclera/corneal reflections haven't hidden the iris.
 const changed=await page.evaluate(async({brown,blue})=>{
  const decode=async data=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const context=c.getContext('2d');context.drawImage(image,0,0);return {data:context.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};};
  const a=await decode(brown),b=await decode(blue);let count=0;
  for(let y=Math.floor(a.height*.25);y<a.height*.75;y++)for(let x=Math.floor(a.width*.25);x<a.width*.75;x++){
   const i=(y*a.width+x)*4;if(b.data[i+2]>a.data[i+2]+12&&b.data[i]<a.data[i]-5)count++;
  }
  return count;
 },{brown:brown.toString('base64'),blue:blue.toString('base64')});
 await info.attach('visible-iris-color-pixels',{body:JSON.stringify({changed}),contentType:'application/json'});
 expect(changed).toBeGreaterThan(20);
 const skin=await page.getByLabel('피부색',{exact:true}).inputValue();
 await page.getByRole('button',{name:'저장하고 운동에 적용',exact:true}).click();await page.reload();
 await expect(canvas).toHaveAttribute('data-character-eyes','#467fac',{timeout:30000});
 await expect(page.getByLabel('피부색',{exact:true})).toHaveValue(skin);
 await page.getByRole('button',{name:'여성형',exact:true}).click();
 await expect(page.getByRole('heading',{name:'나만의 운동 캐릭터',exact:true})).toBeVisible();
 await expect(canvas).toHaveAttribute('data-character-body','female');
 await expect(canvas).toHaveAttribute('data-character-skin-detail','atlas');
 await page.getByRole('button',{name:'얼굴 확대',exact:true}).click();
 await page.getByRole('button',{name:'정면 운동 시범 보기',exact:true}).click();
 await canvas.screenshot({path:info.outputPath('female-textured-face.png')});
 await page.getByRole('button',{name:'애니 · 툰',exact:true}).click();
 await expect(canvas).toHaveAttribute('data-character-skin-detail','toon');
 expect(errors).toEqual([]);
});
