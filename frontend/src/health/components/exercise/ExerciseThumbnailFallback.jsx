import React, { useId, useMemo } from 'react';
import { MOTIONS } from './motions.js';
import { poseJoints } from './rig.js';

// A still, orthographic illustration of the same authored rig as the 3D stage.
// The catalogue never allocates one WebGL context or animation loop per card.
function projectedPose(id) {
  const source = poseJoints(id, .40);
  const side = MOTIONS[id]?.view?.includes('측면');
  const raw = source.map(([x, y, z]) => [side ? z * .94 + x * .32 : x * .94 + z * .32, -y]);
  const low = [Math.min(...raw.map(p => p[0])), Math.min(...raw.map(p => p[1]))];
  const high = [Math.max(...raw.map(p => p[0])), Math.max(...raw.map(p => p[1]))];
  const scale = Math.min(190 / Math.max(.7, high[0] - low[0]), 185 / Math.max(.7, high[1] - low[1]));
  const center = (high[0] + low[0]) / 2;
  return { points: raw.map(([x, y]) => [140 + (x - center) * scale, 225 + (y - high[1]) * scale]), scale };
}

function Limb({ a, b, width, color, outline = '#173f4b' }) {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length, ny = dx / length, radius = width / 2;
  const p = (point, amount) => `${point[0] + nx * amount},${point[1] + ny * amount}`;
  const path = `M${p(a, radius)} L${p(b, radius * .76)} Q${b[0] + dx / length * radius * .7},${b[1] + dy / length * radius * .7} ${p(b, -radius * .76)} L${p(a, -radius)} Q${a[0] - dx / length * radius},${a[1] - dy / length * radius} ${p(a, radius)}Z`;
  return <path d={path} fill={color} stroke={outline} strokeWidth=".7" strokeOpacity=".18"/>;
}

