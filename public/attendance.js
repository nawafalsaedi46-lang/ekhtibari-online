const $ = id => document.getElementById(id);

let currentTeacher = null;
let storageKey = "ekhtibari-attendance";

const formFields = [
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
  "pageMode",
  "dateSystem",
  "studentsPerPage",
  "fontSize",
  "template",
  "showLegend",
  "excludedDates"
];

const dayNames = {
  0:"الأحد",
  1:"الاثنين",
  2:"الثلاثاء",
  3:"الأربعاء",
  4:"الخميس"
};


function escapeHtml(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}


function inputDate(value){

  if(!value){
    return null;
  }

  return new Date(
    value + "T12:00:00"
  );
}


function dateIso(date){

  return [
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")
  ].join("-");
}


function addDays(date,days){

  const result =
    new Date(date);

  result.setDate(
    result.getDate() + days
  );

  return result;
}


function getStudents(){

  return $("students").value
    .split(/\r?\n/)
    .map(value=>value.trim())
    .filter(Boolean);
}


function updateStudentCount(){

  const count =
    getStudents().length;

  $("studentCount").textContent =
    count + " طالب";
}


function saveForm(){

  const data = {};

  formFields.forEach(id=>{

    const element=$(id);

    if(element){
      data[id]=element.value;
    }
  });

  localStorage.setItem(
    storageKey,
    JSON.stringify(data)
  );

  $("saveStatus").textContent =
    "✓ تم الحفظ";

  clearTimeout(saveForm.timer);

  saveForm.timer =
    setTimeout(()=>{
      $("saveStatus").textContent =
        "✓ حفظ تلقائي";
    },1000);
}


function setDefaults(){

  if(!$("startDate").value){

    $("startDate").value =
      dateIso(new Date());
  }
}


function loadForm(){

  try{

    const data =
      JSON.parse(
        localStorage.getItem(storageKey) || "{}"
      );

    formFields.forEach(id=>{

      if(
        $(id) &&
        data[id] !== undefined
      ){
        $(id).value=data[id];
      }

    });

  }catch(error){
    console.error(error);
  }

  setDefaults();

  if(
    !$("teacher").value &&
    currentTeacher
  ){
    $("teacher").value =
      currentTeacher.name || "";
  }

  updateStudentCount();
}


function excludedDates(){

  return new Set(

    $("excludedDates").value
      .split(/[\n,،]+/)
      .map(value=>value.trim())
      .filter(Boolean)

  );
}


function firstSunday(date){

  const result =
    new Date(date);

  const day =
    result.getDay();

  if(day===5){
    return addDays(result,2);
  }

  if(day===6){
    return addDays(result,1);
  }

  result.setDate(
    result.getDate()-day
  );

  return result;
}


function weekTitle(number){

  const titles=[
    "الأول",
    "الثاني",
    "الثالث",
    "الرابع",
    "الخامس",
    "السادس",
    "السابع",
    "الثامن",
    "التاسع",
    "العاشر",
    "الحادي عشر",
    "الثاني عشر",
    "الثالث عشر",
    "الرابع عشر",
    "الخامس عشر",
    "السادس عشر",
    "السابع عشر",
    "الثامن عشر"
  ];

  return "الأسبوع " +
    (titles[number-1] || number);
}


function buildWeeks(){

  const chosenStart =
    inputDate(
      $("startDate").value
    );

  if(!chosenStart){
    throw new Error(
      "حدد تاريخ بداية السجل."
    );
  }

  const count =
    Number(
      $("weekCount").value
    ) || 16;

  const skip =
    excludedDates();

  const sunday =
    firstSunday(chosenStart);

  const weeks=[];

  for(let w=0;w<count;w++){

    const days=[];

    for(let d=0;d<5;d++){

      const date =
        addDays(
          sunday,
          w*7+d
        );

      if(
        date < chosenStart &&
        w===0
      ){
        continue;
      }

      if(
        skip.has(
          dateIso(date)
        )
      ){
        continue;
      }

      days.push({
        name:dayNames[d],
        date
      });
    }

    if(days.length){

      weeks.push({
        index:w+1,
        title:weekTitle(w+1),
        days
      });
    }
  }

  return weeks;
}


function formatDate(date){

  if(!date){
    return "";
  }

  if(
    $("dateSystem").value==="hijri"
  ){

    try{

      return new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {
          day:"2-digit",
          month:"2-digit"
        }
      ).format(date);

    }catch(error){}
  }

  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      day:"2-digit",
      month:"2-digit"
    }
  ).format(date);
}


function monthLabel(date){

  if(
    $("dateSystem").value==="hijri"
  ){

    try{

      return new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {
          month:"long",
          year:"numeric"
        }
      ).format(date);

    }catch(error){}
  }

  return new Intl.DateTimeFormat(
    "ar-SA",
    {
      month:"long",
      year:"numeric"
    }
  ).format(date);
}


