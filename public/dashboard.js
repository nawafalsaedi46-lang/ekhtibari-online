async function dashboardApi(url,options={}){
  const r=await fetch(url,options);

  if(r.status===401 || r.status===403){
    location.href="/";
    throw new Error("انتهت الجلسة");
  }

  const d=await r.json().catch(()=>({}));

  if(!r.ok){
    throw new Error(d.error||"حدث خطأ");
  }

  return d;
}

async function loadDashboard(){

  try{

    const me=await dashboardApi("/api/me");
    const exams=await dashboardApi("/api/exams");

    document.getElementById("teacherName").textContent=
      me.teacher.name;

    document.getElementById("teacherLicense").textContent=
      me.teacher.license;

    document.getElementById("expiresAt").textContent=
      me.teacher.expiresAt || "غير محدد";

    document.getElementById("examCount").textContent=
      exams.exams.length;

    const list=document.getElementById("recentExams");

    if(!exams.exams.length){
      list.innerHTML=
        '<div class="empty">لا توجد اختبارات محفوظة حتى الآن.</div>';
      return;
    }

    list.innerHTML=exams.exams.slice(0,5).map(ex=>`
      <div class="exam-row">
        <div>
          <strong>${escapeHtml(ex.name)}</strong>
          <span>
            آخر تحديث:
            ${new Date(ex.updatedAt).toLocaleDateString("ar-SA")}
          </span>
        </div>

        <a href="/teacher?exam=${encodeURIComponent(ex.id)}">فتح</a>
      </div>
    `).join("");

  }catch(e){
    console.error(e);
  }
}

function escapeHtml(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


document.getElementById("logoutBtn").addEventListener("click",async()=>{
  await fetch("/api/auth/logout",{method:"POST"});
  location.href="/";
});

loadDashboard();
