"""Curated movement IDs shared with the original SVG demonstrations. No external media needed."""
def movement(id, name, pattern, regions, equipment, avoid, steps, caution, easy=False):
    return dict(id=id, name=name, pattern=pattern, regions=regions, equipment=equipment,
                avoid=avoid, instructions=steps, cautions=[caution, '통증·어지럼이 생기면 중단하고 상담하세요.'], easy=easy)

CATALOG = [
    movement('sit_stand', '의자 앉았다 일어나기', 'squat', ['하체'], [], ['knee', 'hip'],
             ['벽에 고정한 안정적인 의자 앞에 발을 골반 너비로 둡니다.', '엉덩이를 뒤로 보내 천천히 앉습니다.', '무릎을 발끝 방향으로 유지하며 발바닥으로 밀어 일어섭니다.'], '낮은 의자나 바퀴 달린 의자를 사용하지 마세요.', True),
    movement('squat', '맨몸 스쿼트', 'squat', ['하체'], [], ['knee', 'hip', 'back'],
             ['발을 어깨 너비로 두고 복부에 가볍게 힘을 줍니다.', '엉덩이를 뒤로 보내며 편안한 범위까지 앉습니다.', '발바닥 전체로 바닥을 밀며 올라옵니다.'], '허리를 둥글게 말거나 무릎을 안쪽으로 모으지 마세요.'),
    movement('wall_push', '벽 푸시업', 'push', ['상체'], [], ['shoulder', 'wrist'],
             ['미끄럽지 않은 바닥에서 벽에 두 손을 어깨높이로 댑니다.', '몸을 일직선으로 유지하며 팔꿈치를 굽힙니다.', '숨을 내쉬며 벽을 밀어 시작 자세로 돌아옵니다.'], '벽에 가까이 서면 더 쉽습니다. 팔꿈치를 과도하게 벌리지 마세요.', True),
    movement('pushup', '무릎 푸시업', 'push', ['상체', '몸통'], [], ['shoulder', 'wrist', 'knee', 'back'],
             ['매트 위에 무릎과 손을 대고 머리부터 무릎까지 일직선을 만듭니다.', '팔꿈치를 뒤쪽으로 굽혀 가슴을 낮춥니다.', '허리를 꺾지 않고 바닥을 밀어 올라옵니다.'], '손목이나 어깨가 불편하면 중단하세요.'),
    movement('band_row', '밴드 로우', 'pull', ['상체'], ['band'], ['shoulder', 'back'],
             ['손상 없는 밴드를 가슴높이의 견고한 지점에 고정합니다.', '몸통을 세우고 팔꿈치를 뒤로 당깁니다.', '어깨를 으쓱하지 않고 천천히 팔을 폅니다.'], '밴드 고정 상태를 먼저 확인하세요.'),
    movement('scapular', '서서 날개뼈 모으기', 'pull', ['상체'], [], ['shoulder'],
             ['팔꿈치를 90도로 굽히고 어깨를 편안하게 내립니다.', '팔꿈치를 뒤로 보내며 날개뼈를 가볍게 모읍니다.', '목에 힘을 빼고 시작 자세로 돌아옵니다.'], '무저항 준비 동작입니다. 중량 로우와 같은 훈련량으로 해석하지 마세요.', True),
    movement('bridge', '글루트 브리지', 'hinge', ['하체', '몸통'], [], ['back', 'hip'],
             ['등을 대고 누워 무릎을 세우고 발을 골반 너비로 둡니다.', '발바닥으로 밀어 어깨부터 무릎까지 편안한 선을 만듭니다.', '허리를 과하게 젖히지 않고 천천히 내려옵니다.'], '목으로 바닥을 밀지 마세요.', True),
    movement('hinge', '맨몸 힙 힌지', 'hinge', ['하체', '몸통'], [], ['back', 'hip'],
             ['발을 골반 너비로 두고 무릎을 조금 굽힙니다.', '등의 중립을 유지하며 엉덩이를 뒤로 보냅니다.', '발바닥으로 지지하며 엉덩이를 앞으로 가져옵니다.'], '허리를 굽히는 대신 고관절에서 접으세요.'),
    movement('bird_dog', '버드독', 'core', ['몸통'], [], ['wrist', 'knee', 'back', 'shoulder'],
             ['손은 어깨 아래, 무릎은 골반 아래에 둡니다.', '반대쪽 팔과 다리를 몸통높이까지만 뻗습니다.', '골반을 수평으로 유지하며 돌아온 뒤 반대쪽을 반복합니다.'], '높이 들기보다 몸통이 흔들리지 않도록 합니다.'),
    movement('dead_bug', '누워 발뒤꿈치 터치', 'core', ['몸통'], [], ['back', 'hip'],
             ['등을 대고 누워 무릎을 90도로 들어 올립니다.', '숨을 내쉬며 한쪽 발뒤꿈치를 바닥으로 천천히 내립니다.', '허리가 뜨지 않는 범위에서 돌아온 뒤 반대쪽을 반복합니다.'], '허리를 바닥에 과하게 누르지 말고 편안한 범위를 유지하세요.', True),
    movement('curl', '덤벨 컬', 'accessory', ['상체'], ['dumbbell'], ['elbow', 'wrist'],
             ['가벼운 덤벨을 양손에 들고 팔꿈치를 몸통 옆에 둡니다.', '팔꿈치 위치를 유지하며 덤벨을 올립니다.', '몸을 흔들지 않고 천천히 내립니다.'], '양쪽을 같은 횟수로 수행합니다. 측정값만으로 한쪽 중량을 늘리지 않습니다.'),
    movement('calf', '지지대 잡고 뒤꿈치 들기', 'accessory', ['하체'], [], ['ankle', 'knee'],
             ['벽이나 견고한 지지대를 가볍게 잡고 똑바로 섭니다.', '발 앞부분으로 바닥을 밀어 뒤꿈치를 올립니다.', '반동 없이 천천히 뒤꿈치를 내립니다.'], '발목이 안팎으로 꺾이지 않도록 합니다.', True),
    movement('walk', '편안한 걷기', 'cardio', ['전신'], [], ['knee', 'hip', 'ankle'],
             ['평평하고 안전한 공간에서 편안하게 걷기 시작합니다.', '상체를 세우고 팔을 자연스럽게 흔듭니다.', '문장으로 대화할 수 있는 속도를 유지합니다.'], '속도와 보폭을 억지로 늘리지 마세요.', True),
    movement('march', '앉아서 제자리 발 들기', 'cardio', ['전신'], [], ['hip', 'back'],
             ['흔들리지 않는 의자에 앉아 두 발을 바닥에 둡니다.', '한 발씩 낮게 들어 올렸다 천천히 내립니다.', '몸통을 세우고 좌우를 번갈아 반복합니다.'], '걷기가 어려울 때의 가벼운 대체 활동이며 중강도 운동으로 자동 환산하지 않습니다.', True),
]


