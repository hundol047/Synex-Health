import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HealthAPI } from '../../shared/lib/api.js';
import { Card, ErrorState } from '../../shared/components/ui.jsx';
const SEGMENTS=[['LEFT_ARM','왼팔'],['RIGHT_ARM','오른팔'],['TRUNK','몸통'],['LEFT_LEG','왼다리'],['RIGHT_LEG','오른다리']];
const FIELDS=[['weight','체중 (kg)'],['height','키 (cm)'],['skeletal_muscle_mass','골격근량 (kg)'],['body_fat_percentage','체지방률 (%)']];
const OPTIONAL=[['chest_circumference','가슴둘레 (cm)',30,250],['waist_circumference','허리둘레 (cm)',30,250],['hip_circumference','엉덩이둘레 (cm)',30,250],['bone_mass','추정 골량 (kg)',0,20],['mineral_mass','무기질량 (kg)',0,20]];
const SEGMENT_FIELDS=[['lean_mass_kg','근육 분석 값 (kg)','예: 2.7'],['lean_reference_percent','기준 대비 (%)','예: 90'],['fat_mass_kg','체지방량 (kg) · 선택','예: 0.8']];
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export default function MeasurementEntry(){
  const [form,setForm]=useState({measurement_date:localDate()});
  useEffect(()=>{if(window.location.hash==='#segment-measurements')document.getElementById('segment-measurements')?.scrollIntoView?.({block:'center'});},[]);
  const [segments,setSegments]=useState({});
  const [saving,setSaving]=useState(false),[error,setError]=useState(null),[saved,setSaved]=useState(false);
  async function submit(e){
    e.preventDefault();setSaving(true);setError(null);setSaved(false);
    const number=v=>v==null||v===''?null:Number(v);
    try {
      const payload={measurement_date:form.measurement_date,device_name:'사용자 입력',...Object.fromEntries([...FIELDS,...OPTIONAL].map(([key])=>[key,number(form[key])])),
        segments:SEGMENTS.filter(([id])=>Object.values(segments[id]||{}).some(v=>v!=='')).map(([id])=>({segment:id,...Object.fromEntries(Object.entries(segments[id]||{}).map(([k,v])=>[k,number(v)]))}))};
      if(payload.weight==null || payload.skeletal_muscle_mass==null) throw new Error('체중과 골격근량을 입력하세요.');
      await HealthAPI.createMeasurement(payload);setSaved(true);
    }catch(err){setError(err);}finally{setSaving(false);}
  }
  return <Card title="체성분 측정값 등록">
    <p className="muted">인바디 결과지를 보며 같은 이름의 값을 옮겨 적으세요. 체중과 전신 근육량은 필수이며, 결과지에 없는 선택 항목은 비워두세요.</p>
    <form onSubmit={submit}>
      <h3 className="measurement-section-title">전신 근육량과 체지방</h3>
      <div className="measurement-grid">
        <label>측정일<input className="text-input" type="date" required max={localDate()} value={form.measurement_date} onChange={e=>setForm({...form,measurement_date:e.target.value})}/></label>
        {FIELDS.map(([key,label])=><label key={key}>{key==='skeletal_muscle_mass'&&<strong className="measurement-field-title">전신 근육량</strong>}{label}<input aria-label={label} aria-describedby={key==='skeletal_muscle_mass'?'whole-muscle-help':undefined} className="text-input" type="number" step="any" min={key==='height'?50:0} max={key==='body_fat_percentage'?100:key==='height'?250:undefined} required={['weight','skeletal_muscle_mass'].includes(key)} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/>{key==='skeletal_muscle_mass'&&<small id="whole-muscle-help" className="measurement-field-help">몸을 움직이는 근육의 무게예요. 결과지의 ‘골격근량’을 입력하세요.</small>}</label>)}
      </div>
      <details className="measurement-shape-inputs"><summary>내 체형 맞추기 · 둘레와 골량 (선택)</summary>
       <p className="muted">가슴·허리·엉덩이 둘레는 줄자로 직접 재서 입력하세요. 골량은 뼈와 관련된 값이고, 골격근량은 근육의 무게입니다. ‘추정 골량’과 ‘무기질량’도 서로 다른 항목이니 결과지에 같은 이름이 있을 때만 입력하세요.</p>
       <div className="measurement-grid">{OPTIONAL.map(([key,label,min,max])=><label key={key}>{label}<input className="text-input" type="number" step=".1" min={min} max={max} value={form[key]??''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}</div>
      </details>
      <details id="segment-measurements" className="measurement-segment-section" open={typeof window!=='undefined'&&window.location.hash==='#segment-measurements'?true:undefined}><summary>팔·다리 근육 분석 입력 (선택)</summary>
        <div className="measurement-entry-guide" id="segment-entry-help">
         <strong>결과지의 ‘부위별 근육 분석’을 찾으세요</strong>
         <p>‘부위별 근육분석’ 또는 ‘부위별 제지방’ 항목에서 팔·다리·몸통에 적힌 kg와 %를 입력하세요. 장비마다 이름이 다를 수 있으니 같은 항목인지 확인해 주세요.</p>
         <p><b>제지방이란?</b> 지방을 제외한 부분의 무게예요. 근육과 수분 등 다른 조직도 포함하므로, 위에 입력하는 전신 골격근량과는 다른 값입니다.</p>
         <p><b>입력 예시:</b> 왼팔에 2.7 kg, 90%가 적혀 있다면 그대로 입력하세요. 100%는 결과지의 기준값이며, 90%는 그 기준보다 10% 적다는 뜻입니다. 사람들의 평균과는 다릅니다.</p>
        </div>
        <div className="measurement-segment-cards">{SEGMENTS.map(([id,label])=><fieldset className="measurement-segment-card" key={id}><legend>{label}</legend><div>{SEGMENT_FIELDS.map(([key,name,example])=><label key={key}><span>{name}</span><input aria-label={`${label} ${name}`} aria-describedby="segment-entry-help" className="text-input" type="number" min="0" max={key==='lean_reference_percent'?1000:undefined} step="any" placeholder={example} value={segments[id]?.[key]??''} onChange={e=>setSegments({...segments,[id]:{...segments[id],[key]:e.target.value}})}/></label>)}</div></fieldset>)}</div>
        <p className="measurement-field-help">부위별 체지방량은 결과지에 kg로 표시된 경우에만 입력하세요. 체지방률(%)을 kg 칸에 넣지 마세요. 모르는 값은 0 대신 빈칸으로 두세요.</p>
      </details>
      {error&&<ErrorState message={error.message}/>}
      {saved&&<p role="status">측정값을 저장했습니다. <Link className="btn btn-primary" to="/health/body">내 3D 마네킹 보기</Link> 기존 루틴이 있으면 새 측정값으로 재검토됩니다. <Link to="/health/routine">운동 계획 확인</Link></p>}
      <button className="btn btn-primary" disabled={saving}>{saving?'저장 중...':'측정값 저장'}</button>
    </form>
  </Card>;
}