function chunk(array,size){

  const result=[];

  for(
    let i=0;
    i<array.length;
    i+=size
  ){
    result.push(
      array.slice(i,i+size)
    );
  }

  return result;
}


function groupWeeks(weeks){

  if(
    $("pageMode").value==="weeks"
  ){
    return chunk(weeks,4);
  }

  const groups=[];
  let current=[];
  let currentLabel="";

  weeks.forEach(week=>{

    const date =
      week.days[0]?.date;

    const label =
      monthLabel(date);

    if(
      current.length &&
      label!==currentLabel
    ){
      groups.push(current);
      current=[];
    }

    currentLabel=label;
    current.push(week);

    /*
      حماية من جدول أعرض من A4
    */
    if(current.length===5){
      groups.push(current);
      current=[];
      currentLabel="";
    }
  });

  if(current.length){
    groups.push(current);
  }

  return groups;
}


function studentPages(students,rows){

  const pages =
    students.length
      ? chunk(students,rows)
      : [[]];

  pages.forEach(page=>{

    while(page.length<rows){
      page.push("");
    }

  });

  return pages;
}


function tableHtml(
  weeks,
  students,
  studentPageIndex,
  rows
){

  const weekHeaders =
    weeks.map(week=>`
      <th
        class="att-week"
        colspan="${week.days.length}">
        ${escapeHtml(week.title)}
      </th>
    `).join("");


  const dayHeaders =
    weeks.flatMap(
      week=>
        week.days.map(day=>`
          <th>
            <span class="att-day-name">
              ${escapeHtml(day.name)}
            </span>

            <span class="att-day-date">
              ${escapeHtml(formatDate(day.date))}
            </span>
          </th>
        `)
    ).join("");


  const totalDays =
    weeks.reduce(
      (sum,week)=>
        sum+week.days.length,
      0
    );


  const rowsHtml =
    students.map(
      (student,index)=>{

        const number =
          student
            ? (
                studentPageIndex*rows
              ) + index + 1
            : "";


        const dayCells =
          Array.from(
            {length:totalDays},
            ()=>"<td></td>"
          ).join("");


        return `
          <tr>

            <td>
              ${number}
            </td>

            <td class="col-name">
              ${escapeHtml(student)}
            </td>

            ${dayCells}

            <td></td>

          </tr>
        `;
      }
    ).join("");


  return `
    <table class="att-table">

      <thead>

        <tr>

          <th
            rowspan="2"
            class="col-number">
            م
          </th>

          <th
            rowspan="2"
            class="col-name">
            اسم الطالب
          </th>

          ${weekHeaders}

          <th
            rowspan="2"
            class="col-notes">
            ملاحظات
          </th>

        </tr>

        <tr>
          ${dayHeaders}
        </tr>

      </thead>

      <tbody>
        ${rowsHtml}
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

  const template =
    escapeHtml(
      $("template").value
    );

  const fontSize =
    escapeHtml(
      $("fontSize").value
    );

  const firstDate =
    weeks[0]?.days[0]?.date;

  const lastWeek =
    weeks[weeks.length-1];

  const lastDate =
    lastWeek?.days[
      lastWeek.days.length-1
    ]?.date;


  const legend =
    $("showLegend").value==="yes"
      ? `
        <div class="att-legend">
          <span><strong>✓</strong> حضور</span>
          <span><strong>غ</strong> غياب</span>
          <span><strong>ع</strong> غياب بعذر</span>
          <span><strong>ت</strong> تأخر</span>
        </div>
      `
      : "";


  return `
    <section
      class="att-sheet ${template} font-${fontSize}">

      <div class="att-sheet-inner">


        <header class="att-print-header">

          <div class="att-ministry">

            <strong>
              المملكة العربية السعودية
            </strong>

            <div>
              وزارة التعليم
            </div>

            <div>
              المدرسة:
              ${escapeHtml(
                $("school").value ||
                ".............................."
              )}
            </div>

          </div>


          <div class="att-title">

            <h2>
              سجل الحضور والغياب
            </h2>

            <p>
              ${escapeHtml(
                $("semester").value
              )}
            </p>

          </div>


          <div class="att-year">

            <div>
              <strong>
                العام الدراسي:
              </strong>

              ${escapeHtml(
                $("academicYear").value ||
                "................"
              )}
            </div>

            <div>
              <strong>
                المعلم:
              </strong>

              ${escapeHtml(
                $("teacher").value ||
                "........................"
              )}
            </div>

          </div>

        </header>


        <div class="att-meta">

          <div>
            <strong>المادة:</strong>

            ${escapeHtml(
              $("subject").value ||
              "................."
            )}
          </div>

          <div>
            <strong>الصف:</strong>

            ${escapeHtml(
              $("grade").value ||
              "................."
            )}
          </div>

          <div>
            <strong>الفصل:</strong>

            ${escapeHtml(
              $("className").value ||
              "........"
            )}
          </div>

          <div>
            <strong>من:</strong>

            ${escapeHtml(
              formatDate(firstDate)
            )}
          </div>

          <div>
            <strong>إلى:</strong>

            ${escapeHtml(
              formatDate(lastDate)
            )}
          </div>

          <div>
            <strong>الشهر:</strong>

            ${escapeHtml(
              monthLabel(firstDate)
            )}
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

          <div class="att-signatures">

            <div>
              توقيع المعلم:
              __________________
            </div>

            <div>
              وكيل المدرسة:
              __________________
            </div>

            <div>
              مدير المدرسة:
              __________________
            </div>

          </div>

          <div class="att-page-number">
            صفحة ${pageNumber} من ${totalPages}
          </div>

        </footer>


      </div>

    </section>
  `;
}


function generateRegister(){

  try{

    const weeks =
      buildWeeks();

    if(!weeks.length){
      throw new Error(
        "لا توجد أيام دراسية في الفترة المحددة."
      );
    }


    const rows =
      Number(
        $("studentsPerPage").value
      ) || 28;


    const students =
      studentPages(
        getStudents(),
        rows
      );


    const weekGroups =
      groupWeeks(weeks);


    const totalPages =
      students.length *
      weekGroups.length;


    let html="";
    let pageNumber=1;


    students.forEach(
      (studentGroup,studentPageIndex)=>{

        weekGroups.forEach(
          weekGroup=>{

            html += sheetHtml({
              weeks:weekGroup,
              students:studentGroup,
              studentPageIndex,
              rows,
              pageNumber,
              totalPages
            });

            pageNumber++;
          }
        );
      }
    );


    $("preview").innerHTML =
      html;

    saveForm();

    $("preview")
      .scrollIntoView({
        behavior:"smooth",
        block:"start"
      });


  }catch(error){

    alert(
      error.message ||
      "تعذر إنشاء السجل."
    );
  }
}


async function loadTeacher(){

  try{

    const response =
      await fetch("/api/me");


    if(
      response.status===401 ||
      response.status===403
    ){
      location.href="/";
      return;
    }


    if(!response.ok){
      throw new Error(
        "تعذر تحميل بيانات الحساب."
      );
    }


    const data =
      await response.json();


    currentTeacher =
      data.teacher;


    storageKey =
      "ekhtibari-attendance-" +
      currentTeacher.id;


    $("teacherAccount").textContent =
      currentTeacher.name;


    loadForm();


  }catch(error){

    console.error(error);

    alert(
      "تعذر تحميل بيانات المعلم."
    );
  }
}


formFields.forEach(id=>{

  const element=$(id);

  if(!element){
    return;
  }

  element.addEventListener(
    "input",
    ()=>{
      updateStudentCount();
      saveForm();
    }
  );

  element.addEventListener(
    "change",
    ()=>{
      updateStudentCount();
      saveForm();
    }
  );
});


$("generateBtn")
  .addEventListener(
    "click",
    generateRegister
  );


$("printBtn")
  .addEventListener(
    "click",
    ()=>{

      if(
        !document.querySelector(
          ".att-sheet"
        )
      ){
        generateRegister();
      }

      if(
        document.querySelector(
          ".att-sheet"
        )
      ){
        window.print();
      }
    }
  );


$("clearBtn")
  .addEventListener(
    "click",
    ()=>{

      if(
        !confirm(
          "هل تريد تفريغ جميع بيانات سجل الحضور؟"
        )
      ){
        return;
      }


      localStorage.removeItem(
        storageKey
      );


      formFields.forEach(id=>{

        const element=$(id);

        if(!element){
          return;
        }

        if(id==="semester"){
          element.selectedIndex=0;
        }

        else if(id==="weekCount"){
          element.value="16";
        }

        else if(id==="pageMode"){
          element.value="weeks";
        }

        else if(id==="dateSystem"){
          element.value="hijri";
        }

        else if(id==="studentsPerPage"){
          element.value="28";
        }

        else if(id==="fontSize"){
          element.value="normal";
        }

        else if(id==="template"){
          element.value="official";
        }

        else if(id==="showLegend"){
          element.value="yes";
        }

        else{
          element.value="";
        }

      });


      if(currentTeacher){
        $("teacher").value =
          currentTeacher.name || "";
      }


      setDefaults();
      updateStudentCount();


      $("preview").innerHTML=`
        <div class="empty-preview no-print">

          <div class="empty-icon">
            📋
          </div>

          <h3>
            جاهز لإنشاء السجل
          </h3>

          <p>
            أدخل بيانات الفصل وأسماء الطلاب، ثم اضغط «إنشاء السجل».
          </p>

        </div>
      `;

    }
  );


$("logoutBtn")
  .addEventListener(
    "click",
    async ()=>{

      await fetch(
        "/api/auth/logout",
        {
          method:"POST"
        }
      );

      location.href="/";
    }
  );


loadTeacher();
