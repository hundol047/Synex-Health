// Original schematic keyframes, not motion capture or personalised biomechanics.
// [head, shoulder, hip, left elbow/wrist, right elbow/wrist, left knee/ankle, right knee/ankle]
const stand = [[170,64],[170,104],[170,190],[145,148],[146,186],[193,148],[194,186],[152,242],[151,294],[188,242],[189,294]];
const pose = (base, updates) => base.map((point, i) => updates[i] || point);
const squat = pose(stand,{0:[180,105],1:[171,141],2:[135,214],3:[210,147],4:[246,153],5:[204,162],6:[237,171],7:[185,247],8:[151,294],9:[208,248],10:[189,294]});
const seated = [[157,69],[157,106],[151,191],[188,136],[209,160],[179,148],[207,170],[214,200],[214,290],[191,212],[190,295]];
const floor = [[72,233],[108,248],[199,254],[137,270],[169,277],[138,241],[172,237],[239,208],[276,288],[222,216],[259,286]];
const allFour = [[95,144],[120,168],[220,177],[119,225],[113,284],[133,224],[137,284],[223,238],[276,280],[211,239],[256,280]];
const kneePush = [[72,164],[104,179],[201,228],[107,227],[106,283],[126,221],[133,279],[237,275],[293,246],[245,268],[298,239]];
const wall = [[149,71],[157,108],[168,193],[214,115],[276,113],[218,135],[276,131],[174,244],[182,294],[193,244],[204,294]];
const row = pose(stand,{3:[221,105],4:[271,109],5:[220,124],6:[270,128]});
const armsBack = pose(stand,{3:[142,134],4:[186,132],5:[141,156],6:[186,151]});
const walkA = pose(stand,{3:[145,135],4:[119,151],5:[193,142],6:[214,122],7:[140,237],8:[114,290],9:[199,238],10:[225,293]});
const walkB = pose(stand,{3:[193,142],4:[214,122],5:[145,135],6:[119,151],7:[199,238],8:[225,293],9:[140,237],10:[114,290]});
export const MOTIONS = {
  sit_stand: {label:'앉기 / 일어서기',view:'측면 개념도',prop:'chair',frames:[stand,squat,stand]},
  squat: {label:'내려가기 / 올라오기',view:'측면 개념도',frames:[stand,squat,stand]},
  wall_push: {label:'벽 쪽으로 / 밀어내기',view:'측면 개념도',prop:'wall',frames:[wall,pose(wall,{0:[207,78],1:[216,114],2:[195,195],3:[235,159],5:[241,172]}),wall]},
  pushup: {label:'낮추기 / 밀어 올리기',view:'측면 개념도',frames:[kneePush,pose(kneePush,{0:[67,218],1:[103,234],2:[200,257],3:[70,261],5:[105,267]}),kneePush]},
  band_row: {label:'당기기 / 천천히 놓기',view:'측면 개념도',prop:'band',frames:[row,armsBack,row]},
  scapular: {label:'날개뼈 모으기 / 풀기',view:'측면 개념도',frames:[pose(stand,{3:[189,145],4:[226,138],5:[179,151],6:[215,150]}),armsBack,pose(stand,{3:[189,145],4:[226,138],5:[179,151],6:[215,150]})]},
  bridge: {label:'엉덩이 올리기 / 내리기',view:'측면 개념도',prop:'mat',frames:[floor,pose(floor,{2:[191,210],7:[237,213],9:[222,222]}),floor]},
  hinge: {label:'고관절 접기 / 펴기',view:'측면 개념도',frames:[stand,pose(stand,{0:[247,132],1:[218,152],2:[149,193],3:[215,199],4:[198,236],5:[232,189],6:[219,228],7:[164,243],9:[196,240]}),stand]},
  bird_dog: {label:'반대 팔·다리 뻗기 / 교대',view:'측면 개념도',prop:'mat',frames:[allFour,pose(allFour,{3:[74,163],4:[28,159],9:[264,173],10:[314,170]}),allFour,pose(allFour,{5:[75,158],6:[29,154],7:[264,178],8:[314,174]}),allFour]},
  dead_bug: {label:'한쪽 발 내리기 / 교대',view:'측면 개념도',prop:'mat',frames:[pose(floor,{7:[204,203],8:[255,203],9:[188,198],10:[237,197]}),pose(floor,{7:[233,233],8:[268,284],9:[188,198],10:[237,197]}),pose(floor,{7:[204,203],8:[255,203],9:[218,235],10:[248,284]}),pose(floor,{7:[204,203],8:[255,203],9:[188,198],10:[237,197]})]},
  curl: {label:'굽히기 / 천천히 내리기',view:'정면 개념도',prop:'dumbbell',frames:[stand,pose(stand,{4:[132,111],6:[207,111]}),stand]},
  calf: {label:'뒤꿈치 올리기 / 내리기',view:'정면 개념도',prop:'support',frames:[stand,stand.map((p,i)=>[p[0],p[1]-(i===8||i===10?10:18)]),stand]},
  walk: {label:'좌우 발 번갈아 걷기',view:'측면 개념도',frames:[walkA,stand,walkB,stand,walkA]},
  march: {label:'앉아서 좌우 발 교대',view:'측면 개념도',prop:'seat',frames:[seated,pose(seated,{7:[207,181],8:[214,266]}),seated,pose(seated,{9:[188,192],10:[190,271]}),seated]},
};

