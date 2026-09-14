(function(){
"use strict";

const $ = id => document.getElementById(id);

const teacherName = $("teacherName");

const newClassName = $("newClassName");
const createClassBtn = $("createClassBtn");
const classSelect = $("classSelect");
const deleteClassBtn = $("deleteClassBtn");

const administration = $("administration");
const school = $("school");
const academicYear = $("academicYear");
const grade = $("grade");
const semester = $("semester");
const week = $("week");
const subject = $("subject");
const registerDesign = $("registerDesign");

const studentsInput = $("studentsInput");
const studentCount = $("studentCount");

const saveBtn = $("saveBtn");
const printBtn = $("printBtn");
const saveStatus = $("saveStatus");

const printPreview = $("printPreview");
const printStyle = $("followupDynamicPrintStyle");

let classes = [];
let currentClass = null;
let saveTimer = null;


function blankData(){

  return {
    students:[],
    settings:{
      administration:"",
      school:"",
      academicYear:"",
      grade:"",
      semester:"",
      week:"",
      subject:"",
      design:"weekly"
    }
  };
}


function normalizeData(data){

  const base = blankData();

  if(!data || typeof data !== "object"){
    return base;
  }

  if(Array.isArray(data.students)){

    base.students = data.students
      .map(item=>{
        if(typeof item === "string"){
          return item.trim();
        }

        return String(item?.name || "").trim();
      })
      .filter(Boolean);
  }

  if(
    data.settings &&
    typeof data.settings === "object"
  ){
    base.settings = {
      ...base.settings,
      ...data.settings
    };
  }

  return base;
}


async function api(url,options={}){

  const response = await fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  if(response.status === 401){
    location.href = "/";
    throw new Error("يجب تسجيل الدخول");
  }

  const data =
    await response.json().catch(()=>({}));

  if(!response.ok){
    throw new Error(
      data.error || "تعذر تنفيذ العملية"
    );
  }

  return data;
}


function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function getNames(){

  return studentsInput.value
    .split(/\r?\n/)
    .map(name=>name.trim())
    .filter(Boolean);
}


function updateCount(){

  const count = getNames().length;

  studentCount.textContent =
    `${count} طالب`;
}


function readFormIntoCurrent(){

  if(!currentClass) return;

  currentClass.data =
    normalizeData(currentClass.data);

  currentClass.data.students =
    getNames();

  currentClass.data.settings = {
    administration:
      administration.value.trim(),

    school:
      school.value.trim(),

    academicYear:
      academicYear.value.trim(),

    grade:
      grade.value.trim(),

    semester:
      semester.value.trim(),

    week:
      week.value.trim(),

    subject:
      subject.value.trim(),

    design:
      registerDesign.value
  };

  updateCount();
}


function loadCurrentIntoForm(){

  if(!currentClass){

    [
      administration,
      school,
      academicYear,
      grade,
      semester,
      week,
      subject,
      studentsInput
    ].forEach(el=>el.value="");

    registerDesign.value = "weekly";

    renderPreview();
    updateCount();
    return;
  }

  currentClass.data =
    normalizeData(currentClass.data);

  const s =
    currentClass.data.settings;

  administration.value =
    s.administration || "";

  school.value =
    s.school || "";

  academicYear.value =
    s.academicYear || "";

  grade.value =
    s.grade || "";

  semester.value =
    s.semester || "";

  week.value =
    s.week || "";

  subject.value =
    s.subject || "";

  registerDesign.value =
    s.design || "weekly";

  studentsInput.value =
    currentClass.data.students.join("\n");

  updateCount();
  renderPreview();
}


function markDirty(){

  saveStatus.textContent =
    "غير محفوظ";

  saveStatus.className =
    "save-status dirty";

  readFormIntoCurrent();
  renderPreview();

  clearTimeout(saveTimer);

  if(currentClass){

    saveTimer =
      setTimeout(
        saveCurrent,
        900
      );
  }
}


function markSaved(){

  saveStatus.textContent =
    "محفوظ";

  saveStatus.className =
    "save-status";
}


function markError(){

  saveStatus.textContent =
    "تعذر الحفظ";

  saveStatus.className =
    "save-status error";
}


async function saveCurrent(){

  if(!currentClass){
    return;
  }

  readFormIntoCurrent();

  try{

    await api(
      "/api/followup-classes/" +
      encodeURIComponent(currentClass.id),
      {
        method:"PUT",
        body:JSON.stringify({
          name:currentClass.name,
          data:currentClass.data
        })
      }
    );

    markSaved();

  }catch(error){

    console.error(error);
    markError();
  }
}


function renderClassSelect(){

  const selected =
    currentClass?.id || "";

  classSelect.innerHTML =
    '<option value="">اختر الفصل</option>' +
    classes.map(item=>`
      <option
        value="${escapeHTML(item.id)}"
        ${item.id === selected ? "selected" : ""}
      >
        ${escapeHTML(item.name)}
      </option>
    `).join("");
}


async function loadClasses(){

  const result =
    await api("/api/followup-classes");

  classes =
    Array.isArray(result.followupClasses)
      ? result.followupClasses.map(item=>({
          ...item,
          data:normalizeData(item.data)
        }))
      : [];

  currentClass =
    classes[0] || null;

  renderClassSelect();
  loadCurrentIntoForm();
}


async function createClass(){

  const name =
    newClassName.value.trim();

  if(!name){

    newClassName.focus();
    return;
  }

  createClassBtn.disabled = true;

  try{

    const result =
      await api(
        "/api/followup-classes",
        {
          method:"POST",
          body:JSON.stringify({
            name:name
          })
        }
      );

    const item = {
      ...result.followupClass,
      data:normalizeData(
        result.followupClass.data
      )
    };

    classes.unshift(item);

    currentClass = item;

    newClassName.value = "";

    renderClassSelect();
    loadCurrentIntoForm();

  }catch(error){

    alert("❌ " + error.message);

  }finally{

    createClassBtn.disabled = false;
  }
}


async function deleteClass(){

  if(!currentClass){
    return;
  }

  if(
    !confirm(
      `حذف فصل "${currentClass.name}"؟`
    )
  ){
    return;
  }

  try{

    await api(
      "/api/followup-classes/" +
      encodeURIComponent(currentClass.id),
      {
        method:"DELETE"
      }
    );

    classes =
      classes.filter(
        item=>item.id !== currentClass.id
      );

    currentClass =
      classes[0] || null;

    renderClassSelect();
    loadCurrentIntoForm();

  }catch(error){

    alert("❌ " + error.message);
  }
}


function chunks(list,size){

  const result = [];

  for(
    let i=0;
    i<list.length || i===0;
    i+=size
  ){
    result.push(
      list.slice(i,i+size)
    );

    if(!list.length){
      break;
    }
  }

  return result;
}


function paddedStudents(list,size){

  const rows = [...list];

  while(rows.length < size){
    rows.push("");
  }

  return rows;
}


function ministryLogo(){

  return `
    <div class="ministry-logo">

      <img
        src="/وزارة التعليم.png"
        alt="وزارة التعليم"
        onerror="this.style.display='none'"
      >

      <strong>وزارة التعليم</strong>

    </div>
  `;
}


function commonHeader(settings){

  return `
    <div class="official-header">

      <div class="official-side right">
        <strong>المملكة العربية السعودية</strong><br>
        وزارة التعليم<br>
        الإدارة:
        ${escapeHTML(settings.administration || ".......................")}
        <br>
        المدرسة:
        ${escapeHTML(settings.school || ".......................")}
      </div>

      ${ministryLogo()}

      <div class="official-side left">
        العام الدراسي:
        ${escapeHTML(settings.academicYear || ".............")}
        <br>

        الصف:
        ${escapeHTML(settings.grade || ".............")}
        <br>

        الفصل:
        ${escapeHTML(settings.semester || ".............")}
        <br>

        الأسبوع:
        ${escapeHTML(settings.week || ".............")}
      </div>

    </div>
  `;
}


function weeklyPage(
  names,
  settings,
  pageNumber,
  totalPages
){

  const rows =
    paddedStudents(names,20);

  const days = [
    "الأحد",
    "الاثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس"
  ];

  return `
    <section class="register-sheet portrait">

      ${commonHeader(settings)}

      <h1 class="register-main-title">
        كشف متابعة الطلاب للفصل الدراسي
        (${escapeHTML(settings.semester || "")})
      </h1>

      <div class="register-subtitle">
        المادة:
        ${escapeHTML(settings.subject || "................")}
        &nbsp;&nbsp;&nbsp;
        الصف:
        ${escapeHTML(settings.grade || "................")}
      </div>

      <table class="weekly-table">

        <thead>

          <tr>

            <th rowspan="2" class="num-col">
              م
            </th>

            <th rowspan="2" class="name-col">
              اسم الطالب
            </th>

            ${days.map(day=>`
              <th colspan="4">
                ${day}
              </th>
            `).join("")}

          </tr>

          <tr>

            ${days.map(()=>`
              <th class="mini-col">ح</th>
              <th class="mini-col">و</th>
              <th class="mini-col">م</th>
              <th class="mini-col">ن</th>
            `).join("")}

          </tr>

        </thead>

        <tbody>

          ${rows.map((name,index)=>`
            <tr>

              <td>
                ${(pageNumber-1)*20 + index + 1}
              </td>

              <td class="student-name">
                ${escapeHTML(name)}
              </td>

              ${Array.from({length:20})
                .map(()=>"<td></td>")
                .join("")}

            </tr>
          `).join("")}

        </tbody>

      </table>


      <div class="weekly-legend">
        <span>ح = حضور</span>
        <span>و = واجب</span>
        <span>م = مشاركة</span>
        <span>ن = نشاط</span>
      </div>


      <div class="sheet-footer">
        <span>
          سجل المتابعة - اختباري
        </span>

        <span>
          صفحة ${pageNumber} من ${totalPages}
        </span>
      </div>

    </section>
  `;
}


function miniScoreGrid(){

  return `
    <div class="score-grid">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}


function performancePage(
  names,
  settings,
  pageNumber,
  totalPages
){

  const rows =
    paddedStudents(names,20);

  return `
    <section class="register-sheet landscape performance-sheet">

      <div class="performance-header">

        <div class="official-side">
          المملكة العربية السعودية<br>
          وزارة التعليم<br>
          ${escapeHTML(settings.administration || "الإدارة التعليمية")}<br>
          ${escapeHTML(settings.school || "اسم المدرسة")}
        </div>

        <div>
          <div class="performance-title">
            سجل متابعة الطلاب
          </div>

          <div style="
            text-align:center;
            margin-top:5px;
            font-size:10px;
          ">
            المادة /
            ${escapeHTML(settings.subject || "المقرر")}
          </div>
        </div>

        ${ministryLogo()}

      </div>


      <div class="performance-meta">

        <strong>
          الصف:
          ${escapeHTML(settings.grade || "........")}
        </strong>

        <strong>
          الفصل:
          ${escapeHTML(settings.semester || "........")}
        </strong>

        <strong>
          العام:
          ${escapeHTML(settings.academicYear || "........")}
        </strong>

        <strong>
          الأسبوع:
          ${escapeHTML(settings.week || "........")}
        </strong>

      </div>


      <table class="performance-table">

        <thead>

          <tr>

            <th rowspan="2" class="p-num">
              م
            </th>

            <th rowspan="2" class="p-name">
              اسم الطالب
            </th>

            <th colspan="2">
              المهام الأدائية
              <br>
              20 درجة
            </th>

            <th colspan="2">
              المشاركة والتفاعل
              <br>
              20 درجة
            </th>

            <th rowspan="2">
              الاختبارات القصيرة
              <br>
              20 درجة
            </th>

            <th rowspan="2">
              المجموع
              <br>
              60 درجة
            </th>

          </tr>

          <tr>

            <th class="sub-head">
              الواجبات
              <br>
              10 درجات
            </th>

            <th class="sub-head">
              بحوث أو مشروعات
              <br>
              10 درجات
            </th>

            <th class="sub-head">
              نشاطات وتطبيقات صفية
              <br>
              10 درجات
            </th>

            <th class="sub-head">
              المشاركة
              <br>
              10 درجات
            </th>

          </tr>

        </thead>


        <tbody>

          ${rows.map((name,index)=>`
            <tr>

              <td class="p-num">
                ${(pageNumber-1)*20 + index + 1}
              </td>

              <td class="p-name">
                ${escapeHTML(name)}
              </td>

              <td>${miniScoreGrid()}</td>
              <td>${miniScoreGrid()}</td>
              <td>${miniScoreGrid()}</td>
              <td>${miniScoreGrid()}</td>
              <td>${miniScoreGrid()}</td>

              <td class="p-total"></td>

            </tr>
          `).join("")}

        </tbody>

      </table>


      <div class="sheet-footer">
        <span>
          سجل متابعة الطلاب - اختباري
        </span>

        <span>
          صفحة ${pageNumber} من ${totalPages}
        </span>
      </div>

    </section>
  `;
}


function renderPreview(){

  const names =
    getNames();

  const settings = {
    administration:
      administration.value.trim(),

    school:
      school.value.trim(),

    academicYear:
      academicYear.value.trim(),

    grade:
      grade.value.trim(),

    semester:
      semester.value.trim(),

    week:
      week.value.trim(),

    subject:
      subject.value.trim(),

    design:
      registerDesign.value
  };

  const pages =
    chunks(names,20);

  const totalPages =
    pages.length;

  if(settings.design === "performance"){

    printPreview.innerHTML =
      pages.map(
        (page,index)=>
          performancePage(
            page,
            settings,
            index+1,
            totalPages
          )
      ).join("");

    printStyle.textContent =
      "@media print{@page{size:A4 landscape;margin:0;}}";

  }else{

    printPreview.innerHTML =
      pages.map(
        (page,index)=>
          weeklyPage(
            page,
            settings,
            index+1,
            totalPages
          )
      ).join("");

    printStyle.textContent =
      "@media print{@page{size:A4 portrait;margin:0;}}";
  }
}


[
  administration,
  school,
  academicYear,
  grade,
  semester,
  week,
  subject,
  registerDesign,
  studentsInput
].forEach(element=>{

  element.addEventListener(
    "input",
    markDirty
  );

  element.addEventListener(
    "change",
    markDirty
  );
});


createClassBtn.addEventListener(
  "click",
  createClass
);


newClassName.addEventListener(
  "keydown",
  event=>{

    if(event.key === "Enter"){
      createClass();
    }
  }
);


classSelect.addEventListener(
  "change",
  function(){

    currentClass =
      classes.find(
        item=>item.id === this.value
      ) || null;

    loadCurrentIntoForm();
  }
);


deleteClassBtn.addEventListener(
  "click",
  deleteClass
);


saveBtn.addEventListener(
  "click",
  async function(){

    if(!currentClass){

      newClassName.focus();
      return;
    }

    await saveCurrent();
  }
);


printBtn.addEventListener(
  "click",
  function(){

    renderPreview();

    setTimeout(
      ()=>window.print(),
      100
    );
  }
);


(async function init(){

  try{

    const me =
      await api("/api/me");

    teacherName.textContent =
      me.teacher?.name || "المعلم";

    await loadClasses();

    renderPreview();

  }catch(error){

    console.error(error);
  }

})();

})();