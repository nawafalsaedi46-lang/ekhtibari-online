async function adminApi(url,options={}){
  const r=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  if(r.status===401||r.status===403){location.href="/admin-login";throw new Error("انتهت الجلسة")}
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"حدث خطأ");
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
      <td class="${t.active?"status-active":"status-disabled"}">${t.active?"نشط":"موقوف"}</td>
      <td>${t.expiresAt||"دائم"}</td>
      <td>${t.examCount}</td>
      <td>
        <button class="mini-btn ${t.active?"delete":"edit"}" onclick="toggleTeacher('${t.id}',${!t.active})">${t.active?"إيقاف":"تفعيل"}</button>
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">تغيير كلمة المرور</button>
        <button class="mini-btn delete" ${t.active?'disabled title="Stop teacher first"':''} onclick="deleteTeacher('${t.id}',${t.active})">\u062d\u0630\u0641</button>
      </td>
    </tr>`).join("");
}
document.getElementById("createTeacherForm").addEventListener("submit",async e=>{
  e.preventDefault();msg("جاري الإنشاء...");
  try{
    const d=await adminApi("/api/admin/teachers",{method:"POST",body:JSON.stringify({
      name:document.getElementById("teacherName").value.trim(),
      password:document.getElementById("teacherPassword").value,
      expiresAt:document.getElementById("expiresAt").value||null
    })});
    msg(`تم إنشاء المعلم ✅ رقم الترخيص: ${d.teacher.license}`);
    e.target.reset(); await loadTeachers();
  }catch(e){msg(e.message,true)}
});
async function toggleTeacher(id,active){
  try{await adminApi(`/api/admin/teachers/${id}`,{method:"PATCH",body:JSON.stringify({active})});await loadTeachers()}
  catch(e){msg(e.message,true)}
}
async function resetTeacherPassword(id,name){
  const password=prompt(`اكتب كلمة المرور الجديدة للمعلم: ${name}`);
  if(!password)return;
  if(password.length<6){alert("كلمة المرور 6 أحرف على الأقل.");return}
  try{await adminApi(`/api/admin/teachers/${id}`,{method:"PATCH",body:JSON.stringify({password})});msg("تم تغيير كلمة المرور ✅")}
  catch(e){msg(e.message,true)}
}

async function deleteTeacher(id,active){
  if(active){
    alert("\u0623\u0648\u0642\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u0648\u0644\u0627\u064b \u0642\u0628\u0644 \u0627\u0644\u062d\u0630\u0641.");
    return;
  }

  if(!confirm("\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0646\u0647\u0627\u0626\u064a\u0627\u064b\u061f")){
    return;
  }

  try{
    await adminApi(`/api/admin/teachers/${id}`,{
      method:"DELETE"
    });

    msg("\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u2705");
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