export function samplePose(id, progress) {
  const motion=MOTIONS[id];
  if (!motion) return null;
  const t=Math.max(0,Math.min(0.999999,progress))*(motion.frames.length-1);
  const index=Math.floor(t), fraction=(1-Math.cos((t-index)*Math.PI))/2;
  return motion.frames[index].map((p,i)=>p.map((v,j)=>v+(motion.frames[index+1][i][j]-v)*fraction));
}

// Additional authored demonstrations. These are schematic keyframes, never captured biomechanics.
const lunge=pose(stand,{0:[170,95],1:[170,135],2:[171,216],7:[122,244],8:[110,294],9:[226,264],10:[257,294]});
const overhead=pose(stand,{3:[121,88],4:[120,38],5:[219,88],6:[220,38]});
const armsOut=pose(stand,{3:[117,107],4:[69,108],5:[223,107],6:[271,108]});
const plank=[[57,187],[90,205],[197,225],[103,243],[121,279],[116,244],[140,279],[247,255],[298,291],[256,251],[311,285]];
const add=(id,label,frames,view='정면 개념도',prop)=>{MOTIONS[id]={label,frames,view,prop};};
add('lunge','한 발 뒤로 / 돌아오기',[stand,lunge,stand]);
add('shoulder_press','위로 밀기 / 내리기',[pose(stand,{3:[118,112],4:[118,68],5:[222,112],6:[222,68]}),overhead,pose(stand,{3:[118,112],4:[118,68],5:[222,112],6:[222,68]})],'정면 개념도','dumbbell');
add('lateral_raise','옆으로 들기 / 내리기',[stand,armsOut,stand],'정면 개념도','dumbbell');
add('plank','몸통 유지 / 편안히 호흡',[plank,pose(plank,{2:[197,222]}),plank],'측면 개념도','mat');
add('step_touch','옆으로 딛기 / 모으기',[stand,pose(stand,{7:[113,242],8:[95,294]}),stand,pose(stand,{9:[220,242],10:[243,294]}),stand]);
add('standing_march','한 발 들기 / 교대',[stand,pose(stand,{7:[137,201],8:[137,259]}),stand,pose(stand,{9:[210,201],10:[210,259]}),stand]);
add('hip_abduction','옆으로 다리 들기 / 내리기',[stand,pose(stand,{7:[117,230],8:[84,277]}),stand,pose(stand,{9:[227,230],10:[260,277]}),stand]);
add('heel_slide','발뒤꿈치 밀기 / 돌아오기',[floor,pose(floor,{7:[241,270],8:[310,284]}),floor],'측면 개념도','mat');
add('chest_open','가슴 열기 / 돌아오기',[stand,armsOut,stand]);
add('shoulder_roll','어깨 올리기 / 편안히 내리기',[stand,pose(stand,{1:[170,96],3:[145,140],5:[193,140]}),stand]);
add('cat_cow','등 천천히 둥글게 / 중립',[allFour,pose(allFour,{1:[121,157],2:[216,167],0:[93,157]}),allFour],'측면 개념도','mat');
add('thoracic_rotation','몸통 회전 / 돌아오기',[armsOut,pose(armsOut,{3:[137,107],4:[125,106],5:[207,107],6:[219,107]}),armsOut]);
add('ankle_pump','발목 굽히기 / 펴기',[seated,pose(seated,{8:[225,280],10:[201,285]}),seated],'측면 개념도','seat');
add('hamstring_stretch','뒤 허벅지 편안히 늘리기',[seated,pose(seated,{7:[224,220],8:[280,248],1:[175,125]}),seated],'측면 개념도','seat');
add('calf_stretch','한 발 뒤로 / 가볍게 유지',[wall,pose(wall,{9:[215,244],10:[250,294]}),wall],'측면 개념도','wall');
add('triceps_extension','팔꿈치 펴기 / 굽히기',[overhead,pose(overhead,{4:[167,86],6:[176,86]}),overhead],'정면 개념도','dumbbell');
// Variations share a movement family but adjust range, stance or tempo in their own frames.
for(const [id,base,scale] of [['goblet_squat','squat',.85],['sumo_squat','squat',1.1],['split_squat','lunge',.85],['reverse_lunge','lunge',1],['incline_push','wall_push',.85],['close_wall_push','wall_push',.8],['dumbbell_row','band_row',.9],['band_pull_apart','chest_open',1],['hammer_curl','curl',1],['front_raise','lateral_raise',.9],['single_bridge','bridge',.9],['wall_hinge','hinge',.7],['seated_calf','calf',.6],['brisk_walk','walk',1.1]]){
 const source=MOTIONS[base];add(id,source.label,source.frames.map(frame=>frame.map(([x,y])=>[170+(x-170)*scale,y])),source.view,source.prop);
}
// Movement-specific overrides (not scaled copies) for changed stance and support conditions.
const wide=pose(stand,{7:[131,242],8:[114,294],9:[209,242],10:[226,294]});
add('sumo_squat','넓은 보폭으로 앉기 / 일어서기',[wide,pose(wide,{0:[170,95],1:[170,135],2:[170,214],7:[117,252],9:[222,252]}),wide]);
const goblet=pose(stand,{3:[145,135],4:[161,115],5:[195,135],6:[179,115]});
add('goblet_squat','덤벨 가슴 앞 유지 / 앉기',[goblet,pose(squat,{3:[156,167],4:[174,152],5:[181,171],6:[192,157]}),goblet],'측면 개념도','dumbbell');
const split=pose(stand,{7:[135,245],8:[110,294],9:[215,245],10:[257,294]});
add('split_squat','발 위치 고정 / 낮추고 올라오기',[split,lunge,split]);
add('reverse_lunge','뒤로 딛기 / 낮추기 / 돌아오기',[stand,split,lunge,split,stand]);
const rowStart=pose(MOTIONS.hinge.frames[1],{3:[218,195],4:[218,241],5:[230,195],6:[230,241]});
add('dumbbell_row','몸통 기울임 유지 / 팔꿈치 당기기',[rowStart,pose(rowStart,{3:[166,177],4:[192,204],5:[179,188],6:[207,213]}),rowStart],'측면 개념도','dumbbell');
add('front_raise','팔을 앞으로 들기 / 내리기',[stand,pose(stand,{3:[219,108],4:[266,108],5:[219,124],6:[266,124]}),stand],'측면 개념도','dumbbell');
const single=pose(floor,{9:[230,229],10:[284,212]});
add('single_bridge','한 발 지지 / 골반 올리고 내리기',[single,pose(single,{2:[191,210],7:[237,213],9:[232,193],10:[281,177]}),single],'측면 개념도','mat');
add('seated_calf','앉아서 뒤꿈치 올리고 내리기',[seated,pose(seated,{7:[214,193],8:[214,280],9:[191,205],10:[190,285]}),seated],'측면 개념도','seat');
// Expanded catalog: separate keyframes for the actual support/limb positions.
const straightPush=pose(kneePush,{2:[188,219],7:[244,256],8:[298,290],9:[250,252],10:[309,287]});
add('full_pushup','몸통 정렬 / 낮추고 밀기',[straightPush,pose(straightPush,{0:[65,221],1:[102,238],2:[197,254],3:[71,266],5:[109,270]}),straightPush],'측면 개념도','mat');
const lateral=pose(wide,{2:[128,215],0:[136,88],1:[136,127],7:[103,245],9:[210,251]});
add('side_lunge','옆으로 앉기 / 중앙으로',[wide,lateral,wide,pose(lateral,{0:[204,88],1:[204,127],2:[212,215],7:[130,251],9:[237,245]}),wide]);
const wallSeat=pose(seated,{0:[147,93],1:[147,130],2:[147,214],7:[213,218],9:[196,224]});
add('wall_sit','벽 지지 / 편안한 깊이에서 유지',[wallSeat,wallSeat],'측면 개념도','back_wall');
const sideKnee=[[79,155],[112,177],[187,220],[106,227],[129,279],[151,173],[184,204],[239,276],[287,275],[247,271],[293,269]];
add('knee_side_plank','팔꿈치·무릎 지지 / 골반 유지',[sideKnee,sideKnee],'측면 개념도','mat');
add('standing_knee_crunch','무릎 낮게 당기기 / 교대',[stand,pose(stand,{7:[147,194],8:[148,247]}),stand,pose(stand,{9:[207,194],10:[208,247]}),stand]);
const clam=pose(floor,{0:[68,256],1:[108,263],2:[197,264],7:[242,247],8:[286,287],9:[239,251],10:[287,287]});
add('clamshell','발 모으기 / 위쪽 무릎 열기',[clam,pose(clam,{7:[226,205]}),clam],'측면 개념도','mat');
const prone=[[78,272],[111,276],[205,280],[76,251],[41,226],[85,257],[53,232],[255,284],[304,289],[259,288],[311,293]];
add('prone_y','팔을 낮게 들기 / 천천히 내리기',[prone,pose(prone,{3:[76,237],4:[41,210],5:[85,243],6:[53,216]}),prone],'측면 개념도','mat');
const oneCalf=pose(stand,{9:[202,233],10:[217,254]});
add('single_calf','지지대 잡기 / 한 발 뒤꿈치 들기',[oneCalf,oneCalf.map(([x,y],i)=>[x,y-(i===8?4:12)]),oneCalf],'정면 개념도','support');
const pressStart=pose(seated,{3:[127,143],4:[172,125],5:[142,155],6:[186,137]});
const pressEnd=pose(seated,{3:[210,113],4:[258,113],5:[206,132],6:[254,132]});
add('machine_chest_press','좌석 맞추기 / 앞으로 밀기',[pressStart,pressEnd,pressStart],'측면 개념도','seat');
const pullStart=pose(seated,{3:[152,69],4:[191,35],5:[183,71],6:[221,37]});
const pullEnd=pose(seated,{3:[121,155],4:[174,119],5:[154,161],6:[210,125]});
add('lat_pulldown','가슴 앞으로 당기기 / 천천히 놓기',[pullStart,pullEnd,pullStart],'측면 개념도','high_cable');
const seatedRowStart=pose(seated,{3:[207,128],4:[256,143],5:[208,146],6:[253,160]});
const seatedRowEnd=pose(seated,{3:[119,149],4:[174,165],5:[136,165],6:[186,175]});
add('machine_row','가슴 지지 / 팔꿈치 당기기',[seatedRowStart,seatedRowEnd,seatedRowStart],'측면 개념도','seat');
add('cable_row','몸통 고정 / 배 쪽으로 당기기',[seatedRowStart,seatedRowEnd,seatedRowStart],'측면 개념도','low_cable');
const legPressStart=pose(seated,{0:[100,151],1:[126,175],2:[178,237],7:[205,174],8:[260,192],9:[216,186],10:[274,204]});
const legPressEnd=pose(legPressStart,{7:[227,184],8:[272,133],9:[239,195],10:[284,145]});
add('leg_press','등·골반 지지 / 발판 밀기',[legPressStart,legPressEnd,legPressStart],'측면 개념도','leg_press');
add('leg_extension','무릎축 맞추기 / 천천히 펴기',[seated,pose(seated,{8:[294,210],10:[273,222]}),seated],'측면 개념도','seat');
const legCurlStart=pose(seated,{8:[285,213],10:[266,224]});
add('seated_leg_curl','허벅지 고정 / 뒤꿈치 당기기',[legCurlStart,pose(seated,{8:[175,272],10:[156,280]}),legCurlStart],'측면 개념도','seat');
const seatedFront=pose(stand,{0:[170,87],1:[170,127],2:[170,212],7:[142,242],8:[142,295],9:[198,242],10:[198,295]});
add('machine_hip_abduction','골반 고정 / 다리 벌리기',[seatedFront,pose(seatedFront,{7:[109,242],8:[109,295],9:[231,242],10:[231,295]}),seatedFront],'정면 개념도','seat');
const pushdownStart=pose(stand,{3:[186,156],4:[221,119],5:[199,166],6:[235,129]});
add('cable_pushdown','팔꿈치 고정 / 아래로 밀기',[pushdownStart,pose(pushdownStart,{4:[205,205],6:[219,215]}),pushdownStart],'측면 개념도','high_cable');
add('cable_face_pull','로프를 얼굴 양옆으로 당기기',[row,pose(stand,{3:[115,132],4:[140,84],5:[226,132],6:[201,84]}),row],'정면 개념도','high_cable');
const benchBody=pose(floor,{0:[70,157],1:[107,176],2:[200,182],7:[238,220],8:[262,289],9:[223,225],10:[246,292],3:[110,213],4:[145,177],5:[133,213],6:[169,177]});
const benchTop=pose(benchBody,{3:[113,127],4:[118,77],5:[134,127],6:[139,77]});
add('dumbbell_bench_press','발 지지 / 가슴 위로 밀기',[benchBody,benchTop,benchBody],'측면 개념도','bench_dumbbell');
const floorPress=pose(floor,{3:[107,284],4:[106,235],5:[139,284],6:[137,235]});
add('dumbbell_floor_press','위팔 바닥 지지 / 위로 밀기',[floorPress,pose(floorPress,{3:[109,199],4:[109,150],5:[135,199],6:[135,150]}),floorPress],'측면 개념도','dumbbell');
for(const id of ['dumbbell_rdl','barbell_rdl'])add(id,'무릎 살짝 굽힘 / 고관절 접고 펴기',[stand,MOTIONS.hinge.frames[1],stand],'측면 개념도',id==='barbell_rdl'?'barbell':'dumbbell');
add('barbell_bench_press','안전바·보조자 확인 / 위로 밀기',[benchBody,benchTop,benchBody],'측면 개념도','bench_barbell');
const rackStand=pose(stand,{3:[128,128],4:[128,99],5:[212,128],6:[212,99]});
add('barbell_squat','바 지지 / 앉았다 일어서기',[rackStand,pose(squat,{3:[129,160],4:[129,135],5:[213,160],6:[213,135]}),rackStand],'측면 개념도','barbell');
add('dumbbell_split_squat','발 고정 / 낮추고 올라오기',[split,lunge,split],'측면 개념도','dumbbell');
add('dumbbell_shrug','어깨 작게 올리기 / 내리기',[stand,pose(stand,{1:[170,96],3:[145,140],4:[146,178],5:[193,140],6:[194,178]}),stand],'정면 개념도','dumbbell');
add('treadmill_walk','안전 클립 / 천천히 걷기',MOTIONS.walk.frames,'측면 개념도','treadmill');
const cycle=pose(seated,{0:[186,84],1:[174,117],3:[216,135],4:[248,154],5:[211,152],6:[242,169],7:[220,209],8:[214,269],9:[189,233],10:[236,258]});
add('stationary_cycle','안장 맞추기 / 편안하게 페달 돌리기',[cycle,pose(cycle,{7:[189,233],8:[236,258],9:[220,209],10:[214,269]}),cycle],'측면 개념도','bike');
add('elliptical','낮은 저항 / 팔·다리 교대',[walkA,stand,walkB,stand,walkA],'측면 개념도','elliptical');
const pallof=pose(stand,{3:[143,142],4:[171,128],5:[197,142],6:[176,128]});
add('cable_pallof','몸통 고정 / 두 손 앞으로',[pallof,pose(pallof,{3:[216,116],4:[263,119],5:[221,130],6:[267,132]}),pallof],'측면 개념도','side_cable');
// Machine geometry is schematic; use the 2D guide that includes support/attachment points.
for(const id of ['machine_chest_press','lat_pulldown','machine_row','leg_press','leg_extension','seated_leg_curl','machine_hip_abduction','cable_pushdown','cable_face_pull','cable_row','dumbbell_bench_press','barbell_bench_press','treadmill_walk','stationary_cycle','elliptical','cable_pallof','wall_sit'])MOTIONS[id].twoDimensionalOnly=true;

for(const id of ['wall_sit','knee_side_plank','plank'])MOTIONS[id].hold=true;

MOTIONS.dumbbell_shrug.twoDimensionalOnly=true;