export default function ExerciseThumbnailFallback({ exercise }) {
  const uid = useId().replace(/:/g, ''), motion = MOTIONS[exercise.motion_id];
  const { points: p, scale } = useMemo(() => projectedPose(exercise.motion_id), [exercise.motion_id]);
  if (!motion) return <span className="exercise-preview-unavailable">동작 안내 준비 중</span>;
  const shirt = `url(#shirt-${uid})`, skin = `url(#skin-${uid})`, leg = '#bb8e70';
  const bodyWidth = scale * .14, headRadius = scale * .09;
  const torso = `M${p[3]} Q${p[1][0]},${p[1][1] - scale * .04} ${p[6]} L${p[12][0] - scale * .03},${p[12][1]} Q${p[0][0]},${p[0][1] + scale * .055} ${p[9][0] + scale * .03},${p[9][1]}Z`;
  const shorts = `M${p[9][0] + scale * .07},${p[9][1] - scale * .08} L${p[12][0] - scale * .07},${p[12][1] - scale * .08} L${p[12][0] - scale * .06},${p[12][1] + scale * .13} L${p[0][0]},${p[0][1] + scale * .14} L${p[9][0] + scale * .06},${p[9][1] + scale * .13}Z`;
  return <svg viewBox="0 0 280 270" className="exercise-thumbnail" role="img" aria-label={`${exercise.exercise_name || exercise.name} 대표 자세`}>
    <defs>
      <radialGradient id={`stage-${uid}`}><stop stopColor="#f5fbf7"/><stop offset="1" stopColor="#d9e9e5"/></radialGradient>
      <linearGradient id={`shirt-${uid}`} x1="0" x2="1"><stop stopColor="#1c6370"/><stop offset=".5" stopColor="#4f9291"/><stop offset="1" stopColor="#275966"/></linearGradient>
      <linearGradient id={`skin-${uid}`} x1="0" x2="1"><stop stopColor="#d6b396"/><stop offset=".55" stopColor="#e0c0a3"/><stop offset="1" stopColor="#bc957a"/></linearGradient>
      <radialGradient id={`shadow-${uid}`}><stop stopColor="#173d45" stopOpacity=".18"/><stop offset="1" stopColor="#173d45" stopOpacity="0"/></radialGradient>
    </defs>
    <rect width="280" height="270" rx="18" fill={`url(#stage-${uid})`}/>
    <path d="M0 226H280M36 270L99 226M244 270L181 226" stroke="#aac8c2" strokeWidth=".7" opacity=".5"/>
    <ellipse cx="140" cy="230" rx="103" ry="16" fill={`url(#shadow-${uid})`}/>
    {motion?.prop === 'mat' && <path d="M31 229L230 229L261 239H19Z" fill="#6e9998" opacity=".6"/>}
    {['chair', 'seat', 'bench_dumbbell', 'bench_barbell'].includes(motion?.prop) && <g stroke="#728e96" strokeWidth="5" fill="none" strokeLinecap="round"><path d="M75 181H164M83 184V231M153 184V231"/>{!motion.prop.startsWith('bench') && <path d="M75 181V119"/>}</g>}
    {['wall', 'back_wall'].includes(motion?.prop) && <path d={motion.prop === 'wall' ? 'M243 28V230' : 'M95 35V228'} stroke="#91afa9" strokeWidth="7"/>}
    <Limb a={p[6]} b={p[7]} width={bodyWidth * .85} color="#3b6f78"/>
    <Limb a={p[7]} b={p[8]} width={bodyWidth * .65} color={leg}/>
    <Limb a={p[12]} b={p[13]} width={bodyWidth * 1.30} color="#284653"/>
    <Limb a={p[13]} b={p[14]} width={bodyWidth * .87} color={leg}/>
    <Limb a={p[1]} b={p[2]} width={bodyWidth * .70} color={skin}/>
    <path d={torso} fill={shirt} stroke="#295e65" strokeWidth=".6"/>
    <path d={shorts} fill="#244553"/>
    <Limb a={p[9]} b={p[10]} width={bodyWidth * 1.40} color="#315866"/>
    <Limb a={p[10]} b={p[11]} width={bodyWidth * .91} color={skin}/>
    <Limb a={p[3]} b={p[4]} width={bodyWidth * .88} color={shirt}/>
    <Limb a={p[4]} b={p[5]} width={bodyWidth * .68} color={skin}/>
    {[5, 8].map((index, hand) => <Limb key={index} a={p[index]} b={p[hand ? 18 : 17]} width={bodyWidth * .60} color={skin}/>)}
    <ellipse cx={p[2][0]} cy={p[2][1] - headRadius * .45} rx={headRadius * .78} ry={headRadius} fill={skin}/>
    <path d={`M${p[2][0] - headRadius * .8},${p[2][1] - headRadius * .6} Q${p[2][0] - headRadius * .65},${p[2][1] - headRadius * 1.7} ${p[2][0] + headRadius * .65},${p[2][1] - headRadius * 1.08} L${p[2][0] + headRadius * .77},${p[2][1] - headRadius * .52} Q${p[2][0]},${p[2][1] - headRadius * 1.13} ${p[2][0] - headRadius * .8},${p[2][1] - headRadius * .6}Z`} fill="#293e45"/>
    {[11, 14].map((index, foot) => <Limb key={index} a={p[index]} b={p[foot ? 16 : 15]} width={bodyWidth * .66} color="#f6f6ee" outline="#477075"/>)}
    {['dumbbell', 'bench_dumbbell'].includes(motion?.prop) && [5, 8].map(index => <g key={index} transform={`translate(${p[index]})`} fill="#264655"><rect x="-9" y="-2" width="18" height="4" rx="2"/><rect x="-12" y="-7" width="6" height="14" rx="2"/><rect x="6" y="-7" width="6" height="14" rx="2"/></g>)}
    {['barbell', 'bench_barbell'].includes(motion?.prop) && <path d={`M${p[5][0] - 14},${p[5][1]}L${p[8][0] + 14},${p[8][1]}`} stroke="#385762" strokeWidth="5" strokeLinecap="round"/>}
  </svg>;
}

