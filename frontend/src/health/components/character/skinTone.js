import {Color} from 'three';

// Cosmetic presets only: these are not skin-type or ethnicity classifications.
export const SKIN_TONES=Object.freeze([
 ['#f1d5c2','밝은 아이보리'],['#e8bfa3','밝은 피치'],
 ['#d7ad89','샌드 베이지'],['#c4967b','내추럴 베이지'],
 ['#b98160','웜 탠'],['#a66f50','골든 브라운'],
 ['#8b5942','미디엄 브라운'],['#704735','딥 브라운'],
 ['#543529','다크 브라운'],['#38261f','딥 에스프레소'],
].map(([color,label])=>Object.freeze({color,label})));

// Derive small vascular/shadow variations from the selected skin in linear
// light, rather than blending every complexion towards fixed pale pink.
export function skinDetailColors(hex){
 const skin=new Color(hex);
 const tint=(r,g,b)=>new Color().setRGB(
  Math.min(1,skin.r*r),Math.min(1,skin.g*g),Math.min(1,skin.b*b));
 return {skin,cheek:tint(1.035,.95,.94),lip:tint(.89,.66,.70),
  upperLid:tint(.65,.58,.56),lowerLid:tint(.94,.80,.78)};
}
