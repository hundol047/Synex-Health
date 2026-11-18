import React from 'react';

export function legRollerPosition(points, curl) {
  const [kx, ky] = points[7];
  const dx = points[8][0] - kx, dy = points[8][1] - ky;
  const length = Math.hypot(dx, dy);
  // The pad bears on the shin for extension and on the back of the ankle for curls.
  const offset = curl ? -13 : 13;
  const x = kx + .80 * dx + offset * dy / length;
  const y = ky + .80 * dy - offset * dx / length;
  return [x, y];
}

export function LegMachine({knee: [kx, ky], roller: [x, y], curl}) {
  return <g data-machine={curl ? 'seated-leg-curl' : 'leg-extension'} strokeLinejoin="round">
    <path d="M72 299V153Q72 142 83 142H101V299" fill="#dce8eb" stroke="#607781" strokeWidth="4"/>
    {[231,242,253,264,275].map(y => <path key={y} d={`M79 ${y}h15`} stroke="#70868e" strokeWidth="6"/>)}
    <path d="M59 299H239M93 299l55-93h49l17-6M163 207l40 90" fill="none" stroke="#71858d" strokeWidth="7" strokeLinecap="round"/>
    <path d="M130 126l5 73h64" fill="none" stroke="#294852" strokeWidth="13" strokeLinecap="round"/>
    <path d="M136 201h62" stroke="#528578" strokeWidth="8" strokeLinecap="round"/>
    {curl && <path d="M158 187l32 4" stroke="#45696b" strokeWidth="13" strokeLinecap="round"/>}
    <path d={`M${kx} ${ky}L${x} ${y}`} stroke="#526b77" strokeWidth="7"/>
    <circle cx={kx} cy={ky} r="9" fill="#cbd7d9" stroke="#526b77" strokeWidth="3"/>
    <path d={`M${x-15} ${y+5}L${x} ${y}`} stroke="#314b55" strokeWidth="18" strokeLinecap="round"/>
    <path d="M150 184l15-4m6 0 11-3" stroke="#33545a" strokeWidth="6" strokeLinecap="round"/>
  </g>;
}

