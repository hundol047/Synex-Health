import React from 'react';
import {poseJoints,BONES} from './rig.js';

// Local fallback derived from the same joint pose when WebGL is unavailable.
export default function StretchDiagram({motion,progress,mirror}){
 const joints=poseJoints(motion,progress),points=joints.map(([x,y,z])=>[(mirror?-x:x)*.75-z*.65,y]);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,height=Math.max(...ys)-minY,scale=220/Math.max(width,height,.5);
 const project=i=>[150+(points[i][0]-minX-width/2)*scale,260-(points[i][1]-minY)*scale];
 return <div><svg viewBox="0 0 300 300" role="img" aria-label="3D를 사용할 수 없어 표시하는 스트레칭 관절 안내" style={{width:'100%',maxHeight:360,background:'#eff6ff',borderRadius:16}}><g stroke="#3677bd" strokeWidth="11" strokeLinecap="round">{BONES.filter(([a,b])=>a!==1||b!==2).map(([a,b])=>{const p=project(a),q=project(b);return <line key={a+'-'+b} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]}/>;})}</g><circle cx={project(2)[0]} cy={project(2)[1]} r="15" fill="#92b9df"/></svg><p>이 기기에서는 3D 화면을 열 수 없어 관절 모션으로 안내합니다.</p></div>;
}
