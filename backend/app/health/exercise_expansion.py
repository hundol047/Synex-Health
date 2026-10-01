"""Authored adult wellness movement descriptions; individual technique review remains necessary."""
def expanded_movements(movement):
    rows = [
      ('full_pushup','기본 푸시업','push','Chest',[],['shoulder','wrist','back'],['손을 어깨보다 조금 넓게 두고 발끝으로 지지합니다.','머리부터 발뒤꿈치까지 정렬을 유지하며 가슴을 낮춥니다.','팔꿈치를 몸통에서 과하게 벌리지 않고 바닥을 밀어 올라옵니다.'],'허리가 처지면 무릎 푸시업으로 낮추세요.'),
      ('side_lunge','사이드 런지','squat','Legs',[],['knee','hip','ankle'],['발을 편안하게 벌리고 섭니다.','한쪽 엉덩이를 뒤로 보내며 그쪽 무릎을 굽힙니다.','발바닥으로 지지해 중앙으로 돌아오고 반대쪽을 반복합니다.'],'지지하는 무릎을 발끝 방향으로 유지하세요.'),
      ('wall_sit','벽 기대 앉기','squat','Legs',[],['knee','hip','back'],['등을 벽에 대고 발을 조금 앞으로 둡니다.','편안한 깊이까지만 내려가 잠시 유지합니다.','호흡을 유지하며 벽을 따라 천천히 일어섭니다.'],'무릎을 깊이 굽히는 것을 목표로 하지 마세요.'),
      ('knee_side_plank','무릎 사이드 플랭크','core','Core',[],['shoulder','back','knee'],['옆으로 누워 팔꿈치를 어깨 아래 두고 무릎을 굽힙니다.','팔꿈치와 무릎으로 지지하며 골반을 들어 올립니다.','어깨와 골반이 돌아가지 않게 잠시 유지한 뒤 내립니다.'],'어깨를 으쓱하거나 숨을 참지 마세요.'),
      ('standing_knee_crunch','서서 무릎 당기기','core','Core',[],['hip','back'],['안정적인 자세에서 손을 가슴 앞에 둡니다.','한쪽 무릎을 낮게 들어 몸통 쪽으로 가져옵니다.','몸을 비틀지 않고 내린 뒤 반대쪽을 반복합니다.'],'균형이 어렵다면 견고한 지지대를 잡으세요.'),
      ('clamshell','옆으로 누워 무릎 벌리기','accessory','Glutes',[],['hip','back'],['옆으로 누워 무릎을 굽히고 발을 모읍니다.','골반을 고정한 채 위쪽 무릎을 편안한 범위로 엽니다.','천천히 닫은 뒤 같은 횟수로 반대쪽도 수행합니다.'],'골반을 뒤로 젖혀 범위를 늘리지 마세요.'),
      ('prone_y','엎드려 Y자 팔 들기','pull','Back',[],['shoulder','back'],['엎드려 팔을 앞쪽 대각선으로 뻗고 이마를 편안히 받칩니다.','목에 힘을 빼고 팔을 바닥에서 조금만 들어 올립니다.','어깨를 으쓱하지 않고 천천히 내립니다.'],'무저항 보조 동작이며 중량 로우를 대체하지 않습니다.'),
      ('single_calf','한 발 뒤꿈치 들기','accessory','Legs',[],['ankle','knee'],['견고한 지지대를 잡고 한 발로 섭니다.','발 앞부분으로 지지하며 뒤꿈치를 천천히 올립니다.','반동 없이 내리고 반대쪽도 같은 횟수로 반복합니다.'],'균형이 어렵다면 양발로 수행하세요.'),
      ('machine_chest_press','머신 체스트 프레스','push','Chest',['chest_press_machine'],['shoulder','elbow','wrist'],['손잡이가 가슴 중간 높이에 오도록 좌석을 맞춥니다.','등을 등받이에 대고 가벼운 무게로 손잡이를 앞으로 밉니다.','어깨가 과하게 뒤로 벌어지지 않는 범위까지 천천히 돌아옵니다.'],'처음에는 트레이너에게 좌석과 시작 위치를 확인받으세요.'),
      ('lat_pulldown','랫 풀다운','pull','Back',['lat_pulldown_machine'],['shoulder','elbow','back'],['허벅지 패드를 맞추고 바를 편안한 너비로 잡습니다.','가슴을 자연스럽게 세우고 바를 가슴 윗부분 쪽으로 당깁니다.','몸통 반동 없이 팔을 천천히 폅니다.'],'바를 목 뒤로 당기지 마세요.'),
      ('machine_row','머신 시티드 로우','pull','Back',['row_machine'],['shoulder','elbow','back'],['가슴 패드와 좌석을 맞추고 손잡이를 잡습니다.','어깨를 낮추고 팔꿈치를 몸통 옆으로 당깁니다.','가슴이 패드에서 떨어지지 않게 천천히 돌아옵니다.'],'허리 반동으로 무게를 당기지 마세요.'),
      ('leg_press','레그 프레스','squat','Legs',['leg_press_machine'],['knee','hip','back'],['등과 골반을 패드에 붙이고 발판에 두 발을 둡니다.','골반이 들리지 않는 깊이까지 무릎을 굽힙니다.','발바닥 전체로 밀고 무릎을 잠그기 전에 멈춥니다.'],'안전 장치 사용법을 확인하고 낮은 부하로 시작하세요.'),
      ('leg_extension','레그 익스텐션','accessory','Legs',['leg_extension_machine'],['knee'],['무릎 관절을 기계 회전축에 맞추고 패드를 발목 위에 둡니다.','좌석에서 엉덩이가 뜨지 않게 무릎을 천천히 폅니다.','무게를 떨어뜨리지 않고 돌아옵니다.'],'무릎 통증이 있으면 중단하세요.'),
      ('seated_leg_curl','시티드 레그 컬','hinge','Legs',['leg_curl_machine'],['knee','hip'],['무릎을 회전축에 맞추고 허벅지 고정 패드를 조절합니다.','뒤꿈치를 좌석 아래 방향으로 당깁니다.','반동 없이 다리를 천천히 폅니다.'],'관절을 기계의 이동 범위에 억지로 맞추지 마세요.'),
      ('machine_hip_abduction','머신 힙 어브덕션','accessory','Glutes',['hip_abduction_machine'],['hip','back'],['등을 등받이에 대고 무릎 바깥쪽에 패드를 맞춥니다.','몸통을 고정하고 두 다리를 편안하게 벌립니다.','무게가 부딪히지 않게 천천히 모읍니다.'],'허리를 젖히거나 과도하게 벌리지 마세요.'),
      ('cable_pushdown','케이블 트라이셉스 푸시다운','accessory','Arms',['cable'],['elbow','wrist','shoulder'],['높은 풀리 손잡이를 잡고 팔꿈치를 몸통 옆에 둡니다.','팔꿈치 위치를 유지하며 손잡이를 아래로 밉니다.','어깨를 흔들지 않고 천천히 돌아옵니다.'],'손목을 과하게 꺾지 마세요.'),
      ('cable_face_pull','케이블 페이스 풀','pull','Back',['cable','rope_handle'],['shoulder','elbow'],['로프를 얼굴 높이에 설정하고 양 끝을 잡습니다.','어깨를 낮춘 채 로프를 얼굴 양옆으로 당깁니다.','몸통을 뒤로 젖히지 않고 천천히 팔을 폅니다.'],'가벼운 무게에서 어깨의 편안한 범위를 확인하세요.'),
      ('cable_row','케이블 로우','pull','Back',['seated_cable_row'],['back','shoulder','elbow'],['좌석에서 무릎을 조금 굽히고 손잡이를 잡습니다.','몸통을 세운 채 손잡이를 배 쪽으로 당깁니다.','허리를 말거나 반동을 쓰지 않고 돌아옵니다.'],'발판과 좌석이 있는 로우 장비를 사용하세요.'),
      ('dumbbell_bench_press','덤벨 벤치 프레스','push','Chest',['dumbbell','bench'],['shoulder','elbow','wrist'],['안정적인 벤치에 누워 두 발을 바닥에 둡니다.','가벼운 덤벨을 가슴 옆에서 위로 밀어 올립니다.','어깨가 불편하지 않은 범위까지 천천히 내립니다.'],'무거운 덤벨을 혼자 눕거나 일어나며 다루지 마세요.'),
      ('dumbbell_floor_press','덤벨 플로어 프레스','push','Chest',['dumbbell'],['shoulder','elbow','wrist'],['바닥에 누워 무릎을 세우고 덤벨을 가슴 옆에 둡니다.','팔꿈치를 몸통에서 과하게 벌리지 않고 위로 밉니다.','위팔이 바닥에 가볍게 닿는 범위까지 내립니다.'],'팔꿈치를 바닥에 세게 부딪히지 마세요.'),
      ('dumbbell_rdl','덤벨 루마니안 데드리프트','hinge','Glutes',['dumbbell'],['back','hip','knee'],['가벼운 덤벨을 허벅지 앞에 들고 무릎을 조금 굽힙니다.','등의 중립을 유지하며 엉덩이를 뒤로 보냅니다.','덤벨을 다리 가까이 두고 고관절을 펴 일어섭니다.'],'바닥에 닿는 깊이보다 허리 정렬을 우선하세요.'),
      ('barbell_rdl','바벨 루마니안 데드리프트','hinge','Glutes',['barbell'],['back','hip','knee'],['가벼운 바를 허벅지 앞에 잡고 무릎을 조금 굽힙니다.','바가 다리 가까이를 지나도록 엉덩이를 뒤로 보냅니다.','등의 중립을 유지하며 고관절을 펴 일어섭니다.'],'기본 힙 힌지를 익히고 지도받은 뒤 시도하세요.'),
      ('barbell_bench_press','바벨 벤치 프레스','push','Chest',['barbell','bench','safety_rack'],['shoulder','elbow','wrist'],['안전바 높이와 보조자를 확인하고 벤치에 눕습니다.','가벼운 바를 가슴 쪽으로 천천히 내립니다.','손목과 팔꿈치를 안정적으로 유지하며 밀어 올립니다.'],'안전바와 보조자 없이 한계 중량을 시도하지 마세요.'),
      ('barbell_squat','바벨 백 스쿼트','squat','Legs',['barbell','safety_rack'],['knee','hip','back','shoulder'],['안전바를 맞추고 지도받은 위치에 바를 올립니다.','몸통을 안정적으로 유지하며 편안한 깊이까지 앉습니다.','발바닥 전체로 밀어 일어서고 랙에 바를 놓습니다.'],'지도자에게 바 위치와 안전바 사용법을 먼저 배우세요.'),
      ('dumbbell_split_squat','덤벨 스플릿 스쿼트','squat','Legs',['dumbbell'],['knee','hip','ankle','back'],['가벼운 덤벨을 옆에 들고 발을 앞뒤로 둡니다.','발 위치를 유지하고 양 무릎을 편안하게 굽힙니다.','앞발로 지지하며 올라오고 양쪽을 같은 횟수로 반복합니다.'],'맨몸으로 균형을 잡기 어렵다면 중량을 추가하지 마세요.'),
      ('dumbbell_shrug','덤벨 슈러그','accessory','Back',['dumbbell'],['shoulder','back'],['가벼운 덤벨을 몸 옆에 들고 목을 편안하게 둡니다.','어깨를 귀 쪽으로 작게 올립니다.','어깨를 돌리지 않고 천천히 내립니다.'],'목에 통증이 있으면 중단하세요.'),
      ('treadmill_walk','트레드밀 걷기','cardio','Cardio',['treadmill'],['knee','hip','ankle'],['안전 클립을 연결하고 낮은 속도로 시작합니다.','시선을 앞으로 두고 대화 가능한 속도로 걷습니다.','속도를 충분히 낮춘 뒤 벨트가 멈추면 내립니다.'],'움직이는 벨트에 갑자기 오르내리지 마세요.'),
      ('stationary_cycle','실내 자전거','cardio','Cardio',['stationary_bike'],['knee','hip'],['페달이 가장 낮을 때 무릎이 조금 굽혀지도록 안장을 맞춥니다.','낮은 저항으로 부드럽게 페달을 돌립니다.','대화 가능한 강도를 유지하고 속도를 낮춰 마칩니다.'],'안장 높이와 발 고정을 확인하세요.'),
      ('elliptical','일립티컬','cardio','Cardio',['elliptical'],['knee','hip','ankle'],['정지한 페달에 올라 손잡이를 잡습니다.','낮은 저항으로 팔과 다리를 자연스럽게 움직입니다.','속도를 낮춰 완전히 멈춘 뒤 내립니다.'],'균형이 불안정하면 다른 운동을 선택하세요.'),
      ('cable_pallof','케이블 팔로프 프레스','core','Core',['cable'],['shoulder','back'],['풀리를 가슴 높이에 맞추고 옆으로 서서 손잡이를 두 손으로 잡습니다.','몸통이 돌아가지 않도록 손을 가슴 앞에서 앞으로 뻗습니다.','천천히 돌아오고 양쪽을 같은 횟수로 수행합니다.'],'낮은 부하에서 몸통이 흔들리지 않는 범위로 수행하세요.'),
    ]
    result=[]
    for id,name,pattern,category,equipment,avoid,steps,caution in rows:
        regions=['전신'] if category=='Cardio' else ['몸통'] if category=='Core' else ['하체'] if category in ('Legs','Glutes') else ['상체']
        item=movement(id,name,pattern,regions,equipment,avoid,steps,caution)
        item.update(category=category,english_name=id.replace('_',' ').title())
        if id in ('barbell_rdl','barbell_bench_press','barbell_squat'):
            item.update(difficulty='advanced',auto_recommend=False)
        if id in ('wall_sit','knee_side_plank'):
            item.update(dose_type='hold',reps='10–20초 유지',hold_seconds=20)
        if id in ('standing_knee_crunch','clamshell','prone_y','stationary_cycle','machine_chest_press','machine_row','leg_press','seated_leg_curl'):
            item['easy']=True
        result.append(item)
    return result