export function CableMachine({motionId, points}) {
  const left = points[4], right = points[6];
  const overhead = motionId === 'lat_pulldown';
  const facePull = motionId === 'cable_face_pull';
  const pulley = overhead ? [205, 13] : [305, facePull ? 91 : 34];
  const center = [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
  const dx = pulley[0] - center[0], dy = pulley[1] - center[1];
  const length = Math.hypot(dx, dy);
  const reach = Math.min(overhead ? 6 : 23, length / 2);
  const joint = [center[0] + reach * dx / length, center[1] + reach * dy / length];
  return <g data-machine={motionId} strokeLinecap="round" strokeLinejoin="round">
    {overhead && <g data-seat="pulldown">
      <path d="M115 298h135m-103-2 12-88m69 88-1-107h-25" fill="none" stroke="#71858d" strokeWidth="7"/>
      <path d="M132 208h58" stroke="#34535c" strokeWidth="12"/>
      <path d="M169 183l30 5" stroke="#4a726f" strokeWidth="12"/>
    </g>}
    <path d={overhead ? 'M311 296V13H205' : 'M311 296V30'} fill="none" stroke="#788d96" strokeWidth="8"/>
    <path d="M290 299h41" stroke="#526b77" strokeWidth="7"/>
    <path d={`M311 ${pulley[1]}H${pulley[0]}L${joint}`} fill="none" stroke="#637984" strokeWidth="3"/>
    <circle cx={pulley[0]} cy={pulley[1]} r="6" fill="#d5e2e3" stroke="#526b77" strokeWidth="3"/>
    <path d={`M${left}L${joint}L${right}`} fill="none" stroke={overhead ? '#506570' : '#967148'} strokeWidth={overhead ? 5 : 4}/>
    {overhead && <path d={`M${left[0]-10} ${left[1]+4}L${left}M${right}l10 4`}
      fill="none" stroke="#354d55" strokeWidth="5"/>}
    {[left, right].map(([x,y], side) => <circle data-cable-grip="" key={side} cx={x} cy={y} r="5" fill="#304c54"/>)}
  </g>;
}

export function GrippingHand({wrist, elbow, far}) {
  const angle = Math.atan2(wrist[1]-elbow[1], wrist[0]-elbow[0]) * 180 / Math.PI;
  return <g transform={`translate(${wrist}) rotate(${angle})`}>
    <path d="M-4 -4Q-1 -7 2 -6L6 -5Q9 -4 9 -1L8 3Q7 5 3 5L-3 4Z"
      fill={far ? '#be8a70' : '#dfa98b'} stroke={far ? '#9f705e' : '#b88068'} strokeWidth=".8"/>
    <path d="M0 -3Q3 -5 6 -2M4 2l4 .5" fill="none" stroke={far ? '#9f705e' : '#b88068'} strokeWidth="1.1" strokeLinecap="round"/>
  </g>;
}

export function ArmLeverMachine({motionId, points, pivots}) {
  const row = motionId === 'machine_row';
  return <g data-machine={motionId} strokeLinecap="round" strokeLinejoin="round">
    <path d="M78 299h217m-156-3 10-89h54" fill="none" stroke="#6c8089" strokeWidth="7"/>
    <path d="M128 205h63" stroke="#2e5056" strokeWidth="13"/>
    {row ? <>
      <path d="M250 296l-64-99-9-60" fill="none" stroke="#6c8089" strokeWidth="6"/>
      <path data-support="chest" d="M173 127l-2 29" stroke="#375d60" strokeWidth="12"/>
    </> : <>
      <path d="M94 296V57q0-9 10-9h112" stroke="#657c85" strokeWidth="7" fill="none"/>
      <path data-support="back" d="M136 116l-4 74" stroke="#375d60" strokeWidth="13"/>
    </>}
    {[6,4].map((wrist,i) => {
      const pivot = pivots[i], [x,y] = points[wrist];
      return <g key={wrist}>
        {row && <path d={`M${pivot[0]-18} 297L${pivot}`} stroke="#738790" strokeWidth="7"/>}
        <path d={`M${pivot}L${x} ${y}`} stroke={i ? '#58737d' : '#90a4a9'} strokeWidth="5.5"/>
        <circle cx={pivot[0]} cy={pivot[1]} r="5.5" fill="#c9d9d8" stroke="#49656c" strokeWidth="2"/>
        <g data-handle={wrist} transform={`translate(${x} ${y})`}>
          <path d="M0 -9v18" stroke="#26494d" strokeWidth="7"/>
          <path d="M0 -8v2m0 11v2" stroke="#72a89a" strokeWidth="4"/>
        </g>
      </g>;
    })}
  </g>;
}

export function HipAbductionMachine({points}) {
  return <g data-machine="machine_hip_abduction" strokeLinecap="round" strokeLinejoin="round">
    <path d="M102 299h136m-81-5 5-66m21 66-5-66" stroke="#687e87" strokeWidth="7" fill="none"/>
    <rect x="138" y="115" width="64" height="99" rx="14" fill="#3e6066" stroke="#2b464e" strokeWidth="3"/>
    <rect x="131" y="213" width="78" height="14" rx="7" fill="#578079" stroke="#34535a" strokeWidth="2"/>
    {[7,9].map((knee,i) => {
      const side = i ? 1 : -1;
      const [x,y] = points[knee], [ankle,footY] = points[knee + 1];
      const padX = x + 13 * side;
      const [handX,handY] = points[i ? 6 : 4];
      return <g key={knee}>
        <path d={`M${170 + side * 13} 237L${padX} ${y}v12L${ankle + side * 10} ${footY+9}`}
          stroke="#6c838a" strokeWidth="5" fill="none"/>
        <path d={`M${ankle-13} ${footY+10}h26`} stroke="#3c535b" strokeWidth="5"/>
        <rect data-knee-pad={knee} x={padX-5} y={y-12} width="10" height="24" rx="5" fill="#568d83" stroke="#315653" strokeWidth="2"/>
        <circle cx={170+side*13} cy="237" r="5" fill="#b0c8c8" stroke="#506973" strokeWidth="2"/>
        <path d={`M${170+side*30} 222L${handX} ${handY}`} stroke="#687e87" strokeWidth="5"/>
        <path d={`M${handX} ${handY-5}v12`} stroke="#324e54" strokeWidth="7"/>
      </g>;
    })}
  </g>;
}

export function FrontalHead() {
  return <>
    <path d="M-16 -6Q-17 -20 0 -21Q18 -20 16 -4L14 9Q10 19 0 21Q-11 19 -14 9Z" fill="#dba687"/>
    <path d="M-16 1Q-23 -19 -7 -23Q12 -30 18 -14L16 1L12 -10Q3 -6 -9 -12L-13 -6Z" fill="#322c2c"/>
    <path d="M-10 -4q3-2 6 0m8 0q3-2 6 0" stroke="#543c35" strokeWidth="1.8" fill="none"/>
    <g fill="#322c2c"><circle cx="-7" cy="0" r="1.6"/><circle cx="7" cy="0" r="1.6"/></g>
    <path d="M0 1l-2 6h3m-6 5q5 3 10 0" fill="none" stroke="#ad765e" strokeWidth="1.3"/>
  </>;
}
