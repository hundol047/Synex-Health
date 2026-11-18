import React,{useId} from 'react';
import {MOTIONS,samplePose} from './motions.js';
export default function MotionFigure({exercise,progress=0,mirror=false}){
 const labelId=useId(),motion=MOTIONS[exercise.motion_id];if(!motion)return <span>동작 안내 준비 중</span>;
 const points=samplePose(exercise.motion_id,progress);
  // Rounded, tapered contours rotate with each segment of the sampled pose.
  const limb = (a,b,upper,lower,fill,key) => {
    const [x,y]=points[a], dx=points[b][0]-x, dy=points[b][1]-y, len=Math.hypot(dx,dy);
    return <path key={key} transform={`translate(${x} ${y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`}
      d={`M0 ${-upper} Q${len*.35} ${-upper*1.13} ${len} ${-lower} A${lower} ${lower} 0 0 1 ${len} ${lower} Q${len*.4} ${upper*1.10} 0 ${upper} A${upper} ${upper} 0 0 1 0 ${-upper}Z`} fill={fill}/>;
  };
  const [hx,hy]=points[0];
  const plank=exercise.motion_id==='plank';
  const segmentAngle=(a,b)=>Math.atan2(points[b][1]-points[a][1],points[b][0]-points[a][0])*180/Math.PI;
  const atSegment=(a,b)=>`translate(${points[a]}) rotate(${segmentAngle(a,b)})`;
  const palm=(w,color)=><path transform={`translate(${points[w]})`} fill={color} d="M3 -3Q-3 -6 -10 -3L-19 1Q-20 4 -14 4L-3 4Q3 4 3 -3Z"/>;

 return <svg viewBox={plank?"8 160 344 175":"0 0 360 330"} role="img" aria-labelledby={labelId} className="motion-svg">
        <title id={labelId}>{exercise.exercise_name} 동작 시범</title>
        <ellipse cx="183" cy="308" rx="124" ry="9" fill="#dae5f3"/>
        <path d="M30 301H330" stroke="#c6d5e8" strokeWidth="2"/>
        <g transform={mirror ? 'translate(360 0) scale(-1 1)' : undefined}>
          {motion.prop==='chair' && <path d="M89 222H158M96 222V298M153 222V298M89 222V158" fill="none" stroke="#94a3b8" strokeWidth="8"/>}
          {['seat','high_cable','low_cable'].includes(motion.prop) && <path d="M119 207H178M125 207V297M174 207V297M119 207V129" fill="none" stroke="#94a3b8" strokeWidth="8"/>}
          {motion.prop==='wall' && <path d="M291 40V301" stroke="#94a3b8" strokeWidth="12"/>}
          {motion.prop==='mat' && <rect x="26" y="294" width="301" height="6" rx="3" fill="#b6cce8"/>}
          {motion.prop==='support' && <path d="M105 139H134M110 139V301" stroke="#94a3b8" strokeWidth="6"/>}
          {motion.prop==='band' && <><path d="M310 53V299" stroke="#94a3b8" strokeWidth="7"/><path d={`M310 114L${points[4]}M310 114L${points[6]}`} stroke="#f59e0b" strokeWidth="4" fill="none"/></>}
          {motion.prop==='back_wall'&&<path d="M126 53V301" stroke="#94a3b8" strokeWidth="9"/>}
          {motion.prop?.startsWith('bench_')&&<path d="M42 199H220M63 199V298M203 199V298" fill="none" stroke="#94a3b8" strokeWidth="10"/>}
          {motion.prop==='leg_press'&&<><path d="M82 173L161 255H204" fill="none" stroke="#94a3b8" strokeWidth="10"/><path d={`M${points[8][0]-12} ${points[8][1]-14}l40 40`} stroke="#64748b" strokeWidth="10"/></>}
          {['high_cable','low_cable','side_cable'].includes(motion.prop)&&<><path d="M311 30V300" stroke="#94a3b8" strokeWidth="8"/><path d={`M311 ${motion.prop==='high_cable'?35:motion.prop==='low_cable'?240:130}L${points[4]}`} stroke="#f59e0b" strokeWidth="3"/></>}
          {motion.prop==='treadmill'&&<path d="M72 307H299M298 306V152H258" fill="none" stroke="#64748b" strokeWidth="8"/>}
          {motion.prop==='bike'&&<><circle cx="216" cy="266" r="27" fill="none" stroke="#94a3b8" strokeWidth="8"/><path d="M146 198V301H272M247 151V236L216 266" fill="none" stroke="#94a3b8" strokeWidth="8"/></>}
          {motion.prop==='elliptical'&&<path d="M72 307H298M118 286L100 134M226 286L243 134" fill="none" stroke="#94a3b8" strokeWidth="7"/>}
          {limb(1,5,9,6,'#aa7862')}{limb(5,6,6,4,'#b98770')}{plank && palm(6,'#b98770')}
          {[[9,10,'#273c4a'],[7,8,'#405768']].map(([k,f,col])=><g key={k}>
            {limb(2,k,14,9,col)}{limb(k,f,9,5,col)}
            <g transform={`translate(${points[f]}) rotate(${plank?105:0})`}>
              <path d="M-5 -5q8 0 14 5l10 3q4 7 -4 7h-23q-3 -7 3 -15Z" fill="#49766e" stroke="#345753" strokeWidth="1.5"/>
              <path d="M-7 8q14 2 26 -1" fill="none" stroke="#d8e8df" strokeWidth="2.5"/>
              <path d="m2 -3 -2 4m6 -2 -2 4" stroke="#d6e8db" strokeWidth="1.7"/>
            </g>
          </g>)}
          {limb(0,1,7,9,'#c89276')}{limb(1,2,20,15,'#147d76')}
          <g transform={atSegment(1,2)}>
            <path d="M5 -12Q25 -15 43 -9" fill="none" stroke="#9ccfbb" strokeWidth="2"/>
          </g>
          {limb(1,3,10,7,'#ce9779')}{limb(3,4,7,4.5,'#dca989')}
          <g transform={atSegment(1,3)}><path d="M-3 -11Q4 -15 12 -10L18 -9L17 10L4 12Q-11 10 -10 1Q-10 -8 -3 -11Z" fill="#135e5c"/></g>
          {plank && palm(4,'#dca989')}
          <g transform={`translate(${hx} ${hy}) ${plank?`rotate(${segmentAngle(1,0)+90}) scale(-1 1)`:''}`}>
            <path d="M-15 -9Q-14 -22 2 -21Q18 -20 18 -6L21 2L17 4Q17 17 8 20Q-6 22 -13 10Z" fill="#dba687"/>
            <path d="M-15 5Q-23 -9 -13 -20Q-2 -29 13 -19L18 -15Q14 -8 5 -10Q-4 -13 -8 -5L-9 4Z" fill="#322c2c"/>
            <path d="M8 -5Q12 -7 16 -5" fill="none" stroke="#543c35" strokeWidth="2"/>
            <ellipse cx="13" cy="-2" rx="1.8" ry="2" fill="#322c2c"/>
            <path d="M11 10q3 1 6 -1" fill="none" stroke="#a3685f" strokeWidth="1.4"/>
          </g>
          {['dumbbell','bench_dumbbell'].includes(motion.prop) && [4,6].map(i=><g key={i} transform={`translate(${points[i]})`}><path d="M-13 0H13" stroke="#344861" strokeWidth="5"/><path d="M-13 -8V8M13 -8V8" stroke="#344861" strokeWidth="7" strokeLinecap="round"/></g>)}
          {['barbell','bench_barbell'].includes(motion.prop)&&<path d={`M${points[4][0]-18} ${points[4][1]}L${points[6][0]+18} ${points[6][1]}`} stroke="#344861" strokeWidth="8"/>}
        </g>
      </svg>;
}
