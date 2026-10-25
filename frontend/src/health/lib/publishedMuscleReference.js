// Published cohort means, not Korean/InBody norms or clinical thresholds.
// Verification route and immutable secondary transcription are documented in
// docs/PERSONAL_MANNEQUIN.md. No regional muscle masses are inferred.
export const MUSCLE_STUDY=Object.freeze({
 id:'janssen-2000-mri',title:'Skeletal muscle mass and distribution in 468 men and women aged 18–88 yr',
 citation:'Janssen I, Heymsfield SB, Wang ZM, Ross R. J Appl Physiol. 2000;89(1):81–88.',
 doi:'10.1152/jappl.2000.89.1.81',url:'https://pubmed.ncbi.nlm.nih.gov/10904038/',
 sampleSize:468,ageRange:[18,88],method:'전신 MRI',means:{male:33,female:21},
 transcriptionUrl:'https://github.com/stuthedew/open-anesthesia-sim/blob/d231018056b759ba9ea4672aae63a0d03951a61f/src/anesthesia_sim/data/patients/reference_adult.json',
 verification:'공개 초록 인용 자료 대조 · 원문 직접 열람 미완료',
});
export function ageAt(birthDate,measurementDate){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate||'')||!/^\d{4}-\d{2}-\d{2}$/.test(measurementDate||''))return null;
 const birth=new Date(birthDate+'T00:00:00Z'),date=new Date(measurementDate+'T00:00:00Z');
 if(!Number.isFinite(+birth)||!Number.isFinite(+date)||birth.toISOString().slice(0,10)!==birthDate||date.toISOString().slice(0,10)!==measurementDate||date<birth)return null;
 let age=date.getUTCFullYear()-birth.getUTCFullYear();
 if(date.getUTCMonth()<birth.getUTCMonth()||(date.getUTCMonth()===birth.getUTCMonth()&&date.getUTCDate()<birth.getUTCDate()))age--;
 return age;
}
export function publishedMuscleReference(measurement,profile={}){
 const gender=profile.gender,age=ageAt(profile.birth_date,measurement?.measurement_date);
 if(!Object.hasOwn(MUSCLE_STUDY.means,gender||''))return {available:false,reason:'프로필에서 성별과 생년월일을 저장하면 성인 문헌 평균을 비교할 수 있습니다.'};
 if(age==null)return {available:false,reason:'프로필에 생년월일을 저장하면 연구 대상 연령에 해당하는지 확인할 수 있습니다.'};
 if(age<18||age>88)return {available:false,reason:'이 연구의 대상은 18–88세입니다. 해당 연령 밖에서는 평균 모형을 표시하지 않습니다.'};
 const value=MUSCLE_STUDY.means[gender];
 const own=measurement?.skeletal_muscle_mass;
 if(!Number.isFinite(own))return {available:false,reason:'골격근량을 입력하면 문헌 평균과 비교할 수 있습니다.'};
 const complete=Number.isFinite(measurement?.body_fat_percentage)&&Number.isFinite(measurement?.weight)&&Number.isFinite(measurement?.height||profile.height_cm);
 const lean=complete?measurement.weight*(1-measurement.body_fat_percentage/100):null;
 return {available:true,value,age,gender,study:MUSCLE_STUDY,differenceKg:Math.round((own-value)*100)/100,
  differencePercent:Math.round((own-value)/value*1000)/10,
  // A reference is a counterfactual muscle-only comparison, not a sampled body.
  canOverlay:complete&&Number.isFinite(lean)&&value<=lean,
  overlayReason:complete?'현재 체중·체지방 조건에서는 평균 근육량 모형이 맞지 않아 수치만 비교합니다.':'평균 모형을 겹쳐 보려면 키·체중·체지방률을 함께 입력하세요.',
 };
}
