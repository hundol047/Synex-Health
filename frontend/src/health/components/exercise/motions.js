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
