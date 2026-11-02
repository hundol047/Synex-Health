export const VTUBER_DEFAULTS=Object.freeze({
 vtuberOutfit:'casual',vtuberHair:'#9b714e',vtuberEyes:'#95652b',
 vtuberTop:'#a6ccef',vtuberBottom:'#273449',
 vtuberChest:0,vtuberHips:0,vtuberGlutes:0,vtuberWaist:0,
});
export const VTUBER_OUTFITS=Object.freeze([
 {id:'casual',name:'루즈 티 · 반바지',description:'편안한 기본 핏',nativeTop:true,nativeBottom:true},
 {id:'training',name:'티 · 레깅스',description:'가볍게 움직이는 데일리',nativeTop:true,bottomHem:.145},
 {id:'tank',name:'슬림 탱크',description:'몸에 맞는 민소매와 레깅스',topHem:1.035,sleeve:.05,bottomHem:.145},
 {id:'crop',name:'크롭 트레이닝',description:'짧은 상의와 하이웨이스트',topHem:1.145,sleeve:.05,bottomHem:.145},
 {id:'bike',name:'바이크 세트',description:'크롭 탑과 바이크 쇼츠',topHem:1.145,sleeve:.05,bottomHem:.67},
 {id:'long',name:'긴팔 트레이닝',description:'긴 소매와 레깅스',topHem:1.035,sleeve:.94,bottomHem:.145},
]);
export const VTUBER_COLOR_KEYS=['vtuberHair','vtuberEyes','vtuberTop','vtuberBottom'];
export const VTUBER_SHAPE_KEYS=['vtuberChest','vtuberHips','vtuberGlutes','vtuberWaist'];
export function normalizeVtuberOptions(value={}){
 const result={...VTUBER_DEFAULTS};
 if(VTUBER_OUTFITS.some(o=>o.id===value?.vtuberOutfit))result.vtuberOutfit=value.vtuberOutfit;
 for(const key of VTUBER_COLOR_KEYS)if(/^#[0-9a-f]{6}$/i.test(value?.[key]||''))result[key]=value[key].toLowerCase();
 for(const key of VTUBER_SHAPE_KEYS)if(Number.isFinite(value?.[key]))result[key]=Math.max(-1,Math.min(1,value[key]));
 return result;
}
