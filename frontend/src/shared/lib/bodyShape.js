// Providers must not return invented reconstruction results. No default upload endpoint.
export class DisabledBodyShapeProvider{
 status(){return {state:'disabled',storesPhotos:false};}
 async estimate(){throw Error('신체 재구성 모델이 연결되지 않았습니다.');}
 async delete(){return {deleted:true,stored:false};}
}
export class LocalBodyShapeProvider extends DisabledBodyShapeProvider{
 constructor(infer){super();this.infer=infer;}
 status(){return {state:this.infer?'configured_not_verified':'disabled',storesPhotos:false};}
 async estimate(photo,{consent=false}={}){if(!consent)throw Error('사진 분석 동의가 필요합니다.');if(!this.infer)return super.estimate();return this.infer(photo);}
}
export class RemoteBodyShapeProvider extends DisabledBodyShapeProvider{
 constructor(adapter){super();this.adapter=adapter;}
 status(){return {state:this.adapter?'configured_not_verified':'disabled',storesPhotos:false};}
 async estimate(photo,{consent=false,uploadConsent=false,saveOriginal=false}={}){
  if(!consent||!uploadConsent)throw Error('서버 전송에 별도 동의가 필요합니다.');
  if(!this.adapter)return super.estimate();
  return this.adapter.estimate(photo,{saveOriginal,retention:saveOriginal?'explicit_policy_required':'delete_after_inference'});
 }
 async delete(id){if(!this.adapter)return super.delete();return this.adapter.delete(id);}
}
export const bodyShapeProvider=new DisabledBodyShapeProvider();
