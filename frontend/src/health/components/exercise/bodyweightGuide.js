// Authored technique guidance for the bodyweight movements supported by pose analysis.
// Demonstrations explain the movement; a person's comfortable range can differ.
export const BODYWEIGHT_EXERCISES = Object.freeze({
  squat: {
    label: '스쿼트', motionId: 'squat', target: '허벅지 · 엉덩이', view: '서서 하는 운동', cameraView: '측면 또는 45도', defaultView: '45',
    steps: ['발을 어깨 너비로 벌리고 발바닥 전체를 바닥에 둡니다.', '엉덩이를 뒤로 보내며 무릎을 발끝 방향으로 굽힙니다.', '편안한 깊이에서 멈춘 뒤 바닥을 밀어 일어납니다.'],
    cues: ['발바닥 전체로 지지', '무릎은 발끝 방향', '등과 목을 자연스럽게 유지'],
    phases: ['발을 어깨 너비로 · 배에 가볍게 힘', '엉덩이를 뒤로 · 천천히 내려가기', '편안한 깊이 · 무릎과 발끝 같은 방향', '바닥을 밀며 일어나기 · 숨 내쉬기'],
  },
  lunge: {
    label: '런지', motionId: 'lunge', target: '허벅지 · 엉덩이', view: '서서 하는 운동', cameraView: '측면 또는 45도', defaultView: '45',
    steps: ['골반 너비로 서서 한 발을 뒤로 디딥니다.', '앞발을 바닥에 둔 채 양 무릎을 천천히 굽힙니다.', '앞발로 바닥을 밀어 돌아온 뒤 반대쪽도 반복합니다.'],
    cues: ['앞발 전체로 지지', '앞 무릎은 발끝 방향', '몸통을 세우고 균형 유지'],
    phases: ['골반 너비로 서기 · 몸통 세우기', '한 발 뒤로 · 양 무릎 굽히기', '앞발 전체로 지지 · 균형 유지', '앞발로 밀어 돌아오기 · 좌우 교대'],
  },
  side_lunge: {
    label: '사이드 런지', motionId: 'side_lunge', target: '허벅지 안쪽 · 엉덩이', view: '서서 하는 운동', cameraView: '정면', defaultView: 'front',
    steps: ['발을 넓게 벌리고 발끝을 편안한 방향으로 둡니다.', '한쪽 엉덩이를 뒤로 보내며 그쪽 무릎을 굽힙니다.', '굽힌 쪽 발로 바닥을 밀어 중앙으로 돌아와 좌우를 교대합니다.'],
    cues: ['엉덩이는 뒤로', '굽힌 무릎과 발끝 같은 방향', '반대 다리는 편안하게 펴기'],
    phases: ['넓게 서기 · 발바닥 전체로 지지', '한쪽 엉덩이를 뒤로 · 체중 이동', '반대 다리 편안히 펴기 · 무릎 방향 확인', '바닥을 밀어 중앙으로 · 좌우 교대'],
  },
  push_up: {
    label: '푸시업', motionId: 'full_pushup', target: '가슴 · 팔 뒤쪽 · 코어', view: '바닥에서 하는 운동', cameraView: '측면', defaultView: 'side', floor: true,
    steps: ['손을 어깨보다 조금 넓게 두고 어깨부터 발목까지 길게 정렬합니다.', '팔꿈치를 몸통에서 약 30~45도 방향으로 굽혀 몸 전체를 낮춥니다.', '배와 엉덩이의 힘을 유지하며 바닥을 밀어 올라옵니다.'],
    cues: ['어깨 · 골반 · 발목을 한 줄로', '팔꿈치를 과하게 벌리지 않기', '몸통 전체를 함께 움직이기'],
    phases: ['손으로 바닥 지지 · 몸통 길게 정렬', '몸 전체를 함께 · 천천히 내려가기', '팔꿈치 약 30~45도 · 편안한 깊이', '바닥을 밀며 올라오기 · 허리 유지'],
  },
  plank: {
    label: '플랭크', motionId: 'plank', target: '복부 · 몸통 안정', view: '바닥에서 하는 운동', cameraView: '측면', defaultView: 'side', floor: true, hold: true,
    steps: ['팔꿈치를 어깨 아래에 두고 팔뚝과 발끝으로 바닥을 지지합니다.', '머리부터 발목까지 길게 정렬하고 배와 엉덩이에 가볍게 힘을 줍니다.', '허리를 꺾거나 엉덩이를 과하게 들지 않고 편안하게 호흡합니다.'],
    cues: ['팔꿈치는 어깨 아래', '허리를 꺾지 않고 길게 정렬', '숨을 참지 않고 호흡'],
    phases: ['팔꿈치는 어깨 아래 · 몸통 길게 · 편안하게 호흡'],
  },
  hip_hinge: {
    label: '힙힌지', motionId: 'hinge', target: '엉덩이 · 허벅지 뒤쪽', view: '서서 하는 운동', cameraView: '측면', defaultView: 'side',
    steps: ['발을 골반 너비로 벌리고 무릎을 살짝 굽힙니다.', '등을 자연스럽게 유지하며 엉덩이를 뒤로 보내 고관절을 접습니다.', '발바닥으로 바닥을 지지하며 엉덩이에 힘을 주어 일어납니다.'],
    cues: ['엉덩이를 뒤로 보내기', '허리보다 고관절 접기', '목과 등은 자연스러운 한 줄'],
    phases: ['골반 너비 · 무릎을 살짝 굽히기', '엉덩이를 뒤로 · 고관절 접기', '등과 목 자연스럽게 · 편안한 범위', '엉덩이에 힘 · 천천히 일어나기'],
  },
  glute_bridge: {
    label: '글루트 브리지', motionId: 'bridge', target: '엉덩이 · 허벅지 뒤쪽', view: '바닥에서 하는 운동', cameraView: '측면', defaultView: 'side', floor: true,
    steps: ['등을 대고 누워 무릎을 굽히고 발을 골반 너비로 둡니다.', '발바닥으로 바닥을 밀어 어깨부터 무릎까지 길게 이어지도록 골반을 듭니다.', '허리를 과하게 꺾지 않고 천천히 골반을 내립니다.'],
    cues: ['발바닥과 어깨로 지지', '엉덩이에 힘 · 허리 과하게 꺾지 않기', '무릎은 발끝 방향'],
    phases: ['등을 대고 눕기 · 무릎 굽혀 발 지지', '엉덩이에 힘 · 골반 천천히 올리기', '어깨부터 무릎까지 길게 · 허리 유지', '천천히 골반 내리기 · 숨 들이쉬기'],
  },
});

export function getBodyweightGuide(id) { return BODYWEIGHT_EXERCISES[id] || null; }

export function getBodyweightDemoPhase(id, progress = 0) {
  const guide = getBodyweightGuide(id);
  if (!guide) return null;
  if (guide.hold) return { index: 0, label: '유지 · 호흡', cue: guide.phases[0] };
  let t = Number.isFinite(progress) ? ((progress % 1) + 1) % 1 : 0;
  if (id === 'lunge' || id === 'side_lunge') t = (t * 2) % 1;
  const index = t < .12 ? 0 : t < .42 ? 1 : t < .58 ? 2 : 3;
  return { index, label: ['준비', id === 'glute_bridge' ? '올리기' : '천천히 낮추기', '자세 확인', id === 'glute_bridge' ? '내리기' : '돌아오기'][index], cue: guide.phases[index] };
}
