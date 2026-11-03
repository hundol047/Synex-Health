import React from 'react';
import {it,expect} from 'vitest';
import {render} from '@testing-library/react';
import FramingGuide,{framingStatus,framingMessage,guideShape,guideBox} from '../src/health/components/exercise/FramingGuide.jsx';

const required=[11,12,23,24,25,26,27,28];
const body=(over={})=>Array.from({length:33},(_,i)=>({x:.5,y:.2+i*.02,visibility:1,...over[i]}));

it('reports ok, missing and the edge a required joint leaves through',()=>{
 expect(framingStatus(body(),required).status).toBe('ok');
 expect(framingStatus([],required).status).toBe('missing');
 const feet=framingStatus(body({27:{x:.5,y:1.05},28:{x:.5,y:.99}}),required);
 expect(feet).toEqual({status:'partial',edges:['bottom']});
 expect(framingMessage(feet)).toContain('발이 잘려요');
 expect(framingMessage(framingStatus(body({11:{x:.5,y:.01},27:{x:.5,y:1.1}}),required))).toContain('뒤로 물러나');
 expect(framingMessage(framingStatus(body({12:{x:-.1,y:.4}}),required))).toContain('가운데');
 expect(framingMessage(null)).toContain('실루엣');
});

it('picks a floor, front or side silhouette from the exercise guide',()=>{
 expect(guideShape({floor:true,defaultView:'side'})).toBe('floor');
 expect(guideShape({defaultView:'front'})).toBe('front');
 expect(guideShape({cameraView:'정면 또는 45도'})).toBe('front');
 expect(guideShape({cameraView:'측면 또는 45도'})).toBe('side');
 expect(guideShape(null)).toBe('side');
});

it('keeps the silhouette inside the frame for landscape and portrait cameras',()=>{
 for(const size of [[640,480],[480,640],[960,720],[720,1280]])for(const shape of ['front','side','floor']){
  const {x,y,scale}=guideBox(shape,size),w=shape==='floor'?200:100,h=shape==='floor'?100:200;
  expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);
  expect(x+w*scale).toBeLessThanOrEqual(size[0]+1e-6);expect(y+h*scale).toBeLessThanOrEqual(size[1]+1e-6);
 }
});

it('marks the cut edge and exposes status for styling',()=>{
 const {container}=render(<FramingGuide guide={{floor:true}} size={[640,480]} state={{status:'partial',edges:['bottom']}}/>);
 const svg=container.querySelector('svg.coach-framing-guide');
 expect(svg.dataset.shape).toBe('floor');expect(svg.dataset.status).toBe('partial');
 expect(container.querySelectorAll('.coach-framing-edges line')).toHaveLength(1);
 expect(container.querySelectorAll('.coach-framing-corners path')).toHaveLength(4);
});
