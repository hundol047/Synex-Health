import React from 'react';
export const BODY_NOTICE='본 3D 모델은 체성분 데이터를 기반으로 생성된 설명용 시각화이며 실제 신체 스캔이나 의료용 해부학 모델이 아닙니다.';
export default function BodyTools({layer,setLayer,slice,setSlice}){return <div className="body-tools">
  <div className="motion-controls" aria-label="설명용 레이어">{[['body','체형'],['muscle','근육 분석 부위'],['fat','체지방 부위'],['skeleton','관절선']].map(([id,label])=><button key={id} className="btn btn-ghost" aria-pressed={layer===id} onClick={()=>setLayer(id)}>{label}</button>)}</div>
  <p className="muted">{layer==='skeleton'?'관절 축을 단순화한 선입니다. 실제 골격·뼈 형상을 표시하지 않습니다.':layer==='muscle'?'결과지의 근육 분석 값을 측정한 부위를 보여줍니다. 이 값은 근육과 수분 등 지방을 제외한 조직의 무게(제지방량)입니다.':layer==='fat'?'지방 측정 부위를 표면에 표시합니다. 실제 피하지방 층의 두께가 아닙니다.':BODY_NOTICE}</p>
  <label><input type="checkbox" checked={slice.enabled} onChange={e=>setSlice({...slice,enabled:e.target.checked})}/> 단면 보기</label>
  {slice.enabled&&<><label>단면 방향 <select value={slice.axis} onChange={e=>setSlice({...slice,axis:e.target.value,position:0})}><option value="horizontal">가로 단면</option><option value="sagittal">세로 단면 · 좌우로 나누기</option><option value="coronal">세로 단면 · 앞뒤로 나누기</option></select></label><label>단면 위치 <input type="range" min="-1.3" max="1.3" step=".01" value={slice.position} onChange={e=>setSlice({...slice,position:Number(e.target.value)})}/></label><button className="btn btn-ghost" onClick={()=>setSlice({enabled:false,axis:'horizontal',position:0})}>단면 초기화</button><p className="muted">3D 모형의 표면을 잘라 보는 기능입니다. 내부 장기·조직 단면 데이터는 없습니다.</p></>}
</div>;}
