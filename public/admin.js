async function adminApi(url,options={}){
  const r=await fetch(url,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  if(r.status===401||r.status===403){location.href="/admin-login";throw new Error("\u0627\u0646\u062a\u0647\u062a \u0627\u0644\u062c\u0644\u0633\u0629")}
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"\u062d\u062f\u062b \u062e\u0637\u0623");
  return d;
}

function msg(text,error=false){
  const el=document.getElementById("adminMessage");
  el.textContent=text||"";
  el.style.color=error?"#b91c1c":"#075e54";
}

let allTeachers=[];

function safeArg(value){
  return encodeURIComponent(String(value||"")).replaceAll("'","%27");
}

function renderTeachers(list){
  document.getElementById("teacherCount").textContent=list.length;
  const body=document.getElementById("teachersTableBody");

  body.innerHTML=list.map(t=>`
    <tr>
      <td>${t.name}</td>
      <td><strong>${t.license}</strong></td>
      <td class="${t.active?"status-active":"status-disabled"}">
        ${t.active?"&#1606;&#1588;&#1591;":"&#1605;&#1608;&#1602;&#1608;&#1601;"}
      </td>
      <td>${t.expiresAt||"&#1583;&#1575;&#1574;&#1605;"}</td>
      <td>${t.examCount}</td>
      <td>
        <button
          class="mini-btn ${t.active?"delete":"edit"}"
          onclick="toggleTeacher('${t.id}',${!t.active})"
        >
          ${t.active?"&#1573;&#1610;&#1602;&#1575;&#1601;":"&#1578;&#1601;&#1593;&#1610;&#1604;"}
        </button>

        <button
          class="mini-btn edit"
          onclick="resetTeacherPassword('${t.id}','${safeArg(t.name)}')"
        >
          &#1578;&#1594;&#1610;&#1610;&#1585; &#1603;&#1604;&#1605;&#1577; &#1575;&#1604;&#1605;&#1585;&#1608;&#1585;
        </button>

        <button
          class="mini-btn delete"
          ${t.active?'disabled title="Stop teacher first"':""}
          onclick="deleteTeacher('${t.id}','${safeArg(t.name)}',${t.active})"
        >
          &#1581;&#1584;&#1601;
        </button>
      </td>
    </tr>
  `).join("");
}

async function loadTeachers(){
  const d=await adminApi("/api/admin/teachers");
  allTeachers=d.teachers;
  renderTeachers(allTeachers);
}

document.getElementById("teacherSearch").addEventListener("input",function(){
  const q=this.value.trim().toUpperCase();

  if(!q){
    renderTeachers(allTeachers);
    return;
  }

  renderTeachers(
    allTeachers.filter(t=>
      String(t.license||"").toUpperCase().includes(q)
    )
  );
});

document.getElementById("createTeacherForm").addEventListener("submit",async e=>{
  e.preventDefault();
  msg("\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0646\u0634\u0627\u0621...");

  try{
    const d=await adminApi("/api/admin/teachers",{
      method:"POST",
      body:JSON.stringify({
        name:document.getElementById("teacherName").value.trim(),
        password:document.getElementById("teacherPassword").value,
        expiresAt:document.getElementById("expiresAt").value||null
      })
    });

    msg("\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0645\u0639\u0644\u0645 \u2705 \u0631\u0642\u0645 \u0627\u0644\u062a\u0631\u062e\u064a\u0635: "+d.teacher.license);

    e.target.reset();
    await loadTeachers();

  }catch(e){
    msg(e.message,true);
  }
});

async function toggleTeacher(id,active){
  try{
    await adminApi(`/api/admin/teachers/${id}`,{
      method:"PATCH",
      body:JSON.stringify({active})
    });

    await loadTeachers();

  }catch(e){
    msg(e.message,true);
  }
}

async function resetTeacherPassword(id,encodedName){
  const name=decodeURIComponent(encodedName);
  const password=prompt("\u0627\u0643\u062a\u0628 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0644\u0644\u0645\u0639\u0644\u0645: "+name);

  if(!password)return;

  if(password.length<6){
    alert("\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.");
    return;
  }

  try{
    await adminApi(`/api/admin/teachers/${id}`,{
      method:"PATCH",
      body:JSON.stringify({password})
    });

    msg("\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u2705");

  }catch(e){
    msg(e.message,true);
  }
}

async function deleteTeacher(id,encodedName,active){

  if(active){
    alert("\u0623\u0648\u0642\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0623\u0648\u0644\u064b\u0627 \u0642\u0628\u0644 \u0627\u0644\u062d\u0630\u0641.");
    return;
  }

  const name=decodeURIComponent(encodedName);

  if(!confirm(
    name+"\n\u062d\u0630\u0641 \u0627\u0644\u0645\u0639\u0644\u0645 \u0646\u0647\u0627\u0626\u064a\u064b\u0627\u061f \u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u062e\u062a\u0628\u0627\u0631\u0627\u062a\u0647 \u0623\u064a\u0636\u064b\u0627."
  )){
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
  await fetch("/api/auth/logout",{method:"POST"});
  location.href="/admin-login";
});

window.toggleTeacher=toggleTeacher;
window.resetTeacherPassword=resetTeacherPassword;
window.deleteTeacher=deleteTeacher;

loadTeachers().catch(()=>{});