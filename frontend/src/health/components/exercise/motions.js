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
