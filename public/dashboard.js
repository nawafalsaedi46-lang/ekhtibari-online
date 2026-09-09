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

let dashboardAnnouncementId = null;


async function loadAnnouncement(){

  try{

    const data =
      await dashboardApi(
        "/api/announcement"
      );

    const announcement =
      data.announcement;

    if(!announcement){
      return;
    }

    dashboardAnnouncementId =
      announcement.id;

    document.getElementById(
      "announcementModalTitle"
    ).textContent =
      announcement.title || "";

    document.getElementById(
      "announcementModalBody"
    ).textContent =
      announcement.body || "";

    const date =
      new Date(
        announcement.createdAt
      );

    document.getElementById(
      "announcementModalDate"
    ).textContent =
      Number.isNaN(date.getTime())
        ? ""
        : "تاريخ النشر: " +
          date.toLocaleString("ar-SA");

    const modal =
      document.getElementById(
        "announcementModal"
      );

    modal.classList.add(
      "show"
    );

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

  }catch(error){

    console.error(
      "تعذر تحميل رسالة الإدارة",
      error
    );

  }

}


document
  .getElementById(
    "announcementReadBtn"
  )
  .addEventListener(
    "click",
    async () => {

      if(!dashboardAnnouncementId){
        return;
      }

      const button =
        document.getElementById(
          "announcementReadBtn"
        );

      button.disabled =
        true;

      button.textContent =
        "جاري الحفظ...";

      try{

        await dashboardApi(
          "/api/announcement/" +
          encodeURIComponent(
            dashboardAnnouncementId
          ) +
          "/read",
          {
            method:"POST"
          }
        );

        document
          .getElementById(
            "announcementModal"
          )
          .classList
          .remove("show");

        document
          .getElementById(
            "announcementModal"
          )
          .setAttribute(
            "aria-hidden",
            "true"
          );

        dashboardAnnouncementId =
          null;

      }catch(error){

        console.error(error);

        button.disabled =
          false;

        button.textContent =
          "✅ تم الاطلاع";

      }

    }
  );


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
loadAnnouncement();
