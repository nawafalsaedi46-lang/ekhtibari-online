async function adminApi(url,options={}){
  const r=await fetch(url,{...options,credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})}});
  if(r.status===401||r.status===403){location.href="/admin-login";throw new Error("ط§ظ†طھظ‡طھ ط§ظ„ط¬ظ„ط³ط©")}
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"ط­ط¯ط« ط®ط·ط£");
  return d;
}
function msg(text,error=false){
  const el=document.getElementById("adminMessage");
  el.textContent=text||"";el.style.color=error?"#b91c1c":"#075e54";
}
async function loadTeachers(){
  const d=await adminApi("/api/admin/teachers");
  document.getElementById("teacherCount").textContent=d.teachers.length;
  const body=document.getElementById("teachersTableBody");
  body.innerHTML=d.teachers.map(t=>`
    <tr>
      <td>${t.name}</td>
      <td><strong>${t.license}</strong></td>
      <td class="${t.active?"status-active":"status-disabled"}">${t.active?"ظ†ط´ط·":"ظ…ظˆظ‚ظˆظپ"}</td>
      <td>${t.examCount}</td>
      <td>
        <button class="mini-btn ${t.active?"delete":"edit"}" onclick="toggleTeacher('${t.id}',${!t.active})">${t.active?"ط¥ظٹظ‚ط§ظپ":"طھظپط¹ظٹظ„"}</button>
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</button>
        <button class="mini-btn delete" ${t.active?'disabled title="ط£ظˆظ‚ظپ ط§ظ„ظ…ط¹ظ„ظ… ط£ظˆظ„ظ‹ط§"':''} onclick="deleteTeacher('${t.id}','${t.name.replaceAll("'","")}',${t.active})">ط­ط°ظپ</button>
      </td>
    </tr>`).join("");
}
document.getElementById("createTeacherForm").addEventListener("submit",async e=>{
  e.preventDefault();msg("ط¬ط§ط±ظٹ ط§ظ„ط¥ظ†ط´ط§ط،...");
  try{
    const d=await adminApi("/api/admin/teachers",{method:"POST",body:JSON.stringify({
      name:document.getElementById("teacherName").value.trim(),
      password:document.getElementById("teacherPassword").value,
    })});
    msg(`طھظ… ط¥ظ†ط´ط§ط، ط§ظ„ظ…ط¹ظ„ظ… âœ… ط±ظ‚ظ… ط§ظ„طھط±ط®ظٹطµ: ${d.teacher.license}`);
    e.target.reset(); await loadTeachers();
  }catch(e){msg(e.message,true)}
});
async function toggleTeacher(id,active){
  try{await adminApi(`/api/admin/teachers/${id}`,{method:"PATCH",body:JSON.stringify({active})});await loadTeachers()}
  catch(e){msg(e.message,true)}
}
async function resetTeacherPassword(id,name){
  const password=prompt(`ط§ظƒطھط¨ ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± ط§ظ„ط¬ط¯ظٹط¯ط© ظ„ظ„ظ…ط¹ظ„ظ…: ${name}`);
  if(!password)return;
  if(password.length<6){alert("ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± 6 ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„.");return}
  try{await adminApi(`/api/admin/teachers/${id}`,{method:"PATCH",body:JSON.stringify({password})});msg("طھظ… طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط± âœ…")}
  catch(e){msg(e.message,true)}
}
async function deleteTeacher(id,name,active){

  if(active){
    alert("ط£ظˆظ‚ظپ ط§ظ„ظ…ط¹ظ„ظ… ط£ظˆظ„ظ‹ط§ ظ‚ط¨ظ„ ط§ظ„ط­ط°ظپ.");
    return;
  }

  if(!confirm(`ط­ط°ظپ ط§ظ„ظ…ط¹ظ„ظ… "${name}" ظ†ظ‡ط§ط¦ظٹظ‹ط§طں ط³ظٹطھظ… ط­ط°ظپ ط§ط®طھط¨ط§ط±ط§طھظ‡ ط£ظٹط¶ظ‹ط§.`)){
    return;
  }

  try{

    await adminApi(`/api/admin/teachers/${id}`,{
      method:"DELETE"
    });

    msg("طھظ… ط­ط°ظپ ط§ظ„ظ…ط¹ظ„ظ… âœ…");
    await loadTeachers();

  }catch(e){

    msg(e.message,true);

  }
}
document.getElementById("adminLogoutBtn").addEventListener("click",async()=>{
  await fetch("/api/auth/logout",{method:"POST"});location.href="/admin-login";
});
window.toggleTeacher=toggleTeacher;window.resetTeacherPassword=resetTeacherPassword;window.deleteTeacher=deleteTeacher;
loadTeachers().catch(()=>{});
