import React from 'react';
export default function SetRecordEditor({rows,onChange,disabled=false}){
 function field(i,name,value){onChange(rows.map((r,j)=>j===i?{...r,[name]:value}:r));}
 return <fieldset disabled={disabled} className="set-record-editor"><legend>세트별 중량·횟수</legend>
 <p className="muted">기구 표시 중량을 같은 기준으로 입력하세요. 덤벨은 한 손 기준입니다. 맨몸·중량 미기록은 빈칸으로 두세요. 준비 세트는 운동량 합계에서 제외합니다.</p>
 {rows.map((r,i)=><div key={i} className="profile-grid"><strong>{i+1}세트</strong>
 <label>중량 kg<input className="text-input" aria-label={`${i+1}세트 중량 kg`} type="number" min="0" max="1000" step="0.1" value={r.weight_kg??''} onChange={e=>field(i,'weight_kg',e.target.value)}/></label>
 <label>횟수<input className="text-input" aria-label={`${i+1}세트 횟수`} type="number" min="0" max="1000" step="1" value={r.reps??''} onChange={e=>field(i,'reps',e.target.value)}/></label>
 <label>구분<select className="text-input" aria-label={`${i+1}세트 구분`} value={r.kind||'working'} onChange={e=>field(i,'kind',e.target.value)}><option value="working">본 세트</option><option value="warmup">준비 세트</option></select></label>
 <button type="button" className="btn btn-ghost" aria-label={`${i+1}세트 삭제`} onClick={()=>onChange(rows.filter((_,j)=>i!==j))}>삭제</button></div>)}
 <button type="button" className="btn btn-secondary" disabled={rows.length>=100} onClick={()=>onChange([...rows,{weight_kg:'',reps:'',kind:'working'}])}>세트 추가</button>
 </fieldset>;
}
