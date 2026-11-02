import React,{useState} from 'react';
import {VTUBER_OUTFITS,VTUBER_DEFAULTS} from './vtuberOptions.js';

const PALETTE=[['#9b714e','체스트넛'],['#292332','블랙'],['#ece5dc','실버'],['#d5b48a','블론드'],['#a98bda','라벤더'],['#d680a8','로즈'],['#4d8fc4','블루'],['#47988a','민트']];
const EYES=[['#95652b','브라운'],['#3d86c9','블루'],['#559873','그린'],['#9163c4','바이올렛'],['#be7f35','앰버'],['#85909d','그레이']];
export default function VtuberCustomizer({value,onChange,onFocus,onPreview}){
 const [tab,setTab]=useState('color');
 const chooseTab=id=>{setTab(id);onFocus(id==='color');};
 const picker=(key,label,swatches)=> <section className="vtuber-color-section" aria-label={label+' 선택'}>
  <h3>{label}</h3>{swatches&&<div className="vtuber-palette">{swatches.map(([color,name])=><button type="button" key={color} aria-label={`${label} ${name}`} aria-pressed={value[key]===color} onClick={()=>onChange(key,color)}><i style={{background:color}}/><span>{name}</span></button>)}</div>}
  <label className="character-color">직접 고르기<input type="color" aria-label={label} value={value[key]} onChange={e=>onChange(key,e.target.value)}/></label>
 </section>;
 return <section className="vtuber-customizer" aria-label="버튜버 꾸미기">
  <div className="vtuber-editor-heading"><h2>내 취향으로 꾸미기</h2><button type="button" className="btn btn-secondary" onClick={onPreview}>캐릭터 보기 ↑</button></div>
  <div className="character-tabs" role="group" aria-label="버튜버 꾸미기 항목">{[['color','머리·눈 색'],['shape','체형'],['outfit','의상']].map(([id,label])=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>chooseTab(id)}>{label}</button>)}</div>
  {tab==='color'&&<>{picker('vtuberHair','버튜버 머리색',PALETTE)}{picker('vtuberEyes','버튜버 눈 색',EYES)}<p className="muted">색을 고르면 바로 반영됩니다. 눈동자의 무늬와 반짝임은 유지됩니다.</p></>}
  {tab==='shape'&&<><p className="muted">0은 기본 체형입니다. 골반은 좌우 너비, 엉덩이는 뒤쪽 볼륨을 조절합니다.</p>{[
   ['vtuberChest','가슴 크기'],['vtuberHips','골반 너비'],['vtuberGlutes','엉덩이 볼륨'],['vtuberWaist','허리 너비'],
  ].map(([key,label])=><label className="character-range" key={key}>{label}<output>{value[key]>0?'+':''}{Math.round(value[key]*100)}</output><input type="range" min="-1" max="1" step=".05" aria-label={'버튜버 '+label} aria-valuetext={value[key]===0?'기본':`${value[key]>0?'크게':'작게'} ${Math.abs(Math.round(value[key]*100))}`} value={value[key]} onChange={e=>onChange(key,Number(e.target.value))}/><small>작게 <span>크게</span></small><button type="button" className="character-size-reset" onClick={()=>onChange(key,VTUBER_DEFAULTS[key])} aria-label={label+' 기본값'}>기본 크기로</button></label>)}<p className="muted">옷과 운동 자세를 유지하는 범위에서 조절됩니다. 캐릭터 외형이며 실제 체성분 기록에는 영향을 주지 않습니다.</p></>}
  {tab==='outfit'&&<><p className="muted">편안한 루즈 핏부터 몸에 맞는 크롭·탱크 스타일까지 골라 보세요.</p><div className="vtuber-outfit-grid">{VTUBER_OUTFITS.map(o=><button type="button" key={o.id} aria-pressed={value.vtuberOutfit===o.id} onClick={()=>onChange('vtuberOutfit',o.id)}><span className="vtuber-outfit-mark" aria-hidden="true">{o.id==='crop'||o.id==='bike'?'✦':o.id==='tank'?'◇':'◈'}</span><strong>{o.name}</strong><small>{o.description}</small></button>)}</div>{picker('vtuberTop','버튜버 상의 색')}{picker('vtuberBottom','버튜버 하의 색')}</>}
 </section>;
}
