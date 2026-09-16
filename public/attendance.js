const $ = id => document.getElementById(id);

let currentTeacher = null;
let currentStep = 1;
let currentRegisterId = null;
let logoData = "";

let draftKey = "ekhtibari-attendance-pro-draft";
let recordsKey = "ekhtibari-attendance-pro-records";

const fieldIds = [
  "school",
  "teacher",
  "subject",
  "grade",
  "className",
  "semester",
  "academicYear",
  "startDate",
  "weekCount",
  "students",
  "dateSystem",
  "excludedDates",
  "template",
  "studentsPerPage",
  "weeksPerPage",
  "fontSize",
  "rowSize"
];

const checkIds = [
  "showLegend",
  "showSignatures",
  "showPageNumber",
  "showCover",
  "showMonthlySummary"
];

const dayNames = {
  0:"الأحد",
  1:"الاثنين",
  2:"الثلاثاء",
  3:"الأربعاء",
  4:"الخميس"
};

function safe(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function dateFromInput(value){
  if(!value) return null;
  return new Date(value + "T12:00:00");
}

function iso(date){
  return [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")
  ].join("-");
}

function addDays(date,days){
  const result = new Date(date);
  result.setDate(result.getDate()+days);
  return result;
}

function getStudents(){
  return $("students").value
    .split(/\r?\n/)
    .map(v=>v.trim())
    .filter(Boolean);
}

function setStudents(list){
  $("students").value = list.join("\n");
  updateCounts();
  saveDraft();
}

function excludedSet(){
  return new Set(
    $("excludedDates").value
      .split(/[\n,،]+/)
      .map(v=>v.trim())
      .filter(Boolean)
  );
}

function setExcluded(set){
  $("excludedDates").value =
    Array.from(set).sort().join("\n");

  saveDraft();
  renderCalendar();
  updateCounts();
}

function formatDate(date,modeOverride){
  if(!date) return "";

  const mode = modeOverride || $("dateSystem").value;

  const gregorian = ()=>{
    return new Intl.DateTimeFormat(
      "ar-SA-u-ca-gregory",
      {day:"2-digit",month:"2-digit"}
    ).format(date);
  };

  const hijri = ()=>{
    try{
      return new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {day:"2-digit",month:"2-digit"}
      ).format(date);
    }catch(e){
      return gregorian();
    }
  };

  if(mode==="gregorian"){
    return gregorian();
  }

  if(mode==="both"){
    return hijri() + " هـ / " + gregorian() + " م";
  }

  return hijri();
}

function monthLabel(date){
  if(!date) return "";

  if($("dateSystem").value==="gregorian"){
    return new Intl.DateTimeFormat(
      "ar-SA-u-ca-gregory",
      {month:"long",year:"numeric"}
    ).format(date);
  }

  try{
    return new Intl.DateTimeFormat(
      "ar-SA-u-ca-islamic-umalqura",
      {month:"long",year:"numeric"}
    ).format(date);
  }catch(e){
    return "";
  }
}

function firstSunday(date){
  const result = new Date(date);
  const day = result.getDay();

  if(day===5){
    return addDays(result,2);
  }

  if(day===6){
    return addDays(result,1);
  }

  result.setDate(result.getDate()-day);
  return result;
}

function weekName(n){
  const names = [
    "الأول","الثاني","الثالث","الرابع","الخامس","السادس",
    "السابع","الثامن","التاسع","العاشر","الحادي عشر",
    "الثاني عشر","الثالث عشر","الرابع عشر","الخامس عشر",
    "السادس عشر","السابع عشر","الثامن عشر"
  ];

  return "الأسبوع " + (names[n-1] || n);
}

function buildWeeks(includeExcluded=false){
  const start = dateFromInput($("startDate").value);

  if(!start){
    return [];
  }

  const count = Number($("weekCount").value || 16);
  const first = firstSunday(start);
  const skip = excludedSet();
  const weeks=[];

  for(let w=0;w<count;w++){
    const days=[];

    for(let d=0;d<5;d++){
      const date = addDays(first,w*7+d);

      if(w===0 && date<start){
        continue;
      }

      const excluded = skip.has(iso(date));

      if(!includeExcluded && excluded){
        continue;
      }

      days.push({
        name:dayNames[d],
        date,
        excluded
      });
    }

    if(days.length || includeExcluded){
      weeks.push({
        index:w+1,
        title:weekName(w+1),
        days
      });
    }
  }

  return weeks;
}

