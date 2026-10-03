// Screen-space heuristic configuration. Change rule version with any tuning; validate against external labels.
export const POSE_VERSIONS=Object.freeze({pose_algorithm_version:"2.0.0",pose_rule_version:"2026.10.03",model_version:import.meta.env?.VITE_POSE_MODEL_URL?"external-custom-model-unverified":"mediapipe-pose-landmarker-lite-float16-v1"});
export const TRACKING_LABELS={HIGH:"추적 안정",MEDIUM:"추적 보통",LOW:"추적 불안정",LOST:"추적 불가"};
export const RULE_THRESHOLDS=Object.freeze({visibility:.7,highVisibility:.85,minTorso:.04,torsoLean:55,kneeDepth:125,asymmetry:25,lungeStance:.35,hipFlexion:145,sideStance:.6,alignment:150,hipOffset:.15,support:.65,hipAsymmetry:.3,bridgeKnee:155,wristDrift:.6,elbowDrift:.55,raiseElbow:100,rowLean:20,upperLean:30,shoulderAsymmetry:.3,sway:18});
export const POSE_EXERCISES={
 squat:{label:'스쿼트',joints:[23,25,27,24,26,28],down:110,up:155},
 lunge:{label:'런지',joints:[23,25,27,24,26,28],down:110,up:155,minimum:true},
 push_up:{label:'푸시업',joints:[11,13,15,12,14,16],down:100,up:155},
 plank:{label:'플랭크',joints:[11,23,27,12,24,28],hold:true,up:155,minimum:true},
 shoulder_press:{label:'숄더 프레스',joints:[11,13,15,12,14,16],down:100,up:155,overhead:true},
 curl:{label:'컬',joints:[11,13,15,12,14,16],down:65,up:145},
 hip_hinge:{label:'힙힌지',joints:[11,23,25,12,24,26],down:110,up:155},
 lateral_raise:{label:'레터럴 레이즈',joints:[23,11,13,24,12,14],down:30,up:75},
 bent_row:{label:'벤트오버 로우',joints:[11,13,15,12,14,16],down:85,up:145},
 front_raise:{label:'프런트 레이즈',joints:[23,11,15,24,12,16],down:30,up:75},
 side_lunge:{label:'사이드 런지',joints:[23,25,27,24,26,28],down:115,up:155,minimum:true},
 glute_bridge:{label:'글루트 브리지',joints:[11,23,25,12,24,26],down:125,up:160},
};

export const poseThresholds=Object.freeze(Object.fromEntries(Object.entries(POSE_EXERCISES).map(([id,c])=>[id,Object.freeze({...RULE_THRESHOLDS,...c})])));
