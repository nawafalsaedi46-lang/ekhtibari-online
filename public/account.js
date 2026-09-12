let currentAccountExamId = null;
let currentAccountTeacher = null;

function accountSnapshot(){
  const form = {};
  formIds.forEach(id=>form[id]=document.getElementById(id)?.value ?? "");
  return {
    questions,
    currentVersion,
    form,
    schoolLogoData
  };
}

function applyAccountSnapshot(data){
  if(!data) return;
  questions = Array.isArray(data.questions) ? data.questions : [];
  currentVersion = data.currentVersion === "answer" ? "answer" : "student";
  if(data.form){
    Object.entries(data.form).forEach(([id,v])=>{
      const el=document.getElementById(id);
      if(el) el.value=v ?? "";
    });
  }
  schoolLogoData = data.schoolLogoData || "";
  resetEditor();
  renderQuestionsList();
  renderPreview();
}

async function api(url,options={}){
  const r=await fetch(url,{
    ...options,
    headers:{"Content-Type":"application/json",...(options.headers||{})}
  });
  if(r.status===401 || r.status===403){
    location.href="/";
    throw new Error("انتهت الجلسة");
  }
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||"حدث خطأ");
  return d;
}

function setAccountStatus(text,isError=false){
  const el=document.getElementById("accountSaveStatus");
  el.textContent=text||"";
  el.style.color=isError?"#b91c1c":"#075e54";
}

async function loadAccount(){
  try{
    const me=await api("/api/me");
    currentAccountTeacher=me.teacher;

    if(typeof window.useTeacherWorkspace === "function"){
      window.useTeacherWorkspace(me.teacher.id);
    }

    document.getElementById("accountTeacherName").textContent=me.teacher.name;
    document.getElementById("accountLicense").textContent=me.teacher.license;
    await loadExamList();

    const requestedExamId =
      new URLSearchParams(location.search).get("exam");

    if(requestedExamId){
      await openAccountExam(requestedExamId);
    }

  }catch(e){}
}

async function loadExamList(){
  const list=document.getElementById("savedExamsList");
  try{
    const d=await api("/api/exams");
    if(!d.exams.length){
      list.innerHTML='<div class="empty-questions">لا توجد اختبارات محفوظة في حسابك حتى الآن.</div>';
      return;
    }
    list.innerHTML=d.exams.map(ex=>`
      <div class="saved-exam-card">
        <div>
          <strong>${escapeHTML(ex.name)}</strong>
          <div class="saved-exam-meta">آخر تحديث: ${new Date(ex.updatedAt).toLocaleString("ar-SA")}</div>
        </div>
        <div class="saved-exam-actions">
          <button class="mini-btn edit" onclick="openAccountExam('${ex.id}')">فتح</button>
          <button class="mini-btn delete" onclick="deleteAccountExam('${ex.id}')">حذف</button>
        </div>
      </div>`).join("");
  }catch(e){list.innerHTML=`<div class="auth-error">${escapeHTML(e.message)}</div>`}
}

async function saveAccountExam(){
  const name=document.getElementById("examSaveName").value.trim();
  if(!name){setAccountStatus("اكتب اسم الاختبار أولًا.",true);return}
  setAccountStatus("جاري الحفظ...");
  try{
    const body=JSON.stringify({name,data:accountSnapshot()});
    const d=currentAccountExamId
      ? await api(`/api/exams/${currentAccountExamId}`,{method:"PUT",body})
      : await api("/api/exams",{method:"POST",body});
    currentAccountExamId=d.exam.id;
    setAccountStatus("تم حفظ الاختبار في حسابك ✅");
    await loadExamList();
  }catch(e){setAccountStatus(e.message,true)}
}

async function openAccountExam(id){
  try{
    const d=await api(`/api/exams/${id}`);
    currentAccountExamId=d.exam.id;
    document.getElementById("examSaveName").value=d.exam.name;
    applyAccountSnapshot(d.exam.data);

    setSavedExamsVisible(false);

    setAccountStatus(`تم فتح: ${d.exam.name}`);
    window.scrollTo({top:0,behavior:"smooth"});
  }catch(e){setAccountStatus(e.message,true)}
}

async function deleteAccountExam(id){
  if(!confirm("هل تريد حذف هذا الاختبار من حسابك؟")) return;
  try{
    await api(`/api/exams/${id}`,{method:"DELETE"});
    if(currentAccountExamId===id){
      currentAccountExamId=null;
      document.getElementById("examSaveName").value="";
    }
    setAccountStatus("تم حذف الاختبار.");
    await loadExamList();
  }catch(e){setAccountStatus(e.message,true)}
}

function newAccountExam(){
  if(!confirm("بدء اختبار جديد؟ تأكد أنك حفظت الاختبار الحالي إذا كنت تحتاجه.")) return;
  currentAccountExamId=null;
  document.getElementById("examSaveName").value="";
  questions=[]; schoolLogoData=""; currentVersion="student";
  formIds.forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    if(id==="teacherGender")el.value="معلم";
    else if(id==="questionFontSize")el.value="14";
    else if(id==="paperFrame")el.value="official";
    else if(id==="endMessage")el.value="( انتهت الأسئلة )";
    else el.value="";
  });
  resetEditor();
  refreshAll();

  setSavedExamsVisible(false);

  setAccountStatus(
    "اختبار جديد — الاختبارات السابقة محفوظة في حسابك."
  );
}

function setSavedExamsVisible(show){

  const list =
    document.getElementById("savedExamsList");

  const btn =
    document.getElementById("toggleSavedExamsBtn");

  if(list){
    list.style.display =
      show ? "block" : "none";
  }

  if(btn){
    btn.textContent =
      show
        ? "📁 إخفاء الاختبارات المحفوظة"
        : "📂 عرض الاختبارات المحفوظة";
  }
}


document
  .getElementById("toggleSavedExamsBtn")
  .addEventListener("click",()=>{

    const list =
      document.getElementById("savedExamsList");

    const visible =
      list &&
      list.style.display !== "none";

    setSavedExamsVisible(!visible);
  });


document.getElementById("saveToAccountBtn").addEventListener("click",saveAccountExam);
document.getElementById("newExamBtn").addEventListener("click",newAccountExam);

window.openAccountExam=openAccountExam;
window.deleteAccountExam=deleteAccountExam;
loadAccount();