function chunk(array,size){
  const result=[];

  for(let i=0;i<array.length;i+=size){
    result.push(array.slice(i,i+size));
  }

  return result;
}

function getFormData(){
  const data={};

  fieldIds.forEach(id=>{
    if($(id)){
      data[id]=$(id).value;
    }
  });

  checkIds.forEach(id=>{
    if($(id)){
      data[id]=$(id).checked;
    }
  });

  data.logoData=logoData;
  data.currentRegisterId=currentRegisterId;

  return data;
}

function applyFormData(data={}){
  fieldIds.forEach(id=>{
    if($(id) && data[id]!==undefined){
      $(id).value=data[id];
    }
  });

  checkIds.forEach(id=>{
    if($(id) && data[id]!==undefined){
      $(id).checked=Boolean(data[id]);
    }
  });

  logoData=data.logoData || "";
  currentRegisterId=data.currentRegisterId || null;

  refreshLogoPreview();
  syncTemplateCards();
  renderCalendar();
  updateCounts();
}

function saveDraft(){
  try{
    localStorage.setItem(
      draftKey,
      JSON.stringify(getFormData())
    );

    $("saveStatus").textContent="✓ تم الحفظ";

    clearTimeout(saveDraft.timer);

    saveDraft.timer=setTimeout(()=>{
      $("saveStatus").textContent="✓ محفوظ تلقائيًا";
    },900);

  }catch(error){
    console.error(error);
  }
}

function loadDraft(){
  try{
    const data=JSON.parse(
      localStorage.getItem(draftKey) || "{}"
    );

    applyFormData(data);

  }catch(error){
    console.error(error);
  }
}

function defaultValues(){
  if(!$("startDate").value){
    $("startDate").value=iso(new Date());
  }

  if(!$("weekCount").value){
    $("weekCount").value="16";
  }

  if(!$("studentsPerPage").value){
    $("studentsPerPage").value="28";
  }

  if(!$("weeksPerPage").value){
    $("weeksPerPage").value="4";
  }

  if(!$("template").value){
    $("template").value="official";
  }

  if(currentTeacher && !$("teacher").value){
    $("teacher").value=currentTeacher.name || "";
  }
}

function getMonthGroups(weeks){

  const map = new Map();

  weeks.forEach(week=>{

    week.days.forEach(day=>{

      const label =
        monthLabel(day.date);

      if(!map.has(label)){

        map.set(label,{
          label,
          dates:[]
        });
      }

      map.get(label).dates.push(
        day.date
      );

    });
  });

  return Array.from(
    map.values()
  );
}


function calculatePageStats(){

  const students =
    getStudents();

  const weeks =
    buildWeeks();

  const weeksPerPage =
    Number(
      $("weeksPerPage").value || 4
    );

  const studentsPerPage =
    Number(
      $("studentsPerPage").value || 28
    );


  const attendanceWeekGroups =
    chunk(
      weeks,
      weeksPerPage
    );


  const studentPageCount =
    Math.max(
      1,
      Math.ceil(
        students.length /
        studentsPerPage
      )
    );


  const attendancePages =
    Math.max(
      1,
      attendanceWeekGroups.length
    ) *
    studentPageCount;


  const coverPages =
    $("showCover") &&
    $("showCover").checked
      ? 1
      : 0;


  const monthCount =
    getMonthGroups(weeks).length;


  const summaryPages =
    $("showMonthlySummary") &&
    $("showMonthlySummary").checked
      ? monthCount *
        studentPageCount
      : 0;


  return {
    attendancePages,
    coverPages,
    summaryPages,
    totalPages:
      attendancePages +
      coverPages +
      summaryPages,
    studentPageCount,
    monthCount
  };
}


function updateCounts(){

  const students =
    getStudents();

  const weeks =
    buildWeeks();

  const stats =
    calculatePageStats();


  $("studentCount").textContent =
    students.length;


  $("heroStudentCount").textContent =
    students.length;


  $("heroWeekCount").textContent =
    weeks.length;


  $("heroPageCount").textContent =
    stats.totalPages;


  $("summaryStudents").textContent =
    students.length;


  $("summaryWeeks").textContent =
    weeks.length;


  $("summaryExcluded").textContent =
    excludedSet().size;


  $("summaryPages").textContent =
    stats.totalPages;
}


