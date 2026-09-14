(function(){
"use strict";

const $ = id => document.getElementById(id);

const teacherName = $("teacherName");
const newClassName = $("newClassName");
const createClassBtn = $("createClassBtn");
const classSelect = $("classSelect");
const followupDate = $("followupDate");
const deleteClassBtn = $("deleteClassBtn");
const printFollowupBtn = $("printFollowupBtn");
const saveFollowupBtn = $("saveFollowupBtn");

const emptyState = $("emptyState");
const workspace = $("followupWorkspace");

const studentNameInput = $("studentNameInput");
const addStudentBtn = $("addStudentBtn");
const bulkStudents = $("bulkStudents");
const addBulkStudentsBtn = $("addBulkStudentsBtn");

const tableBody = $("studentsTableBody");
const saveStatus = $("saveStatus");

const statStudents = $("statStudents");
const statPresent = $("statPresent");
const statAbsent = $("statAbsent");
const statHomework = $("statHomework");

const sheetClassName = $("sheetClassName");
const sheetDate = $("sheetDate");

let classes = [];
let currentClass = null;
let saveTimer = null;


function localDateISO(){

  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth()+1).padStart(2,"0");
  const day = String(now.getDate()).padStart(2,"0");

  return `${year}-${month}-${day}`;
}


followupDate.value = localDateISO();


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

  const data = await response.json().catch(()=>({}));

  if(!response.ok){
    throw new Error(
      data.error || "حدث خطأ في الاتصال"
    );
  }

  return data;
}


function newId(prefix="S"){

  if(window.crypto && crypto.randomUUID){
    return prefix + "-" + crypto.randomUUID();
  }

  return prefix + "-" + Date.now() + "-" +
    Math.random().toString(36).slice(2,8);
}


function defaultData(){

  return {
    students:[],
    days:{}
  };
}


function normalizeData(data){

  const value =
    data && typeof data === "object"
      ? data
      : defaultData();

  if(!Array.isArray(value.students)){
    value.students = [];
  }

  if(!value.days || typeof value.days !== "object"){
    value.days = {};
  }

  return value;
}


function getDay(){

  if(!currentClass) return {};

  const date =
    followupDate.value || localDateISO();

  currentClass.data =
    normalizeData(currentClass.data);

  if(!currentClass.data.days[date]){
    currentClass.data.days[date] = {};
  }

  return currentClass.data.days[date];
}


function getStudentRecord(studentId){

  const day = getDay();

  if(!day[studentId]){
    day[studentId] = {
      attendance:"",
      homework:"",
      participation:"",
      score:"",
      notes:""
    };
  }

  return day[studentId];
}


function setSaveState(state){

  saveStatus.className =
    "save-status " + state;

  if(state === "saving"){
    saveStatus.textContent = "⏳ جاري الحفظ";
  }
  else if(state === "error"){
    saveStatus.textContent = "⚠️ تعذر الحفظ";
  }
  else{
    saveStatus.textContent = "✓ محفوظ";
  }
}


function queueSave(){

  if(!currentClass) return;

  clearTimeout(saveTimer);

  setSaveState("saving");

  saveTimer = setTimeout(
    saveCurrentClass,
    500
  );
}


