async function api(url,options={}){
  const r=await fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });

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

function esc(v=""){
  return String(v)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function loadExams(){

  const box=document.getElementById("examList");

  try{

    const d=await api("/api/exams");

    if(!d.exams.length){
      box.innerHTML="لا توجد اختبارات محفوظة حتى الآن.";
      return;
    }

    box.className="";

    box.innerHTML=d.exams.map(ex=>`
      <div class="exam">

        <div>📝</div>

        <div class="info">
          <strong>${esc(ex.name)}</strong>
          <span>
            آخر تعديل:
            ${new Date(ex.updatedAt).toLocaleString("ar-SA")}
          </span>
        </div>

        <div class="actions">

          <a
            class="open"
            href="/teacher?exam=${encodeURIComponent(ex.id)}"
          >
            فتح
          </a>

          <button
            class="delete"
            onclick="deleteExam('${ex.id}')"
          >
            حذف
          </button>

        </div>

      </div>
    `).join("");

  }catch(e){
    box.textContent=e.message;
  }
}

async function deleteExam(id){

  if(!confirm("هل تريد حذف الاختبار نهائيًا؟")){
    return;
  }

  try{

    await api("/api/exams/"+encodeURIComponent(id),{
      method:"DELETE"
    });

    await loadExams();

  }catch(e){
    alert(e.message);
  }
}

window.deleteExam=deleteExam;

loadExams();
