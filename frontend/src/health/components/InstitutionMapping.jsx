import React,{useState} from 'react';
import {api} from '../../shared/lib/api.js';
export default function InstitutionMapping({users,schools,onSaved}){
 const [uid,setUid]=useState(''),[schoolUser,setSchoolUser]=useState(''),[subject,setSubject]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const selected=users.find(u=>u.id===uid);
 async function submit(e){e.preventDefault();setBusy(true);try{await api(`/api/admin/users/${encodeURIComponent(uid)}/inbody-mapping`,{school_id:selected.school_id,school_user_id:schoolUser.trim(),subject:subject.trim()},{method:'PUT'});setSchoolUser('');setSubject('');setMessage('기관 매핑을 저장했습니다. 실제 동기화 성공 전까지 연결 완료가 아닙니다.');onSaved();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <details><summary>검증된 기관 사용자 매핑</summary><p>학교가 검증한 ID만 등록하세요. 외부 subject는 학생이 직접 수정할 수 없습니다.</p><form onSubmit={submit}><label>Synex 학생<select required value={uid} onChange={e=>setUid(e.target.value)}><option value="">선택</option>{users.filter(u=>u.role==='student'&&u.school_id).map(u=><option key={u.id} value={u.id}>{u.name} · {schools.find(s=>s.id===u.school_id)?.name||u.school_id}</option>)}</select></label><label>검증된 학교 사용자 ID<input required value={schoolUser} onChange={e=>setSchoolUser(e.target.value)} autoComplete="off"/></label><label>InBody 외부 subject<input required value={subject} onChange={e=>setSubject(e.target.value)} autoComplete="off"/></label><button className="btn btn-primary" disabled={busy||!selected}>매핑 저장</button></form><p role="status">{message}</p></details>;
}
