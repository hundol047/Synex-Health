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
