import React,{useId} from 'react';
import {MOTIONS,samplePose} from './motions.js';
export default function MotionFigure({exercise,progress=0,mirror=false}){
 const labelId=useId(),motion=MOTIONS[exercise.motion_id];if(!motion)return <span>동작 안내 준비 중</span>;
 const points=samplePose(exercise.motion_id,progress);
  const bone=(a,b,color,width=15,key='')=><line key={key || `${a}-${b}`} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke={color} strokeWidth={width} strokeLinecap="round"/>;
 return <svg viewBox="0 0 360 330" role="img" aria-labelledby={labelId} className="motion-svg">
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
          {[[1,5],[5,6],[2,9],[9,10]].map(([a,b])=>bone(a,b,'#9eb9da',14))}
          {bone(1,2,'#2266b0',32)}
          {bone(0,1,'#c69170',12)}
          {[[1,3],[3,4]].map(([a,b])=>bone(a,b,'#4289d2',15))}
          {[[2,7],[7,8]].map(([a,b])=>bone(a,b,'#244b79',19))}
          {[3,7,9].map(i=><circle key={i} cx={points[i][0]} cy={points[i][1]} r="5" fill="#e8f2fd"/>)}
          <circle cx={points[0][0]} cy={points[0][1]} r="21" fill="#d9ab89"/>
          <path d={`M${points[0][0]-19} ${points[0][1]-6}q19 -30 39 0`} stroke="#24415f" strokeWidth="9" fill="none"/>
          <circle cx={points[0][0]+9} cy={points[0][1]} r="2" fill="#24415f"/>
          {[8,10].map(i=><path key={i} d={`M${points[i][0]-5} ${points[i][1]+2}h18`} stroke="#1a344f" strokeWidth="10" strokeLinecap="round"/>)}
          {['dumbbell','bench_dumbbell'].includes(motion.prop) && [4,6].map(i=><g key={i} transform={`translate(${points[i]})`}><path d="M-13 0H13" stroke="#344861" strokeWidth="5"/><path d="M-13 -8V8M13 -8V8" stroke="#344861" strokeWidth="7" strokeLinecap="round"/></g>)}
          {['barbell','bench_barbell'].includes(motion.prop)&&<path d={`M${points[4][0]-18} ${points[4][1]}L${points[6][0]+18} ${points[6][1]}`} stroke="#344861" strokeWidth="8"/>}
        </g>
      </svg>;
}
