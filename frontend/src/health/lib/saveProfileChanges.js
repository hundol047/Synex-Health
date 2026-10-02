// Only acknowledged requests are described as saved; network errors may have committed.
export async function saveProfileChanges(api,health,exercise,onHealthSaved){
 let healthSaved=false;
 if(health){
  try{await api.updateProfile(health);healthSaved=true;onHealthSaved?.(health);}
  catch(error){throw Error(`내 정보 저장을 확인하지 못했습니다. 운동 목표·안전 문진 저장은 아직 요청하지 않았습니다. ${error.message}`);}
 }
 try{await api.updateExerciseProfile(exercise);}
 catch(error){throw Error(`${healthSaved?'키·성별은 저장되었습니다. ':''}운동 목표·안전 문진 저장을 확인하지 못했습니다. 입력은 화면에 유지됩니다. 연결을 확인하고 다시 저장하세요. ${error.message}`);}
}
