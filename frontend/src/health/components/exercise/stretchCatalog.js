import catalog from '../../../shared/lib/localCatalog.json' with {type:'json'};

// Thirty distinct movements; left/right are never counted as separate entries.
const rows=[
 ['neck_side','목 옆면 늘리기',['목·어깨'],'귀를 어깨 쪽으로 조금 기울이고 반대 어깨는 편안히 내려요.','손으로 머리를 당기지 마세요.',true],
 ['neck_diagonal','목 뒤 대각선 늘리기',['목·어깨'],'턱을 조금 당긴 뒤 시선을 겨드랑이 쪽으로 낮춰요.','목을 깊게 숙이거나 꺾지 마세요.',true],
 ['neck_turn','목 좌우 돌아보기',['목·어깨'],'어깨는 정면을 유지하고 고개만 편안한 범위로 돌려요.','끝 범위까지 억지로 돌리지 마세요.',false],
 ['shoulder_cross','어깨 가로 당기기',['어깨'],'한 팔을 가슴 앞에 두고 다른 팔로 위팔을 가볍게 받쳐요.','팔꿈치 관절을 직접 누르지 마세요.',true],
 ['triceps','팔 뒤쪽 늘리기',['팔','어깨'],'한 팔꿈치를 위로 굽히고 반대 손은 위팔을 가볍게 받쳐요.','허리를 젖히거나 팔꿈치를 세게 당기지 마세요.',true],
 ['lat_reach','광배근 위로 뻗기',['등','어깨'],'팔을 위로 길게 뻗고 갈비뼈가 들리지 않게 숨을 내쉬어요.','어깨가 끼는 느낌이면 팔을 낮춰요.',false],
 ['side_reach','서서 옆구리 늘리기',['몸통','등'],'한 팔을 올리고 골반을 정면에 둔 채 반대쪽으로 작게 기울여요.','허리를 비틀거나 반동을 주지 마세요.',true],
 ['chest_open','낮은 팔 가슴 열기',['가슴','어깨'],'팔을 몸 옆에서 약간 뒤로 보내며 쇄골을 편안히 넓혀요.','손을 억지로 맞잡거나 허리를 꺾지 마세요.',false],
 ['chest_high','W자 가슴 열기',['가슴','어깨'],'팔꿈치를 굽혀 W자를 만들고 가슴 앞을 부드럽게 열어요.','어깨 앞쪽이 아프면 팔 높이를 낮춰요.',false],
 ['biceps','위팔 앞쪽 늘리기',['팔','가슴'],'팔을 낮게 뒤로 뻗고 팔꿈치를 잠그지 않은 채 가슴을 편안히 펴요.','어깨를 과하게 뒤로 보내지 마세요.',true],
 ['wrist_flex','손목 굽힘근 늘리기',['전완'],'손바닥을 앞쪽으로 두고 손끝을 위로 세워 반대 손으로 가볍게 받쳐요.','손가락을 세게 당기지 마세요.',true],
 ['wrist_extend','손목 폄근 늘리기',['전완'],'팔을 앞으로 뻗고 손끝을 아래로 향하게 하여 반대 손으로 가볍게 받쳐요.','저리거나 손목이 아프면 즉시 풀어요.',true],
 ['upper_back','등 위쪽 둥글게 뻗기',['등'],'두 손을 가슴 앞에서 앞으로 뻗으며 날개뼈 사이를 넓혀요.','목을 앞으로 길게 빼지 마세요.',false],
 ['thoracic_turn','서서 흉추 돌아보기',['등','몸통'],'팔을 가슴 앞에 두고 골반을 고정한 채 가슴만 조금 돌려요.','허리를 끝까지 비틀지 마세요.',true],
 ['hamstring_stand','서서 뒤 허벅지 늘리기',['뒤 허벅지'],'한 발을 조금 앞에 두고 뒤 무릎을 굽히며 골반부터 작게 접어요.','허리를 둥글게 말거나 무릎을 잠그지 마세요.',true],
 ['hamstring_floor','앉아서 뒤 허벅지 늘리기',['뒤 허벅지'],'바닥에 앉아 다리를 앞에 두고 등을 길게 유지하며 골반부터 기울여요.','발끝에 닿으려고 등을 둥글게 말지 마세요.',false],
 ['figure_four','누워 4자 엉덩이 늘리기',['엉덩이'],'누워 한 발목을 반대 허벅지에 올리고 지지 다리를 조금 가까이 가져와요.','올린 무릎을 손으로 누르지 마세요.',true],
 ['quad_stand','서서 앞 허벅지 늘리기',['앞 허벅지'],'균형이 잡히는 범위에서 한 무릎을 접고 발목을 뒤에서 가볍게 받쳐요.','벽 가까이 서고 균형이 불안하면 건너뛰세요.',true],
 ['hip_flexor','반무릎 고관절 앞 늘리기',['고관절 앞','앞 허벅지'],'패드 위에 한 무릎을 대고 골반을 세운 채 몸을 조금 앞으로 옮겨요.','허리를 젖히거나 무릎 통증을 참지 마세요.',true],
 ['calf_straight','무릎 편 종아리 늘리기',['종아리'],'발을 앞뒤로 두고 뒤 무릎을 편안히 펴며 뒤꿈치를 바닥에 둬요.','뒤꿈치를 들거나 발목을 비틀지 마세요.',true],
 ['calf_bent','무릎 굽힌 종아리 늘리기',['종아리','발목'],'발을 앞뒤로 두고 뒤꿈치를 붙인 채 양 무릎을 조금 굽혀요.','무릎이 발끝 방향을 벗어나지 않게 해요.',true],
 ['adductor_side','옆으로 체중 옮겨 안쪽 허벅지 늘리기',['안쪽 허벅지'],'발을 넓게 두고 한쪽 무릎을 조금 굽혀 반대 다리 안쪽을 늘려요.','발바닥을 붙이고 깊게 주저앉지 마세요.',true],
 ['butterfly','나비 자세',['안쪽 허벅지','엉덩이'],'바닥에서 발바닥을 마주 대고 등을 편안히 세워요.','무릎을 누르거나 튕기지 마세요.',false],
 ['child','아기 자세',['등','엉덩이'],'무릎을 접어 엉덩이를 뒤로 보내고 팔을 바닥에 길게 둬요.','무릎이 불편하면 이 동작은 건너뛰세요.',false],
 ['child_side','아기 자세 옆으로 뻗기',['등','몸통'],'아기 자세에서 두 손을 한쪽으로 조금 옮겨 반대 옆구리를 늘려요.','몸통을 비틀지 말고 편안히 숨 쉬어요.',true],
 ['knee_hug','누워 한 무릎 안기',['엉덩이'],'바닥에 누워 한 허벅지 뒤를 받쳐 몸 쪽으로 가볍게 가져와요.','무릎 앞을 세게 당기지 마세요.',true],
 ['double_knee','누워 두 무릎 안기',['엉덩이','등'],'누워 양 허벅지 뒤를 받쳐 편안한 범위에서 가까이 가져와요.','골반을 과하게 말아 허리를 강하게 누르지 마세요.',false],
 ['supine_hamstring','누워 뒤 허벅지 늘리기',['뒤 허벅지'],'누워 한 허벅지 뒤를 받치고 무릎을 편안한 범위까지 펴요.','무릎을 완전히 잠그거나 발끝을 세게 당기지 마세요.',true],
 ['ankle_circles','앉아서 발목 돌리기',['발목','종아리'],'바닥에 앉아 한 발뒤꿈치를 조금 들어 발목만 작고 천천히 돌려요.','무릎과 다리 전체를 함께 흔들지 마세요.',true],
 ['cat_release','네발 자세 등 풀기',['등','몸통'],'손과 무릎을 바닥에 두고 숨을 내쉬며 등을 부드럽게 둥글게 해요.','허리를 깊게 꺾지 말고 중립 자세로 돌아와요.',false],
];
export const STRETCHES=rows.map(([id,name,regions,cue,caution,bilateral])=>({id,motion_id:`recovery_${id}`,name,regions,cue,caution,bilateral,seconds:20,dynamic:['neck_turn','ankle_circles','cat_release'].includes(id)}));
export function exerciseRegions(exercise){
 const ex={...catalog.find(e=>e.motion_id===exercise.motion_id),...exercise};
 const specific={chest_open:['가슴','어깨'],shoulder_roll:['목·어깨','어깨'],ankle_pump:['발목','종아리'],cat_cow:['등','몸통'],thoracic_rotation:['등','몸통']};if(specific[ex.motion_id])return specific[ex.motion_id];
 const text=[...(ex.target_muscle||[]),...(ex.secondary_muscle||[])].join(' '),groups=[];
 for(const [pattern,region] of [[/대퇴사두/,'앞 허벅지'],[/햄스트링/,'뒤 허벅지'],[/둔근/,'엉덩이'],[/종아리|비복|가자미/,'종아리'],[/대흉|가슴/,'가슴'],[/광배|승모|척추/,'등'],[/삼각|어깨/,'어깨'],[/상완/,'팔'],[/전완/,'전완'],[/복부|몸통/,'몸통'],[/내전/,'안쪽 허벅지']])if(pattern.test(text))groups.push(region);
 if(ex.pattern==='cardio')groups.push('앞 허벅지','뒤 허벅지','종아리');
 return [...new Set(groups)];
}
export function recommendStretches(exercises){
 const used=new Map();for(const ex of exercises)for(const region of exerciseRegions(ex))used.set(region,[...(used.get(region)||[]),ex.exercise_name||ex.name||catalog.find(e=>e.motion_id===ex.motion_id)?.name]);
 if(!used.size)return [];
 const adjacent={'종아리':['발목','뒤 허벅지'],'팔':['전완','어깨'],'전완':['팔','어깨'],'앞 허벅지':['고관절 앞','뒤 허벅지','엉덩이'],'뒤 허벅지':['엉덩이','종아리'],'엉덩이':['뒤 허벅지','고관절 앞'],'가슴':['어깨','팔'],'어깨':['목·어깨','팔'],'등':['몸통','어깨'],'몸통':['등','엉덩이'],'안쪽 허벅지':['엉덩이','뒤 허벅지']};
 const related=new Map();for(const [r,names] of used)for(const other of adjacent[r]||[])if(!used.has(other))related.set(other,names);
 const options=STRETCHES.map(stretch=>({...stretch,reasons:[...new Set(stretch.regions.flatMap(r=>used.get(r)||related.get(r)||[]))].filter(Boolean),score:stretch.regions.reduce((sum,r)=>sum+(used.has(r)?2:related.has(r)?1:0),0),related:!stretch.regions.some(r=>used.has(r))})).filter(s=>s.score>0).sort((a,b)=>b.score-a.score);
 const chosen=[],counts={};for(const s of options){const region=s.regions[0];if((counts[region]||0)>=2)continue;chosen.push(s);counts[region]=(counts[region]||0)+1;if(chosen.length===5)return chosen;}
 return [...chosen,...options.filter(s=>!chosen.includes(s))].slice(0,5);
}
