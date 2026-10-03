// Providers must not return invented reconstruction results. No default upload endpoint.
export function bodyShapeEstimate(result,source){
 if(!result||typeof result!=='object'||!Number.isFinite(result.confidence)||result.confidence<0||result.confidence>1)throw Error('모델 결과와 신뢰도를 확인할 수 없습니다.');
 if(source==='remote'&&typeof result.photo_retained!=='boolean')throw Error('서버 사진 보관 상태를 확인할 수 없습니다.');
 return {...result,source,generated_at:new Date().toISOString(),photo_retained:source==='local'?false:result.photo_retained};
}
// Future multiview input: {front, side, rear?}; single-photo adapters remain compatible.
export function multiViewPhotos({front,side,rear}={}){
 if(!front||!side)throw Error('정면과 측면 사진이 필요합니다.');
 return {front,side,...(rear?{rear}:{})};
}
export class DisabledBodyShapeProvider{
 status(){return {state:'disabled',storesPhotos:false};}
 async estimate(){throw Error('신체 재구성 모델이 연결되지 않았습니다.');}
 async delete(){return {deleted:true,stored:false};}
}
export class LocalBodyShapeProvider extends DisabledBodyShapeProvider{
 constructor(infer){super();this.infer=infer;}
 status(){return {state:this.infer?'configured_not_verified':'disabled',storesPhotos:false};}
 async estimate(photo,{consent=false}={}){if(!consent)throw Error('사진 분석 동의가 필요합니다.');if(!this.infer)return super.estimate();return bodyShapeEstimate(await this.infer(photo),'local');}
}
export class RemoteBodyShapeProvider extends DisabledBodyShapeProvider{
 constructor(adapter){super();this.adapter=adapter;}
 status(){return {state:this.adapter?'configured_not_verified':'disabled',storesPhotos:false};}
 async estimate(photo,{consent=false,uploadConsent=false,saveOriginal=false}={}){
  if(!consent||!uploadConsent)throw Error('서버 전송에 별도 동의가 필요합니다.');
  if(!this.adapter)return super.estimate();
  const result=await this.adapter.estimate(photo,{saveOriginal,retention:saveOriginal?'explicit_policy_required':'delete_after_inference'});
  if(!saveOriginal&&result?.photo_retained!==false)throw Error('사진 삭제를 확인할 수 없습니다.');
  return bodyShapeEstimate(result,'remote');
 }
 async delete(id){if(!this.adapter)return super.delete();return this.adapter.delete(id);}
}
export const bodyShapeProvider=new DisabledBodyShapeProvider();
