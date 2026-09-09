let teachers = [];
let deletedTeachers = [];
let currentView = "teachers";


async function api(url, options = {}) {

  const response = await fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  if(response.status === 401 || response.status === 403){
    location.href = "/admin-login";
    throw new Error("انتهت جلسة الإدارة.");
  }

  const data =
    await response.json().catch(() => ({}));

  if(!response.ok){
    throw new Error(
      data.error || "حدث خطأ."
    );
  }

  return data;
}


function message(text,error=false){

  const element =
    document.getElementById("adminMessage");

  element.textContent = text || "";

  element.style.color =
    error ? "#b91c1c" : "#075e54";
}


function clean(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function formatDeletedDate(value){

  if(!value){
    return "-";
  }

  const date = new Date(value);

  if(Number.isNaN(date.getTime())){
    return "-";
  }

  return date.toLocaleString("ar-SA");
}


function searchValue(){

  return document
    .getElementById("adminSearch")
    .value
    .trim()
    .toLowerCase();
}


function matchesSearch(teacher){

  const query = searchValue();

  if(!query){
    return true;
  }

  return (
    String(teacher.name || "")
      .toLowerCase()
      .includes(query)
    ||
    String(teacher.license || "")
      .toLowerCase()
      .includes(query)
  );
}


function renderTeachers(){

  const list =
    teachers.filter(matchesSearch);

  document.getElementById(
    "teacherCount"
  ).textContent = teachers.length;

  const body =
    document.getElementById(
      "teachersTableBody"
    );

  if(!list.length){

    body.innerHTML =
      '<tr><td colspan="6" class="trash-empty">لا توجد نتائج.</td></tr>';

    return;
  }

  body.innerHTML =
    list.map(t => {

      const safeName = clean(t.name);
      const safeLicense = clean(t.license);

      return `
        <tr>

          <td>${safeName}</td>

          <td class="license-cell">
            ${safeLicense}
          </td>

          <td class="${
            t.active
              ? "status-active"
              : "status-disabled"
          }">
            ${
              t.active
                ? "نشط"
                : "موقوف"
            }
          </td>

          <td>
            ${clean(t.expiresAt || "دائم")}
          </td>

          <td>
            ${Number(t.examCount || 0)}
          </td>

          <td>

            <button
              class="mini-btn edit"
              onclick="openTeacherProfile(
                '${t.id}'
              )"
            >
              👤 الملف
            </button>

            <button
              class="mini-btn ${
                t.active ? "delete" : "edit"
              }"
              onclick="toggleTeacher(
                '${t.id}',
                ${!t.active}
              )"
            >
              ${t.active ? "إيقاف" : "تفعيل"}
            </button>

            <button
              class="mini-btn edit"
              onclick="renewTeacher(
                '${t.id}',
                '${clean(t.expiresAt || "")}'
              )"
            >
              🔄 تجديد
            </button>

            <button
              class="mini-btn edit"
              onclick="changePassword(
                '${t.id}',
                '${safeName}'
              )"
            >
              تغيير كلمة المرور
            </button>

            <button
              class="mini-btn delete"
              onclick="moveToTrash(
                '${t.id}',
                '${safeName}',
                '${safeLicense}'
              )"
            >
              🗑️ حذف
            </button>

          </td>

        </tr>
      `;

    }).join("");
}


function renderTrash(){

  const list =
    deletedTeachers.filter(matchesSearch);

  document.getElementById(
    "trashCount"
  ).textContent =
    deletedTeachers.length;

  document.getElementById(
    "trashTabCount"
  ).textContent =
    deletedTeachers.length;

  const body =
    document.getElementById(
      "trashTableBody"
    );

  if(!list.length){

    body.innerHTML =
      '<tr><td colspan="6" class="trash-empty">المحذوفات فارغة.</td></tr>';

    return;
  }

  body.innerHTML =
    list.map(t => {

      const safeName = clean(t.name);
      const safeLicense = clean(t.license);

      return `
        <tr>

          <td>${safeName}</td>

          <td class="license-cell">
            ${safeLicense}
          </td>

          <td>
            ${clean(
              formatDeletedDate(t.deletedAt)
            )}
          </td>

          <td>
            ${clean(t.expiresAt || "دائم")}
          </td>

          <td>
            ${Number(t.examCount || 0)}
          </td>

          <td>

            <button
              class="mini-btn edit"
              onclick="restoreTeacher(
                '${t.id}',
                '${safeName}',
                '${safeLicense}'
              )"
            >
              ♻️ استعادة
            </button>

            <button
              class="mini-btn delete"
              onclick="permanentDelete(
                '${t.id}',
                '${safeName}',
                '${safeLicense}'
              )"
            >
              ❌ حذف نهائي
            </button>

          </td>

        </tr>
      `;

    }).join("");
}


async function loadStats(){

  const data =
    await api("/api/admin/stats");

  const stats =
    data.stats || {};

  document.getElementById(
    "statTotalTeachers"
  ).textContent =
    Number(stats.totalTeachers || 0);

  document.getElementById(
    "statActiveTeachers"
  ).textContent =
    Number(stats.activeTeachers || 0);

  document.getElementById(
    "statStoppedTeachers"
  ).textContent =
    Number(stats.stoppedTeachers || 0);

  document.getElementById(
    "statExpiredTeachers"
  ).textContent =
    Number(stats.expiredTeachers || 0);

  document.getElementById(
    "statExpiringSoon"
  ).textContent =
    Number(stats.expiringSoon || 0);

  document.getElementById(
    "statTrashTeachers"
  ).textContent =
    Number(stats.trashTeachers || 0);

  document.getElementById(
    "statTotalExams"
  ).textContent =
    Number(stats.totalExams || 0);

  document.getElementById(
    "statMonthExams"
  ).textContent =
    Number(stats.monthExams || 0);
}


async function loadTeachers(){

  const data =
    await api("/api/admin/teachers");

  teachers =
    data.teachers || [];

  renderTeachers();
}


async function loadTrash(){

  const data =
    await api(
      "/api/admin/teachers/trash"
    );

  deletedTeachers =
    data.teachers || [];

  renderTrash();
}


async function refreshAll(){

  await Promise.all([
    loadStats(),
    loadTeachers(),
    loadTrash()
  ]);
}


function showTeachers(){

  currentView = "teachers";

  document
    .getElementById("teachersSection")
    .classList.remove("hidden");

  document
    .getElementById("trashSection")
    .classList.add("hidden");

  document
    .getElementById("teachersTabBtn")
    .classList.add("active");

  document
    .getElementById("trashTabBtn")
    .classList.remove("active");

  document.getElementById(
    "adminSearch"
  ).placeholder =
    "🔎 ابحث باسم المعلم أو رقم الترخيص";

  renderTeachers();
}


function showTrash(){

  currentView = "trash";

  document
    .getElementById("teachersSection")
    .classList.add("hidden");

  document
    .getElementById("trashSection")
    .classList.remove("hidden");

  document
    .getElementById("teachersTabBtn")
    .classList.remove("active");

  document
    .getElementById("trashTabBtn")
    .classList.add("active");

  document.getElementById(
    "adminSearch"
  ).placeholder =
    "🔎 اكتب رقم الترخيص أو اسم المعلم للاستعادة";

  renderTrash();
}


document
  .getElementById("teachersTabBtn")
  .addEventListener(
    "click",
    showTeachers
  );


document
  .getElementById("trashTabBtn")
  .addEventListener(
    "click",
    showTrash
  );


document
  .getElementById("adminSearch")
  .addEventListener(
    "input",
    () => {

      if(currentView === "trash"){
        renderTrash();
      }else{
        renderTeachers();
      }

    }
  );


document
  .getElementById("createTeacherForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      message("جاري إنشاء الحساب...");

      try{

        const data = await api(
          "/api/admin/teachers",
          {
            method:"POST",
            body:JSON.stringify({
              name:
                document
                  .getElementById(
                    "teacherName"
                  )
                  .value
                  .trim(),

              password:
                document
                  .getElementById(
                    "teacherPassword"
                  )
                  .value,

              expiresAt:
                document
                  .getElementById(
                    "expiresAt"
                  )
                  .value || null
            })
          }
        );

        message(
          "تم إنشاء المعلم ✅ رقم الترخيص: " +
          data.teacher.license
        );

        event.target.reset();

        await refreshAll();

      }catch(error){

        message(
          error.message,
          true
        );

      }

    }
  );