function setStep(step){
  currentStep=Math.max(1,Math.min(5,step));

  document
    .querySelectorAll("[data-step-panel]")
    .forEach(panel=>{
      panel.classList.toggle(
        "active",
        Number(panel.dataset.stepPanel)===currentStep
      );
    });

  document
    .querySelectorAll("[data-step-button]")
    .forEach(button=>{
      button.classList.toggle(
        "active",
        Number(button.dataset.stepButton)===currentStep
      );
    });

  $("prevStepBtn").style.visibility =
    currentStep===1 ? "hidden" : "visible";

  $("nextStepBtn").textContent =
    currentStep===5 ? "تحديث المعاينة" : "التالي";

  $("progressText").textContent=
    `الخطوة ${currentStep} من 5`;

  $("progressBar").style.width=
    (currentStep*20)+"%";

  if(currentStep===3){
    renderCalendar();
  }

  if(currentStep===5){
    generateRegister(false);
  }

  window.scrollTo({
    top:document.querySelector(".wizard-shell").offsetTop-20,
    behavior:"smooth"
  });
}

function renderCalendar(){
  const container=$("calendarManager");

  if(!container){
    return;
  }

  const weeks=buildWeeks(true);

  if(!weeks.length){
    container.innerHTML=
      '<div class="library-empty">حدد تاريخ بداية السجل أولًا.</div>';
    return;
  }

  container.innerHTML=weeks.map(week=>`
    <div class="calendar-week">
      <strong>${safe(week.title)}</strong>

      <div class="calendar-days">
        ${week.days.map(day=>`
          <button
            type="button"
            class="calendar-day ${day.excluded ? "excluded" : ""}"
            data-calendar-date="${iso(day.date)}">

            <strong>${safe(day.name)}</strong>
            <span>${safe(formatDate(day.date))}</span>

          </button>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function resizeLogo(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();

    reader.onload=()=>{
      const image=new Image();

      image.onload=()=>{
        const max=350;
        const ratio=Math.min(
          1,
          max/Math.max(image.width,image.height)
        );

        const canvas=document.createElement("canvas");
        canvas.width=Math.round(image.width*ratio);
        canvas.height=Math.round(image.height*ratio);

        const ctx=canvas.getContext("2d");
        ctx.drawImage(image,0,0,canvas.width,canvas.height);

        resolve(
          canvas.toDataURL("image/png",.9)
        );
      };

      image.onerror=reject;
      image.src=reader.result;
    };

    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}

function refreshLogoPreview(){
  if(!logoData){
    $("logoPreview").innerHTML="شعار";
    return;
  }

  $("logoPreview").innerHTML=
    `<img src="${logoData}" alt="شعار المدرسة">`;
}

function syncTemplateCards(){
  const value=$("template").value;

  document
    .querySelectorAll("[data-template-value]")
    .forEach(card=>{
      card.classList.toggle(
        "active",
        card.dataset.templateValue===value
      );
    });
}

function cleanStudents(){
  setStudents(
    getStudents()
      .map(v=>v.replace(/\s+/g," ").trim())
      .filter(Boolean)
  );
}

function sortStudents(){
  const list=getStudents();

  list.sort((a,b)=>
    a.localeCompare(b,"ar")
  );

  setStudents(list);
}

function dedupeStudents(){
  const seen=new Set();
  const result=[];

  getStudents().forEach(name=>{
    const key=name
      .replace(/\s+/g," ")
      .trim()
      .toLowerCase();

    if(!seen.has(key)){
      seen.add(key);
      result.push(name);
    }
  });

  setStudents(result);
}

function getRecords(){
  try{
    return JSON.parse(
      localStorage.getItem(recordsKey) || "[]"
    );
  }catch(error){
    return [];
  }
}

function setRecords(records){
  localStorage.setItem(
    recordsKey,
    JSON.stringify(records)
  );

  renderLibrary();
}

function suggestedRegisterName(data){
  const parts=[
    data.grade,
    data.className,
    data.subject
  ].filter(Boolean);

  return parts.length
    ? parts.join(" - ")
    : "سجل حضور";
}

function saveRegister(){
  const data=getFormData();
  let records=getRecords();

  if(currentRegisterId){
    const index=records.findIndex(
      r=>r.id===currentRegisterId
    );

    if(index!==-1){
      records[index]={
        ...records[index],
        title:suggestedRegisterName(data),
        updatedAt:new Date().toISOString(),
        data
      };

      setRecords(records);
      saveDraft();

      $("saveStatus").textContent="✓ تم حفظ السجل";
      return;
    }
  }

  currentRegisterId=
    "att-" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2,7);

  data.currentRegisterId=currentRegisterId;

  records.unshift({
    id:currentRegisterId,
    title:suggestedRegisterName(data),
    updatedAt:new Date().toISOString(),
    data
  });

  setRecords(records);
  saveDraft();

  $("saveStatus").textContent="✓ تم حفظ السجل";
}

function renderLibrary(){
  const container=$("registerLibrary");
  const records=getRecords();

  if(!records.length){
    container.innerHTML=
      '<div class="library-empty">لا توجد سجلات محفوظة حتى الآن.</div>';
    return;
  }

  container.innerHTML=records.map(record=>{
    const updated=
      new Intl.DateTimeFormat(
        "ar-SA",
        {dateStyle:"medium"}
      ).format(new Date(record.updatedAt));

    return `
      <div class="saved-register" data-register-id="${record.id}">

        <h3>${safe(record.title)}</h3>
        <p>آخر تعديل: ${safe(updated)}</p>

        <div class="saved-register-actions">
          <button
            type="button"
            class="load-register"
            data-load-register="${record.id}">
            فتح
          </button>

          <button
            type="button"
            class="copy-register"
            data-copy-register="${record.id}">
            نسخ
          </button>

          <button
            type="button"
            class="delete-register"
            data-delete-register="${record.id}">
            حذف
          </button>
        </div>

      </div>
    `;
  }).join("");
}

function loadRegister(id){
  const record=getRecords().find(
    item=>item.id===id
  );

  if(!record){
    return;
  }

  currentRegisterId=id;

  applyFormData({
    ...record.data,
    currentRegisterId:id
  });

  saveDraft();
  setStep(1);
}

function copyRegister(id){
  const record=getRecords().find(
    item=>item.id===id
  );

  if(!record){
    return;
  }

  currentRegisterId=null;

  applyFormData({
    ...record.data,
    currentRegisterId:null
  });

  saveRegister();
  renderLibrary();
}

function deleteRegister(id){
  if(!confirm("هل تريد حذف هذا السجل المحفوظ؟")){
    return;
  }

  const records=getRecords().filter(
    item=>item.id!==id
  );

  if(currentRegisterId===id){
    currentRegisterId=null;
  }

  setRecords(records);
  saveDraft();
}

function newRegister(){
  if(!confirm("إنشاء سجل جديد؟ سيبقى أي سجل محفوظ سابقًا موجودًا في سجلاتي.")){
    return;
  }

  currentRegisterId=null;
  logoData="";

  fieldIds.forEach(id=>{
    const el=$(id);

    if(!el){
      return;
    }

    if(id==="semester"){
      el.selectedIndex=0;
    }else if(id==="weekCount"){
      el.value="16";
    }else if(id==="dateSystem"){
      el.value="hijri";
    }else if(id==="template"){
      el.value="official";
    }else if(id==="studentsPerPage"){
      el.value="28";
    }else if(id==="weeksPerPage"){
      el.value="4";
    }else if(id==="fontSize"){
      el.value="normal";
    }else if(id==="rowSize"){
      el.value="normal";
    }else{
      el.value="";
    }
  });

  checkIds.forEach(id=>{
    if($(id)){
      $(id).checked=true;
    }
  });

  if(currentTeacher){
    $("teacher").value=currentTeacher.name || "";
  }

  defaultValues();
  refreshLogoPreview();
  syncTemplateCards();
  renderCalendar();
  updateCounts();
  saveDraft();

  $("preview").innerHTML=`
    <div class="preview-empty no-print">
      <div>▦</div>
      <h3>سجل جديد</h3>
      <p>أكمل البيانات ثم أنشئ المعاينة.</p>
    </div>
  `;

  setStep(1);
}

function studentPages(students,rows){
  const pages=students.length
    ? chunk(students,rows)
    : [[]];

  pages.forEach(page=>{
    while(page.length<rows){
      page.push("");
    }
  });

  return pages;
}

function tableHtml(weeks,students,studentPageIndex,rows){
  const weekHeaders=weeks.map(week=>`
    <th class="att-week" colspan="${week.days.length}">
      ${safe(week.title)}
    </th>
  `).join("");

  const dayHeaders=weeks.flatMap(
    week=>week.days.map(day=>`
      <th>
        <span class="att-day-name">${safe(day.name)}</span>
        <span class="att-day-date">${safe(formatDate(day.date))}</span>
      </th>
    `)
  ).join("");

  const totalDays=weeks.reduce(
    (sum,week)=>sum+week.days.length,
    0
  );

  const body=students.map((student,index)=>{
    const number=student
      ? studentPageIndex*rows+index+1
      : "";

    const cells=Array.from(
      {length:totalDays},
      ()=>"<td></td>"
    ).join("");

    return `
      <tr>
        <td>${number}</td>

        <td class="col-name">
          ${safe(student)}
        </td>

        ${cells}

        <td></td>
      </tr>
    `;
  }).join("");

  return `
    <table class="att-table">

      <thead>

        <tr>
          <th rowspan="2" class="col-number">م</th>
          <th rowspan="2" class="col-name">اسم الطالب</th>

          ${weekHeaders}

          <th rowspan="2" class="col-notes">ملاحظات</th>
        </tr>

        <tr>
          ${dayHeaders}
        </tr>

      </thead>

      <tbody>
        ${body}
      </tbody>

    </table>
  `;
}

function sheetHtml({
  weeks,
  students,
  studentPageIndex,
  rows,
  pageNumber,
  totalPages
}){
  const firstDate=weeks[0]?.days[0]?.date;
  const lastWeek=weeks[weeks.length-1];
  const lastDate=
    lastWeek?.days[lastWeek.days.length-1]?.date;

  const template=safe($("template").value);
  const fontSize=safe($("fontSize").value);
  const rowSize=safe($("rowSize").value);

  const legend=$("showLegend").checked
    ? `
      <div class="att-legend">
        <span><strong>✓</strong> حضور</span>
        <span><strong>غ</strong> غياب</span>
        <span><strong>ع</strong> غياب بعذر</span>
        <span><strong>ت</strong> تأخر</span>
      </div>
    `
    : "";

  const signatures=$("showSignatures").checked
    ? `
      <div class="att-signatures">
        <div>المعلم: __________________</div>
        <div>وكيل المدرسة: __________________</div>
        <div>مدير المدرسة: __________________</div>
      </div>
    `
    : "";

  const pageNumberHtml=$("showPageNumber").checked
    ? `
      <div class="att-page-number">
        صفحة ${pageNumber} من ${totalPages}
      </div>
    `
    : "";

  const logo=logoData
    ? `<img src="${logoData}" alt="شعار المدرسة">`
    : "";

  return `
    <section class="att-sheet ${template} font-${fontSize} row-${rowSize}">

      <div class="att-sheet-inner">

        <header class="att-print-header">

          <div class="att-print-right">

            ${logoData
              ? `<div class="att-print-logo">${logo}</div>`
              : ""
            }

            <div class="att-ministry">
              <strong>المملكة العربية السعودية</strong>
              <div>وزارة التعليم</div>
              <div>
                المدرسة:
                ${safe($("school").value || "........................")}
              </div>
            </div>

          </div>


          <div class="att-title">
            <h2>سجل الحضور والغياب</h2>
            <p>${safe($("semester").value)}</p>
          </div>


          <div class="att-year">
            <div>
              <strong>العام الدراسي:</strong>
              ${safe($("academicYear").value || "..............")}
            </div>

            <div>
              <strong>المعلم:</strong>
              ${safe($("teacher").value || "........................")}
            </div>
          </div>

        </header>


        <div class="att-meta">

          <div>
            <strong>المادة:</strong>
            ${safe($("subject").value || "...............")}
          </div>

          <div>
            <strong>الصف:</strong>
            ${safe($("grade").value || "...............")}
          </div>

          <div>
            <strong>الفصل:</strong>
            ${safe($("className").value || "......")}
          </div>

          <div>
            <strong>من:</strong>
            ${safe(formatDate(firstDate))}
          </div>

          <div>
            <strong>إلى:</strong>
            ${safe(formatDate(lastDate))}
          </div>

          <div>
            <strong>الشهر:</strong>
            ${safe(monthLabel(firstDate))}
          </div>

        </div>


        ${tableHtml(
          weeks,
          students,
          studentPageIndex,
          rows
        )}


        <footer class="att-footer">
          ${legend}
          ${signatures}
          ${pageNumberHtml}
        </footer>

      </div>

    </section>
  `;
}

function coverSheetHtml(){

  const logo =
    logoData
      ? `
        <div class="att-cover-logo">
          <img
            src="${logoData}"
            alt="شعار المدرسة">
        </div>
      `
      : "";


  return `
    <section
      class="att-sheet att-cover-sheet ${safe($("template").value)}">

      <div class="att-sheet-inner">

        <div class="att-cover-content">

          ${logo}

          <div class="att-cover-country">

            <strong>
              المملكة العربية السعودية
            </strong>

            <div>
              وزارة التعليم
            </div>

          </div>


          <div class="att-cover-divider"></div>


          <h1 class="att-cover-title">
            سجل الحضور والغياب
          </h1>

          <div class="att-cover-subtitle">
            سجل المتابعة اليومية للحضور والانضباط
          </div>


          <div class="att-cover-details">

            <div class="att-cover-detail">
              <strong>اسم المدرسة:</strong>
              ${safe(
                $("school").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>اسم المعلم:</strong>
              ${safe(
                $("teacher").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>المادة:</strong>
              ${safe(
                $("subject").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>الصف:</strong>
              ${safe(
                $("grade").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>الفصل:</strong>
              ${safe(
                $("className").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>الفصل الدراسي:</strong>
              ${safe(
                $("semester").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>العام الدراسي:</strong>
              ${safe(
                $("academicYear").value ||
                "................................"
              )}
            </div>

            <div class="att-cover-detail">
              <strong>عدد الطلاب:</strong>
              ${getStudents().length}
            </div>

          </div>


          <div class="att-cover-footer">

            <div>
              بداية السجل:
              ${safe(
                formatDate(
                  dateFromInput(
                    $("startDate").value
                  )
                )
              )}
            </div>

            <div>
              عدد الأسابيع:
              ${safe(
                $("weekCount").value
              )}
            </div>

          </div>

        </div>

      </div>

    </section>
  `;
}


function monthlySummarySheetHtml({
  month,
  students,
  studentPageIndex,
  rows
}){

  const body =
    students.map(
      (student,index)=>{

        const number =
          student
            ? (
                studentPageIndex *
                rows
              ) + index + 1
            : "";


        return `
          <tr>

            <td>
              ${number}
            </td>

            <td class="summary-name">
              ${safe(student)}
            </td>

            <td></td>
            <td></td>
            <td></td>
            <td></td>

            <td></td>

          </tr>
        `;

      }
    ).join("");


  return `
    <section
      class="att-sheet att-summary-sheet ${safe($("template").value)}">

      <div class="att-sheet-inner">


        <header class="att-summary-header">

          <div class="att-summary-school">

            <strong>
              المملكة العربية السعودية
            </strong>

            <div>
              وزارة التعليم
            </div>

            <div>
              ${safe(
                $("school").value ||
                "........................"
              )}
            </div>

          </div>


          <div class="att-summary-title">

            <h2>
              الملخص الشهري للحضور والغياب
            </h2>

            <p>
              ${safe(month.label)}
            </p>

          </div>


          <div class="att-summary-info">

            <div>
              المعلم:
              ${safe(
                $("teacher").value ||
                "......................"
              )}
            </div>

            <div>
              العام:
              ${safe(
                $("academicYear").value ||
                "................"
              )}
            </div>

          </div>

        </header>


        <div class="att-summary-meta">

          <div>
            <strong>المادة:&nbsp;</strong>
            ${safe(
              $("subject").value ||
              "..............."
            )}
          </div>

          <div>
            <strong>الصف:&nbsp;</strong>
            ${safe(
              $("grade").value ||
              "..............."
            )}
          </div>

          <div>
            <strong>الفصل:&nbsp;</strong>
            ${safe(
              $("className").value ||
              "......."
            )}
          </div>

          <div>
            <strong>الشهر:&nbsp;</strong>
            ${safe(month.label)}
          </div>

        </div>


        <table class="att-summary-table">

          <thead>

            <tr>

              <th class="summary-number">
                م
              </th>

              <th class="summary-name">
                اسم الطالب
              </th>

              <th>
                الحضور
              </th>

              <th>
                الغياب
              </th>

              <th>
                بعذر
              </th>

              <th>
                التأخر
              </th>

              <th class="summary-notes">
                ملاحظات
              </th>

            </tr>

          </thead>


          <tbody>
            ${body}
          </tbody>

        </table>


        <footer class="att-summary-footer">

          <div>
            توقيع المعلم:
            ________________
          </div>

          <div>
            وكيل المدرسة:
            ________________
          </div>

          <div>
            مدير المدرسة:
            ________________
          </div>

        </footer>

      </div>

    </section>
  `;
}


function generateRegister(scroll=true){

  const weeks =
    buildWeeks();


  if(!weeks.length){

    if(scroll){
      alert(
        "حدد تاريخ بداية السجل."
      );
    }

    return;
  }


  const rows =
    Number(
      $("studentsPerPage").value ||
      28
    );


  const weeksPerPage =
    Number(
      $("weeksPerPage").value ||
      4
    );


  const students =
    studentPages(
      getStudents(),
      rows
    );


  const weekGroups =
    chunk(
      weeks,
      weeksPerPage
    );


  const attendancePages =
    students.length *
    weekGroups.length;


  let html = "";


  /* الغلاف */

  if(
    $("showCover") &&
    $("showCover").checked
  ){
    html +=
      coverSheetHtml();
  }


  /* صفحات الحضور */

  let attendancePageNumber = 1;


  students.forEach(
    (studentGroup,studentPageIndex)=>{

      weekGroups.forEach(
        weekGroup=>{

          html += sheetHtml({
            weeks:weekGroup,
            students:studentGroup,
            studentPageIndex,
            rows,
            pageNumber:
              attendancePageNumber,
            totalPages:
              attendancePages
          });


          attendancePageNumber++;

        }
      );

    }
  );


  /* الملخص الشهري */

  if(
    $("showMonthlySummary") &&
    $("showMonthlySummary").checked
  ){

    const months =
      getMonthGroups(weeks);


    months.forEach(month=>{

      students.forEach(
        (studentGroup,studentPageIndex)=>{

          html +=
            monthlySummarySheetHtml({
              month,
              students:studentGroup,
              studentPageIndex,
              rows
            });

        }
      );

    });

  }


  $("preview").innerHTML =
    html;


  updateCounts();
  saveDraft();


  if(scroll){

    $("preview").scrollIntoView({
      behavior:"smooth",
      block:"start"
    });

  }
}


async function loadTeacher(){
  try{
    const response=await fetch("/api/me");

    if(
      response.status===401 ||
      response.status===403
    ){
      location.href="/";
      return;
    }

    if(!response.ok){
      throw new Error("تعذر تحميل الحساب");
    }

    const data=await response.json();

    currentTeacher=data.teacher;

    const id=currentTeacher.id;

    draftKey=
      "ekhtibari-attendance-pro-draft-" + id;

    recordsKey=
      "ekhtibari-attendance-pro-records-" + id;

    $("teacherAccount").textContent=
      currentTeacher.name || "المعلم";

    $("teacherAvatar").textContent=
      (currentTeacher.name || "م")
        .trim()
        .charAt(0);

    loadDraft();
    defaultValues();

    if(!$("teacher").value){
      $("teacher").value=
        currentTeacher.name || "";
    }

    syncTemplateCards();
    renderCalendar();
    renderLibrary();
    updateCounts();
    saveDraft();

  }catch(error){
    console.error(error);
  }
}


/* =========================================================
   Events
========================================================= */

document
  .querySelectorAll("[data-step-button]")
  .forEach(button=>{
    button.addEventListener("click",()=>{
      setStep(
        Number(button.dataset.stepButton)
      );
    });
  });

$("nextStepBtn").addEventListener("click",()=>{
  if(currentStep===5){
    generateRegister();
    return;
  }

  setStep(currentStep+1);
});

$("prevStepBtn").addEventListener("click",()=>{
  setStep(currentStep-1);
});

fieldIds.forEach(id=>{
  const el=$(id);

  if(!el){
    return;
  }

  ["input","change"].forEach(eventName=>{
    el.addEventListener(eventName,()=>{
      saveDraft();
      updateCounts();

      if(
        id==="startDate" ||
        id==="weekCount" ||
        id==="dateSystem"
      ){
        renderCalendar();
      }
    });
  });
});

checkIds.forEach(id=>{
  if($(id)){
    $(id).addEventListener("change",()=>{
      saveDraft();
      updateCounts();
    });
  }
});

$("calendarManager").addEventListener("click",event=>{
  const button=event.target.closest(
    "[data-calendar-date]"
  );

  if(!button){
    return;
  }

  const date=button.dataset.calendarDate;
  const set=excludedSet();

  if(set.has(date)){
    set.delete(date);
  }else{
    set.add(date);
  }

  setExcluded(set);
});

$("resetExcludedBtn").addEventListener("click",()=>{
  setExcluded(new Set());
});

$("schoolLogo").addEventListener("change",async event=>{
  const file=event.target.files?.[0];

  if(!file){
    return;
  }

  if(file.size>5*1024*1024){
    alert("حجم الشعار كبير. اختر صورة أقل من 5 ميجابايت.");
    event.target.value="";
    return;
  }

  try{
    logoData=await resizeLogo(file);
    refreshLogoPreview();
    saveDraft();
  }catch(error){
    alert("تعذر قراءة الشعار.");
  }

  event.target.value="";
});

$("removeLogoBtn").addEventListener("click",()=>{
  logoData="";
  refreshLogoPreview();
  saveDraft();
});

$("sortStudentsBtn").addEventListener(
  "click",
  sortStudents
);

$("dedupeStudentsBtn").addEventListener(
  "click",
  dedupeStudents
);

$("trimStudentsBtn").addEventListener(
  "click",
  cleanStudents
);

$("clearStudentsBtn").addEventListener("click",()=>{
  if(confirm("مسح جميع أسماء الطلاب؟")){
    setStudents([]);
  }
});

document
  .querySelectorAll("[data-template-value]")
  .forEach(card=>{
    card.addEventListener("click",()=>{
      $("template").value=
        card.dataset.templateValue;

      syncTemplateCards();
      saveDraft();
    });
  });

$("toggleLibraryBtn").addEventListener("click",()=>{
  const library=$("registerLibrary");

  library.classList.toggle("hidden");

  $("toggleLibraryBtn").textContent=
    library.classList.contains("hidden")
      ? "عرض السجلات"
      : "إخفاء السجلات";
});

$("registerLibrary").addEventListener("click",event=>{
  const load=event.target.closest(
    "[data-load-register]"
  );

  const copy=event.target.closest(
    "[data-copy-register]"
  );

  const del=event.target.closest(
    "[data-delete-register]"
  );

  if(load){
    loadRegister(load.dataset.loadRegister);
  }

  if(copy){
    copyRegister(copy.dataset.copyRegister);
  }

  if(del){
    deleteRegister(del.dataset.deleteRegister);
  }
});

$("newRegisterBtn").addEventListener(
  "click",
  newRegister
);

$("saveRegisterBtn").addEventListener(
  "click",
  saveRegister
);

$("generateBtn").addEventListener("click",()=>{
  generateRegister();
});

function printRegister(){
  if(!document.querySelector(".att-sheet")){
    generateRegister(false);
  }

  if(document.querySelector(".att-sheet")){
    window.print();
  }
}

$("printBtn").addEventListener(
  "click",
  printRegister
);

$("quickPrintBtn").addEventListener(
  "click",
  printRegister
);

$("logoutBtn").addEventListener("click",async()=>{
  await fetch(
    "/api/auth/logout",
    {method:"POST"}
  );

  location.href="/";
});


setStep(1);
loadTeacher();
