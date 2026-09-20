import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, ErrorState } from '../../shared/components/ui.jsx';
const SEGMENTS=[['LEFT_ARM','왼팔'],['RIGHT_ARM','오른팔'],['TRUNK','몸통'],['LEFT_LEG','왼다리'],['RIGHT_LEG','오른다리']];
const FIELDS=[['weight','체중 (kg)'],['height','키 (cm)'],['skeletal_muscle_mass','골격근량 (kg)'],['body_fat_percentage','체지방률 (%)']];
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function MeasurementEntry(){
  const [form,setForm]=useState({measurement_date:localDate()});
  const [segments,setSegments]=useState({});
  const [saving,setSaving]=useState(false),[error,setError]=useState(null),[saved,setSaved]=useState(false);
  async function submit(e){
    e.preventDefault();setSaving(true);setError(null);setSaved(false);
    const number=v=>v==null||v===''?null:Number(v);
    try {
      const payload={measurement_date:form.measurement_date,device_name:'사용자 입력',...Object.fromEntries(FIELDS.map(([key])=>[key,number(form[key])])),
        segments:SEGMENTS.filter(([id])=>Object.values(segments[id]||{}).some(v=>v!=='')).map(([id])=>({segment:id,...Object.fromEntries(Object.entries(segments[id]||{}).map(([k,v])=>[k,number(v)]))}))};
      if(payload.weight==null || payload.skeletal_muscle_mass==null) throw new Error('체중과 골격근량을 입력하세요.');
      await HealthAPI.createMeasurement(payload);setSaved(true);
    }catch(err){setError(err);}finally{setSaving(false);}
  }
  return <Card title="체성분 측정값 등록">
    <p className="muted">결과지에 적힌 수치만 입력하세요. 부위별 제지방량은 골격근량과 다른 항목입니다. 모르는 값은 비워두세요.</p>
    <form onSubmit={submit}>
      <div className="measurement-grid">
        <label>측정일<input className="text-input" type="date" required max={localDate()} value={form.measurement_date} onChange={e=>setForm({...form,measurement_date:e.target.value})}/></label>
        {FIELDS.map(([key,label])=><label key={key}>{label}<input className="text-input" type="number" step="any" min={key==='height'?50:0} max={key==='body_fat_percentage'?100:key==='height'?250:undefined} required={['weight','skeletal_muscle_mass'].includes(key)} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
      </div>
      <details style={{margin:'18px 0'}}><summary>부위별 데이터 입력 (선택)</summary>
        <div className="measurement-segment"><span>부위</span><span>제지방 kg</span><span>지방 kg</span><span>기준 대비 제지방 %</span></div>
        {SEGMENTS.map(([id,label])=><div className="measurement-segment" key={id}><span>{label}</span>{[['lean_mass_kg','제지방'],['fat_mass_kg','지방'],['lean_reference_percent','기준 대비 제지방']].map(([key,name])=><input key={key} aria-label={`${label} ${name}`} className="text-input" type="number" min="0" step="any" value={segments[id]?.[key]??''} onChange={e=>setSegments({...segments,[id]:{...segments[id],[key]:e.target.value}})}/>)}</div>)}
      </details>
      {error&&<ErrorState message={error.message}/>}
      {saved&&<p role="status">측정값을 저장했습니다. 기존 루틴이 있으면 새 측정값으로 재검토됩니다. <Link to="/health/routine">운동 계획 확인</Link></p>}
      <button className="btn btn-primary" disabled={saving}>{saving?'저장 중...':'측정값 저장'}</button>
    </form>
  </Card>;
}