async function saveCurrentClass(){

  if(!currentClass) return;

  try{

    const result = await api(
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

    currentClass.updatedAt =
      result.followupClass.updatedAt;

    setSaveState("saved");

  }catch(error){

    console.error(error);
    setSaveState("error");
  }
}


function formatDate(date){

  if(!date) return "-";

  const parts = date.split("-");

  if(parts.length !== 3){
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function updateStats(){

  if(!currentClass){
    statStudents.textContent = "0";
    statPresent.textContent = "0";
    statAbsent.textContent = "0";
    statHomework.textContent = "0";
    return;
  }

  const students =
    currentClass.data.students || [];

  const day = getDay();

  let present = 0;
  let absent = 0;
  let homework = 0;

  students.forEach(student=>{

    const record =
      day[student.id] || {};

    if(record.attendance === "حاضر"){
      present++;
    }

    if(record.attendance === "غائب"){
      absent++;
    }

    if(record.homework === "مكتمل"){
      homework++;
    }
  });

  statStudents.textContent =
    String(students.length);

  statPresent.textContent =
    String(present);

  statAbsent.textContent =
    String(absent);

  statHomework.textContent =
    String(homework);
}


function optionHTML(values,current){

  return `
    <option value="">—</option>
    ${values.map(value=>`
      <option
        value="${escapeHTML(value)}"
        ${value === current ? "selected" : ""}
      >
        ${escapeHTML(value)}
      </option>
    `).join("")}
  `;
}


function escapeHTML(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function renderStudents(){

  if(!currentClass){
    tableBody.innerHTML = "";
    return;
  }

  currentClass.data =
    normalizeData(currentClass.data);

  const students =
    currentClass.data.students;

  const day = getDay();

  sheetClassName.textContent =
    currentClass.name;

  sheetDate.textContent =
    formatDate(followupDate.value);

  if(!students.length){

    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">
          لم تتم إضافة طلاب لهذا الفصل.
        </td>
      </tr>
    `;

    updateStats();
    return;
  }

  tableBody.innerHTML =
    students.map((student,index)=>{

      const record =
        day[student.id] || {};

      return `
        <tr data-student-id="${escapeHTML(student.id)}">

          <td>${index+1}</td>

          <td>
            <input
              class="student-name-input"
              data-field="studentName"
              value="${escapeHTML(student.name)}"
            >
          </td>

          <td>
            <select
              class="followup-select"
              data-field="attendance"
            >
              ${optionHTML(
                [
                  "حاضر",
                  "غائب",
                  "متأخر",
                  "مستأذن"
                ],
                record.attendance || ""
              )}
            </select>
          </td>

          <td>
            <select
              class="followup-select"
              data-field="homework"
            >
              ${optionHTML(
                [
                  "مكتمل",
                  "ناقص",
                  "لم يحضر"
                ],
                record.homework || ""
              )}
            </select>
          </td>

          <td>
            <select
              class="followup-select"
              data-field="participation"
            >
              ${optionHTML(
                [
                  "ممتاز",
                  "جيد",
                  "يحتاج متابعة"
                ],
                record.participation || ""
              )}
            </select>
          </td>

          <td>
            <input
              type="number"
              min="0"
              step="0.5"
              class="followup-score"
              data-field="score"
              value="${escapeHTML(record.score || "")}"
              placeholder="-"
            >
          </td>

          <td>
            <input
              class="followup-notes"
              data-field="notes"
              value="${escapeHTML(record.notes || "")}"
              placeholder="ملاحظة..."
            >
          </td>

          <td class="no-print">
            <button
              type="button"
              class="delete-student"
              data-action="deleteStudent"
            >
              حذف
            </button>
          </td>

        </tr>
      `;
    }).join("");

  updateStats();
}


function renderClassSelect(){

  const currentId =
    currentClass?.id || "";

  classSelect.innerHTML =
    '<option value="">اختر الفصل</option>' +
    classes.map(item=>`
      <option
        value="${escapeHTML(item.id)}"
        ${item.id === currentId ? "selected" : ""}
      >
        ${escapeHTML(item.name)}
      </option>
    `).join("");
}


function showWorkspace(){

  const hasClass =
    Boolean(currentClass);

  emptyState.classList.toggle(
    "hidden",
    hasClass
  );

  workspace.classList.toggle(
    "hidden",
    !hasClass
  );

  if(hasClass){
    renderStudents();
  }
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

  if(classes.length){
    currentClass = classes[0];
  }

  renderClassSelect();
  showWorkspace();
}


async function createClass(){

  const name =
    newClassName.value.trim();

  if(!name){
    alert("اكتب اسم الفصل أولاً.");
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
    showWorkspace();

  }catch(error){

    alert("❌ " + error.message);

  }finally{

    createClassBtn.disabled = false;
  }
}


function addStudent(name){

  if(!currentClass) return;

  name = String(name || "").trim();

  if(!name) return;

  currentClass.data =
    normalizeData(currentClass.data);

  currentClass.data.students.push({
    id:newId("ST"),
    name:name
  });

  renderStudents();
  queueSave();
}


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

    showWorkspace();
  }
);


followupDate.addEventListener(
  "change",
  function(){

    if(currentClass){
      renderStudents();
    }
  }
);


addStudentBtn.addEventListener(
  "click",
  function(){

    addStudent(
      studentNameInput.value
    );

    studentNameInput.value = "";
    studentNameInput.focus();
  }
);


studentNameInput.addEventListener(
  "keydown",
  event=>{

    if(event.key === "Enter"){

      addStudent(
        studentNameInput.value
      );

      studentNameInput.value = "";
    }
  }
);


addBulkStudentsBtn.addEventListener(
  "click",
  function(){

    const names =
      bulkStudents.value
        .split(/\r?\n/)
        .map(name=>name.trim())
        .filter(Boolean);

    if(!names.length){
      return;
    }

    names.forEach(addStudent);

    bulkStudents.value = "";

    renderStudents();
    queueSave();
  }
);


tableBody.addEventListener(
  "input",
  function(event){

    if(!currentClass) return;

    const row =
      event.target.closest(
        "tr[data-student-id]"
      );

    if(!row) return;

    const studentId =
      row.dataset.studentId;

    const field =
      event.target.dataset.field;

    if(!field) return;

    if(field === "studentName"){

      const student =
        currentClass.data.students.find(
          item=>item.id === studentId
        );

      if(student){
        student.name =
          event.target.value;
      }

    }else{

      const record =
        getStudentRecord(studentId);

      record[field] =
        event.target.value;
    }

    updateStats();
    queueSave();
  }
);


tableBody.addEventListener(
  "change",
  function(event){

    event.target.dispatchEvent(
      new Event(
        "input",
        {bubbles:true}
      )
    );
  }
);


tableBody.addEventListener(
  "click",
  function(event){

    const button =
      event.target.closest(
        '[data-action="deleteStudent"]'
      );

    if(!button || !currentClass){
      return;
    }

    const row =
      button.closest(
        "tr[data-student-id]"
      );

    const studentId =
      row.dataset.studentId;

    const student =
      currentClass.data.students.find(
        item=>item.id === studentId
      );

    if(
      !confirm(
        `حذف الطالب "${student?.name || ""}" من الفصل؟`
      )
    ){
      return;
    }

    currentClass.data.students =
      currentClass.data.students.filter(
        item=>item.id !== studentId
      );

    Object.values(
      currentClass.data.days || {}
    ).forEach(day=>{
      delete day[studentId];
    });

    renderStudents();
    queueSave();
  }
);


deleteClassBtn.addEventListener(
  "click",
  async function(){

    if(!currentClass) return;

    if(
      !confirm(
        `حذف فصل "${currentClass.name}" وجميع بيانات متابعته؟`
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
      showWorkspace();

    }catch(error){

      alert("❌ " + error.message);
    }
  }
);



saveFollowupBtn.addEventListener(
  "click",
  async function(){

    if(!currentClass){

      alert("أنشئ فصلًا أولًا.");
      newClassName.focus();
      return;
    }

    const oldText =
      saveFollowupBtn.textContent;

    saveFollowupBtn.disabled = true;
    saveFollowupBtn.textContent =
      "⏳ جاري الحفظ...";

    await saveCurrentClass();

    saveFollowupBtn.textContent =
      "✅ تم الحفظ";

    setTimeout(function(){

      saveFollowupBtn.disabled = false;
      saveFollowupBtn.textContent =
        oldText;

    },1000);
  }
);


printFollowupBtn.addEventListener(
  "click",
  function(){

    if(!currentClass){
      return;
    }

    window.print();
  }
);


(async function init(){

  try{

    const me =
      await api("/api/me");

    teacherName.textContent =
      me.teacher?.name || "المعلم";

    await loadClasses();

  }catch(error){

    console.error(error);
  }

})();

})();