import {it,expect,vi} from 'vitest';
import {saveProfileChanges} from '../src/health/lib/saveProfileChanges.js';
it('reports acknowledged health updates separately and permits retry without rewriting them',async()=>{
 const api={updateProfile:vi.fn(async()=>{}),updateExerciseProfile:vi.fn().mockRejectedValueOnce(Error('연결 끊김')).mockResolvedValueOnce({})},ack=vi.fn();
 await expect(saveProfileChanges(api,{height:180},{safety_chest_pain:true},ack)).rejects.toThrow('키·성별은 저장되었습니다.');
 expect(ack).toHaveBeenCalledWith({height:180});await saveProfileChanges(api,null,{safety_chest_pain:true},ack);
 expect(api.updateProfile).toHaveBeenCalledTimes(1);expect(api.updateExerciseProfile).toHaveBeenCalledTimes(2);
});
it('never requests safety changes if the health request is unconfirmed',async()=>{
 const api={updateProfile:vi.fn(async()=>{throw Error('연결 끊김');}),updateExerciseProfile:vi.fn()},ack=vi.fn();
 await expect(saveProfileChanges(api,{height:180},{},ack)).rejects.toThrow('아직 요청하지 않았습니다');expect(api.updateExerciseProfile).not.toHaveBeenCalled();expect(ack).not.toHaveBeenCalled();
});