# Additional catalog entries: authored guidance, not individual medical prescriptions.
CATALOG.append({**movement('lunge','제자리 런지','squat',['하체'],[],['knee', 'hip', 'ankle'],['발을 앞뒤로 벌리고 양쪽 무릎을 편안한 범위로 굽힙니다.','앞 무릎을 발 방향으로 유지하며 올라옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Lunge','category':'Legs'})
CATALOG.append({**movement('shoulder_press','덤벨 숄더 프레스','push',['상체'],['dumbbell'],['shoulder', 'back'],['가벼운 덤벨을 귀 옆에서 머리 위로 올립니다.','허리를 젖히지 않고 천천히 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Shoulder press','category':'Shoulder'})
CATALOG.append({**movement('lateral_raise','덤벨 레터럴 레이즈','accessory',['상체'],['dumbbell'],['shoulder'],['팔꿈치를 살짝 굽히고 팔을 옆으로 듭니다.','어깨 높이를 넘기지 않고 천천히 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Lateral raise','category':'Shoulder'})
CATALOG.append({**movement('plank','팔꿈치 플랭크','core',['몸통'],[],['shoulder', 'back'],['팔꿈치를 어깨 아래 두고 몸통을 편안한 일직선으로 유지합니다.','숨을 참지 말고 짧게 유지한 뒤 쉽니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Forearm plank','category':'Core'})
CATALOG.append({**movement('step_touch','좌우 스텝 터치','cardio',['전신'],[],['knee', 'ankle'],['한 발을 옆으로 딛고 다른 발을 모읍니다.','좌우 번갈아 편안하게 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Step touch','category':'Cardio'})
CATALOG.append({**movement('standing_march','서서 제자리 걷기','cardio',['전신'],[],['hip', 'knee'],['한 발씩 낮게 들어 올립니다.','필요하면 고정된 지지대를 잡습니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Standing march','category':'Cardio'})
CATALOG.append({**movement('hip_abduction','서서 다리 옆으로 들기','accessory',['하체'],[],['hip', 'ankle'],['지지대를 잡고 한쪽 다리를 옆으로 낮게 듭니다.','골반을 기울이지 않고 내린 뒤 반대쪽도 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Standing hip abduction','category':'Glutes'})
CATALOG.append({**movement('heel_slide','누워 발뒤꿈치 밀기','core',['몸통'],[],['hip', 'back'],['누워 한쪽 발뒤꿈치를 바닥 위로 천천히 밉니다.','편안한 범위에서 되돌리고 반대쪽도 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Heel slide','category':'Mobility'})
CATALOG.append({**movement('chest_open','서서 가슴 열기','mobility',['상체'],[],['shoulder'],['어깨를 낮추고 팔을 양옆으로 편안하게 엽니다.','통증 없는 범위에서 유지하고 돌아옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Chest opener','category':'Stretching'})
CATALOG.append({**movement('shoulder_roll','어깨 가볍게 돌리기','mobility',['상체'],[],['shoulder'],['어깨를 가볍게 올린 뒤 뒤로 천천히 돌립니다.','목에 힘을 빼고 작게 움직입니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Shoulder roll','category':'Mobility'})
CATALOG.append({**movement('cat_cow','네발기기 등 움직이기','mobility',['몸통'],[],['wrist', 'knee', 'back'],['네발기기에서 등을 작게 둥글게 만듭니다.','편안한 중립으로 돌아옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Cat cow','category':'Mobility'})
CATALOG.append({**movement('thoracic_rotation','서서 몸통 회전','mobility',['몸통'],[],['back'],['팔을 벌리고 몸통을 작은 범위로 돌립니다.','골반을 고정하려고 무리하지 않고 좌우 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Standing thoracic rotation','category':'Mobility'})
CATALOG.append({**movement('ankle_pump','앉아서 발목 움직이기','mobility',['하체'],[],['ankle'],['안정적인 의자에 앉아 발끝을 들었다 내립니다.','발목만 편안하게 움직입니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Ankle pump','category':'Mobility'})
CATALOG.append({**movement('hamstring_stretch','앉아서 뒤 허벅지 늘리기','mobility',['하체'],[],['back', 'hip'],['의자에 앉아 한 다리를 앞으로 편안하게 폅니다.','등을 길게 유지하고 고관절에서 조금 숙입니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Seated hamstring stretch','category':'Stretching'})
CATALOG.append({**movement('calf_stretch','벽 잡고 종아리 늘리기','mobility',['하체'],[],['ankle'],['벽을 잡고 한 발을 뒤로 둡니다.','뒤꿈치를 바닥에 두고 편안하게 유지합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Calf stretch','category':'Stretching'})
CATALOG.append({**movement('triceps_extension','덤벨 트라이셉스 익스텐션','accessory',['상체'],['dumbbell'],['elbow', 'shoulder'],['가벼운 덤벨을 머리 위에서 팔꿈치를 굽혀 내립니다.','팔꿈치를 편안히 펴고 허리는 젖히지 않습니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Triceps extension','category':'Arms'})
CATALOG.append({**movement('goblet_squat','고블릿 스쿼트','squat',['하체'],['dumbbell'],['knee', 'hip', 'back'],['가벼운 덤벨을 가슴 앞에 모아 잡고 앉습니다.','발바닥 전체로 밀어 일어납니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Goblet squat','category':'Legs'})
CATALOG.append({**movement('sumo_squat','와이드 스쿼트','squat',['하체'],[],['knee', 'hip', 'back'],['발을 편안하게 넓혀 앉습니다.','무릎과 발끝 방향을 맞추어 올라옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Wide squat','category':'Legs'})
CATALOG.append({**movement('split_squat','스플릿 스쿼트','squat',['하체'],[],['knee', 'hip', 'ankle'],['발을 앞뒤로 고정하고 몸을 낮춥니다.','지지대를 잡아 균형을 유지하고 양쪽 동일하게 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Split squat','category':'Legs'})
CATALOG.append({**movement('reverse_lunge','리버스 런지','squat',['하체'],[],['knee', 'hip', 'ankle'],['한 발을 뒤로 딛고 낮춥니다.','앞발로 지지하며 돌아오고 양쪽 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Reverse lunge','category':'Legs'})
CATALOG.append({**movement('incline_push','높은 지지대 푸시업','push',['상체'],[],['shoulder', 'wrist', 'back'],['움직이지 않는 높은 지지대에 손을 대고 팔을 굽힙니다.','몸을 일직선으로 유지하며 밀어냅니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Incline push-up','category':'Chest'})
CATALOG.append({**movement('close_wall_push','좁게 벽 푸시업','push',['상체'],[],['shoulder', 'wrist', 'elbow'],['벽에 손을 어깨 너비보다 약간 좁게 댑니다.','팔꿈치를 몸 가까이 굽혔다 밀어냅니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Close wall push-up','category':'Chest'})
CATALOG.append({**movement('dumbbell_row','덤벨 로우','pull',['상체'],['dumbbell'],['back', 'shoulder'],['고관절을 접고 가벼운 덤벨을 몸통 쪽으로 당깁니다.','등의 중립을 유지하며 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Dumbbell row','category':'Back'})
CATALOG.append({**movement('band_pull_apart','밴드 풀어파트','pull',['상체'],['band'],['shoulder'],['손상 없는 밴드를 가슴 앞에 잡고 양옆으로 벌립니다.','어깨를 낮추고 천천히 돌아옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Band pull-apart','category':'Back'})
CATALOG.append({**movement('hammer_curl','해머 컬','accessory',['상체'],['dumbbell'],['elbow', 'wrist'],['손바닥이 마주 보게 덤벨을 잡고 팔꿈치를 굽힙니다.','몸을 흔들지 않고 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Hammer curl','category':'Arms'})
CATALOG.append({**movement('front_raise','덤벨 프런트 레이즈','accessory',['상체'],['dumbbell'],['shoulder', 'back'],['가벼운 덤벨을 몸 앞으로 듭니다.','어깨 높이를 넘기지 않고 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Front raise','category':'Shoulder'})
CATALOG.append({**movement('single_bridge','한 다리 브리지','hinge',['하체'],[],['back', 'hip', 'knee'],['누워 한 발로 지지하고 골반을 조금 올립니다.','골반을 수평으로 유지하고 좌우 동일하게 반복합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Single leg bridge','category':'Glutes'})
CATALOG.append({**movement('wall_hinge','벽 터치 힙 힌지','hinge',['하체'],[],['back', 'hip'],['벽을 등지고 가까이 서서 엉덩이를 뒤로 보냅니다.','벽에 가볍게 닿으면 고관절을 펴 돌아옵니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Wall hip hinge','category':'Glutes'})
CATALOG.append({**movement('seated_calf','앉아서 뒤꿈치 들기','accessory',['하체'],[],['ankle'],['의자에 앉아 발바닥 앞부분으로 지지합니다.','뒤꿈치를 올렸다 천천히 내립니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Seated calf raise','category':'Legs'})
CATALOG.append({**movement('brisk_walk','활기찬 걷기','cardio',['전신'],[],['knee', 'hip', 'ankle'],['평탄한 곳에서 평소보다 조금 빠르게 걷습니다.','문장으로 대화가 가능한 속도를 유지합니다.'], '반동을 피하고 통증 없는 범위에서 수행하세요.'), 'english_name':'Brisk walking','category':'Cardio'})

_CATEGORY={'squat':'Legs','push':'Chest','pull':'Back','hinge':'Glutes','core':'Core','cardio':'Cardio','accessory':'Arms','mobility':'Mobility'}
_ENGLISH={'sit_stand':'Sit to stand','squat':'Bodyweight squat','wall_push':'Wall push-up','pushup':'Knee push-up','band_row':'Band row','scapular':'Scapular retraction','bridge':'Glute bridge','hinge':'Hip hinge','bird_dog':'Bird dog','dead_bug':'Supine heel tap','curl':'Dumbbell curl','calf':'Supported calf raise','walk':'Walking','march':'Seated march'}
for m in CATALOG:
    m.setdefault('english_name',_ENGLISH.get(m['id'],m['id']))
    m.setdefault('category',_CATEGORY[m['pattern']])
    m.update(korean_name=m['name'],target_muscle=m['regions'],secondary_muscle=['몸통 안정화'],difficulty='beginner' if m['easy'] else 'intermediate',contraindications=m['avoid'],motion_id=m['id'],estimated_duration=180,sets=1 if m['easy'] else 2,reps='8–12',rest=60)
_MUSCLES={'Chest':('대흉근','상완삼두근'),'Back':('광배근·승모근','상완이두근'),'Shoulder':('삼각근','승모근'),'Arms':('상완이두근·상완삼두근','전완근'),'Core':('복부·척추 주변 안정근','둔근'),'Glutes':('둔근','햄스트링'),'Legs':('대퇴사두근·햄스트링','둔근'),'Cardio':('전신','하체'),'Mobility':('동작 부위의 가동성','몸통 안정근'),'Stretching':('동작 부위의 유연성','주변 연부조직')}
for m in CATALOG:
    m['target_muscle'],m['secondary_muscle']=[[_MUSCLES[m['category']][0]],[_MUSCLES[m['category']][1]]]
    if m['id'] in ('calf','seated_calf','calf_stretch'):m['target_muscle']=['종아리 근육']
    if m['id']=='hamstring_stretch':m['target_muscle']=['햄스트링']
    if m['id']=='triceps_extension':m['target_muscle']=['상완삼두근']
BY_ID={m['id']:m for m in CATALOG}