function formatProfileDate(value){

  if(!value){
    return "-";
  }

  const date =
    new Date(value);

  if(Number.isNaN(date.getTime())){
    return String(value);
  }

  return date.toLocaleString("ar-SA");
}


async function openTeacherProfile(id){

  try{

    const data =
      await api(
        "/api/admin/teachers/" +
        id +
        "/profile"
      );

    const t =
      data.teacher;

    document.getElementById(
      "profileTeacherId"
    ).value =
      t.id;

    document.getElementById(
      "profileTeacherName"
    ).value =
      t.name || "";

    document.getElementById(
      "profileTeacherGender"
    ).value =
      t.gender || "معلم";

    document.getElementById(
      "profileTeacherLicense"
    ).value =
      t.license || "";

    document.getElementById(
      "profileHeaderLicense"
    ).textContent =
      t.license || "";

    document.getElementById(
      "profileAdminNote"
    ).value =
      t.adminNote || "";

    document.getElementById(
      "profileStatus"
    ).textContent =
      t.active
        ? "✅ نشط"
        : "⏸️ موقوف";

    document.getElementById(
      "profileCreatedAt"
    ).textContent =
      formatProfileDate(
        t.createdAt
      );

    document.getElementById(
      "profileExpiresAt"
    ).textContent =
      t.expiresAt || "دائم";

    document.getElementById(
      "profileExamCount"
    ).textContent =
      Number(
        t.examCount || 0
      );

    document.getElementById(
      "profileLastExamAt"
    ).textContent =
      formatProfileDate(
        t.lastExamAt
      );

    const exams =
      data.recentExams || [];

    const examsBox =
      document.getElementById(
        "profileRecentExams"
      );

    if(!exams.length){

      examsBox.innerHTML =
        '<div class="trash-empty">لا توجد اختبارات حتى الآن.</div>';

    }else{

      examsBox.innerHTML =
        exams.map(exam => `

          <div class="recent-exam-row">

            <strong>
              ${clean(
                exam.name || "اختبار بدون اسم"
              )}
            </strong>

            <span class="recent-exam-date">
              ${clean(
                formatProfileDate(
                  exam.updatedAt
                )
              )}
            </span>

          </div>

        `).join("");

    }

    document
      .getElementById(
        "teacherProfileModal"
      )
      .classList
      .remove("hidden");

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


function closeTeacherProfile(){

  document
    .getElementById(
      "teacherProfileModal"
    )
    .classList
    .add("hidden");

}


document
  .getElementById(
    "closeTeacherProfileBtn"
  )
  .addEventListener(
    "click",
    closeTeacherProfile
  );


document
  .getElementById(
    "teacherProfileModal"
  )
  .addEventListener(
    "click",
    event => {

      if(
        event.target.id ===
        "teacherProfileModal"
      ){
        closeTeacherProfile();
      }

    }
  );


document
  .getElementById(
    "teacherProfileForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const id =
        document.getElementById(
          "profileTeacherId"
        ).value;

      try{

        await api(
          "/api/admin/teachers/" +
          id +
          "/profile",
          {
            method:"PATCH",
            body:JSON.stringify({

              name:
                document.getElementById(
                  "profileTeacherName"
                ).value.trim(),

              gender:
                document.getElementById(
                  "profileTeacherGender"
                ).value,

              adminNote:
                document.getElementById(
                  "profileAdminNote"
                ).value

            })
          }
        );

        message(
          "تم حفظ ملف المعلم ✅"
        );

        await refreshAll();

        await openTeacherProfile(id);

      }catch(error){

        message(
          error.message,
          true
        );

      }

    }
  );


async function toggleTeacher(
  id,
  active
){

  try{

    await api(
      "/api/admin/teachers/" + id,
      {
        method:"PATCH",
        body:JSON.stringify({
          active
        })
      }
    );

    message(
      active
        ? "تم تفعيل الحساب ✅"
        : "تم إيقاف الحساب ✅"
    );

    await refreshAll();

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


function dateOnly(date){

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2,"0");

  const day =
    String(
      date.getDate()
    ).padStart(2,"0");

  return year + "-" +
    month + "-" +
    day;
}


function addMonths(
  date,
  months
){

  const originalDay =
    date.getDate();

  const result =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
      12,0,0
    );

  result.setMonth(
    result.getMonth() + months
  );

  const lastDay =
    new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();

  result.setDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return result;
}


async function renewTeacher(
  id,
  currentExpiry
){

  const value =
    prompt(
      "اكتب عدد الأشهر للتجديد:\n\n" +
      "1 = شهر\n" +
      "3 = 3 أشهر\n" +
      "6 = 6 أشهر\n" +
      "12 = سنة"
    );

  if(value === null){
    return;
  }

  const months =
    Number(value);

  if(
    !Number.isInteger(months)
    ||
    months < 1
    ||
    months > 120
  ){

    alert(
      "اكتب عدد أشهر صحيح من 1 إلى 120."
    );

    return;
  }

  const today =
    new Date();

  today.setHours(
    12,0,0,0
  );

  let base =
    today;

  if(currentExpiry){

    const parts =
      currentExpiry
        .split("-")
        .map(Number);

    if(parts.length === 3){

      const expiry =
        new Date(
          parts[0],
          parts[1] - 1,
          parts[2],
          12,0,0
        );

      if(expiry > today){
        base = expiry;
      }
    }
  }

  const newExpiry =
    addMonths(
      base,
      months
    );

  const expiresAt =
    dateOnly(newExpiry);

  if(
    !confirm(
      "تاريخ انتهاء الاشتراك الجديد:\n" +
      expiresAt +
      "\n\nتأكيد التجديد؟"
    )
  ){
    return;
  }

  try{

    await api(
      "/api/admin/teachers/" + id,
      {
        method:"PATCH",
        body:JSON.stringify({
          expiresAt
        })
      }
    );

    message(
      "تم تجديد الاشتراك حتى " +
      expiresAt +
      " ✅"
    );

    await refreshAll();

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


async function changePassword(
  id,
  name
){

  const password =
    prompt(
      "كلمة المرور الجديدة للمعلم:\n" +
      name
    );

  if(!password){
    return;
  }

  if(password.length < 6){

    alert(
      "كلمة المرور 6 أحرف على الأقل."
    );

    return;
  }

  try{

    await api(
      "/api/admin/teachers/" + id,
      {
        method:"PATCH",
        body:JSON.stringify({
          password
        })
      }
    );

    message(
      "تم تغيير كلمة المرور ✅"
    );

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


async function moveToTrash(
  id,
  name,
  license
){

  const ok =
    confirm(
      "نقل المعلم إلى المحذوفات؟\n\n" +
      name +
      "\n" +
      license +
      "\n\n" +
      "لن تُحذف اختباراته ويمكن استعادته لاحقًا."
    );

  if(!ok){
    return;
  }

  try{

    await api(
      "/api/admin/teachers/" + id,
      {
        method:"DELETE"
      }
    );

    message(
      "تم نقل المعلم إلى المحذوفات 🗑️"
    );

    await refreshAll();

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


async function restoreTeacher(
  id,
  name,
  license
){

  const ok =
    confirm(
      "استعادة الحساب؟\n\n" +
      name +
      "\n" +
      license
    );

  if(!ok){
    return;
  }

  try{

    await api(
      "/api/admin/teachers/" +
      id +
      "/restore",
      {
        method:"PATCH"
      }
    );

    message(
      "تم استعادة الحساب بنجاح ♻️"
    );

    await refreshAll();

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


async function permanentDelete(
  id,
  name,
  license
){

  const typed =
    prompt(
      "⚠️ حذف نهائي\n\n" +
      "سيتم حذف الحساب وجميع اختباراته نهائيًا.\n" +
      "لا يمكن التراجع بعد الحذف.\n\n" +
      "المعلم: " +
      name +
      "\n\n" +
      "للتأكيد اكتب رقم الترخيص:\n" +
      license
    );

  if(typed === null){
    return;
  }

  if(
    typed.trim().toUpperCase()
    !==
    String(license)
      .trim()
      .toUpperCase()
  ){

    alert(
      "رقم الترخيص غير مطابق. لم يتم الحذف."
    );

    return;
  }

  const finalConfirm =
    confirm(
      "تأكيد أخير:\n\n" +
      "هل تريد حذف هذا الحساب نهائيًا؟"
    );

  if(!finalConfirm){
    return;
  }

  try{

    await api(
      "/api/admin/teachers/" +
      id +
      "/permanent",
      {
        method:"DELETE",
        body:JSON.stringify({
          confirmLicense:license
        })
      }
    );

    message(
      "تم حذف الحساب نهائيًا."
    );

    await refreshAll();

  }catch(error){

    message(
      error.message,
      true
    );

  }
}


document
  .getElementById("adminLogoutBtn")
  .addEventListener(
    "click",
    async () => {

      await fetch(
        "/api/auth/logout",
        {
          method:"POST"
        }
      );

      location.href =
        "/admin-login";

    }
  );


window.openTeacherProfile =
  openTeacherProfile;

window.toggleTeacher =
  toggleTeacher;

window.renewTeacher =
  renewTeacher;

window.changePassword =
  changePassword;

window.moveToTrash =
  moveToTrash;

window.restoreTeacher =
  restoreTeacher;

window.permanentDelete =
  permanentDelete;


refreshAll()
  .catch(error => {
    message(
      error.message,
      true
    );
  });
