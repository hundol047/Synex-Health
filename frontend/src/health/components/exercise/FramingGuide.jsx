import React from 'react';

// On-screen framing guide for filming. It is drawn only on the live preview;
// recorded files stay the original camera stream.
export const FRAME_EDGE=.04;

// Silhouettes in a local unit box. Standing: 100x200, floor: 200x100.
const SHAPES={
 front:{w:100,h:200,head:[50,17,12],body:'M44 30 Q50 33 56 30 L70 37 Q77 39 78 47 L83 96 Q84 104 79 106 L76 106 Q73 104 72 97 L67 58 L66 98 Q68 106 67 112 L64 190 Q64 196 58 196 L53 196 Q51 194 51 188 L50 122 L49 188 Q49 194 47 196 L42 196 Q36 196 36 190 L33 112 Q32 106 34 98 L33 58 L28 97 Q27 104 24 106 L21 106 Q16 104 17 96 L22 47 Q23 39 30 37 Z'},
 side:{w:100,h:200,head:[53,17,12],body:'M48 30 L57 30 Q63 36 62 46 Q64 62 61 78 Q62 96 60 108 L59 150 L60 186 Q61 192 68 194 L70 197 L45 197 Q43 192 45 186 L44 150 L40 112 Q37 98 40 84 L39 50 Q40 36 48 30 Z',arm:'M50 46 Q55 44 57 50 L58 98 Q57 104 52 104 Q48 102 48 97 Z'},
 floor:{w:200,h:100,head:[22,40,10],body:'M33 37 Q40 33 48 34 L120 42 L184 60 Q192 62 193 70 L193 76 L182 76 L118 60 L52 54 Q40 53 33 48 Z',arm:'M40 50 L50 50 L49 86 L54 90 L36 90 L40 86 Z',floorLine:92},
};

export function guideShape(guide){
 if(guide?.floor)return 'floor';
 const view=guide?.defaultView||(String(guide?.cameraView||'').startsWith('정면')?'front':'side');
 return view==='front'?'front':'side';
}

// 'idle' before analysis, 'missing' when no person is found, 'partial' when a
// required joint is near or past the edge, 'ok' when the body fits.
export function framingStatus(landmarks,required,edge=FRAME_EDGE){
 if(!Array.isArray(landmarks)||!landmarks.length)return {status:'missing',edges:[]};
 const edges=new Set();
 for(const i of required||[]){
  const p=landmarks[i];
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){edges.add('unknown');continue;}
  if(p.y<edge)edges.add('top');if(p.y>1-edge)edges.add('bottom');
  if(p.x<edge)edges.add('left');if(p.x>1-edge)edges.add('right');
 }
 return {status:edges.size?'partial':'ok',edges:[...edges]};
}

const MESSAGES={
 idle:'점선 실루엣 안에 전신이 들어오게 서 주세요',
 missing:'사람을 찾는 중 · 실루엣에 몸을 맞춰 주세요',
 ok:'인식 범위 안에 있어요',
};
export function framingMessage(state){
 if(state?.status!=='partial')return MESSAGES[state?.status]||MESSAGES.idle;
 const e=new Set(state.edges);
 if(e.has('top')&&e.has('bottom'))return '몸이 화면보다 커요 · 한두 걸음 뒤로 물러나 주세요';
 if(e.has('bottom'))return '발이 잘려요 · 뒤로 물러나거나 휴대폰을 조금 낮춰 주세요';
 if(e.has('top'))return '머리가 잘려요 · 뒤로 물러나거나 휴대폰을 조금 높여 주세요';
 if(e.has('left')||e.has('right'))return '몸이 옆으로 벗어났어요 · 화면 가운데로 이동해 주세요';
 return '일부 관절이 보이지 않아요 · 전신이 보이게 서 주세요';
}

export function guideBox(shape,[w,h]){
 const s=SHAPES[shape],margin=.08;
 let bw,bh;
 if(shape==='floor'){bw=w*(1-margin*2);bh=bw*s.h/s.w;if(bh>h*(1-margin*2)){bh=h*(1-margin*2);bw=bh*s.w/s.h;}}
 else{bh=h*(1-margin*2);bw=bh*s.w/s.h;if(bw>w*(1-margin*2)){bw=w*(1-margin*2);bh=bw*s.h/s.w;}}
 const x=(w-bw)/2,y=shape==='floor'?Math.min(h-bh-h*margin*.5,(h-bh)/2+h*.06):(h-bh)/2;
 return {x,y,scale:bw/s.w};
}

export default function FramingGuide({guide,size,state}){
 const [w,h]=size,shape=guideShape(guide),s=SHAPES[shape],{x,y,scale}=guideBox(shape,size);
 const status=state?.status||'idle',edge=Math.min(w,h)*FRAME_EDGE,arm=Math.min(w,h)*.09,stroke=Math.max(2,Math.min(w,h)/180);
 const corners=[[edge,edge,1,1],[w-edge,edge,-1,1],[edge,h-edge,1,-1],[w-edge,h-edge,-1,-1]];
 const out=new Set(state?.edges||[]);
 return <svg className={`coach-framing-guide is-${status}`} data-shape={shape} data-status={status} aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
  <g className="coach-framing-corners" strokeWidth={stroke*1.6} fill="none" strokeLinecap="round">
   {corners.map(([cx,cy,dx,dy],i)=><path key={i} d={`M${cx} ${cy+dy*arm} L${cx} ${cy} L${cx+dx*arm} ${cy}`}/>)}
  </g>
  <g className="coach-framing-edges" strokeWidth={stroke*2.4} strokeLinecap="round">
   {out.has('top')&&<line x1={edge} y1={edge} x2={w-edge} y2={edge}/>}
   {out.has('bottom')&&<line x1={edge} y1={h-edge} x2={w-edge} y2={h-edge}/>}
   {out.has('left')&&<line x1={edge} y1={edge} x2={edge} y2={h-edge}/>}
   {out.has('right')&&<line x1={w-edge} y1={edge} x2={w-edge} y2={h-edge}/>}
  </g>
  <g className="coach-framing-body" transform={`translate(${x} ${y}) scale(${scale})`} strokeWidth={stroke/scale} strokeDasharray={`${stroke*4/scale} ${stroke*3/scale}`} strokeLinejoin="round">
   <circle cx={s.head[0]} cy={s.head[1]} r={s.head[2]}/>
   <path d={s.body}/>
   {s.arm&&<path d={s.arm}/>}
   {s.floorLine&&<line className="coach-framing-floor" x1="4" y1={s.floorLine} x2={s.w-4} y2={s.floorLine}/>}
  </g>
 </svg>;
}
