(() => {
  "use strict";

  const $c = id => document.getElementById(id);

  const btn = $c("finalCoverBtn");
  const examType = $c("examType");

  if(!btn || !examType) return;

  const esc = value =>
    String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  const val = id =>
    String($c(id)?.value || "").trim();

  function getQuestionsSafe(){
    try{
      return Array.isArray(questions) ? questions : [];
    }catch{
      return [];
    }
  }

  function getSchoolLogo(){
    try{
      return typeof schoolLogoData !== "undefined"
        ? String(schoolLogoData || "")
        : "";
    }catch{
      return "";
    }
  }

  function isFinal(){
    return /نهائ|نهاي/.test(val("examType"));
  }

  function formatCoverDate(raw){
    if(!raw) return "";
    const p = raw.split("-");
    return p.length === 3
      ? `${p[2]}/${p[1]}/${p[0]}`
      : raw;
  }

  function getDay(raw){
    if(!raw) return "";
    try{
      return new Intl.DateTimeFormat(
        "ar-SA",
        {weekday:"long"}
      ).format(
        new Date(raw + "T12:00:00")
      );
    }catch{
      return "";
    }
  }

  let coverRows = [];
  let approvalColumns = [
    "المصحح/ة",
    "المراجع/ة",
    "المدقق/ة"
  ];

  let coverTableInitialized = false;

  function totalScore(){
    return coverRows.reduce(
      (sum,row)=>sum + Number(row.score || 0),
      0
    );
  }


  function questionLabel(i){
    const n = [
      "الأول","الثاني","الثالث","الرابع",
      "الخامس","السادس","السابع","الثامن",
      "التاسع","العاشر","الحادي عشر","الثاني عشر",
      "الثالث عشر","الرابع عشر","الخامس عشر"
    ];

    return n[i] || String(i + 1);
  }


  /* =====================================================
     النافذة
  ===================================================== */

  const modal = document.createElement("div");

  modal.className = "final-cover-modal";
  modal.id = "finalCoverModal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="final-cover-box">

      <div class="final-cover-controls">

        <h3>غلاف الاختبار النهائي</h3>

        <p class="final-cover-note">
          عدّل بيانات الغلاف ثم شاهد المعاينة مباشرة.
          طباعة الغلاف مستقلة تمامًا عن طباعة أوراق الاختبار.
        </p>

        <div class="fc-grid">

          <div class="fc-field">
            <label>المنطقة التعليمية</label>
            <input id="fcRegion">
          </div>

          <div class="fc-field">
            <label>المدرسة</label>
            <input id="fcSchool">
          </div>

          <div class="fc-field">
            <label>المادة</label>
            <input id="fcSubject">
          </div>

          <div class="fc-field">
            <label>الصف</label>
            <input id="fcGrade">
          </div>

          <div class="fc-field">
            <label>زمن الاختبار</label>
            <input id="fcDuration">
          </div>

          <div class="fc-field">
            <label>التاريخ</label>
            <input id="fcDate">
          </div>

          <div class="fc-field">
            <label>اليوم</label>
            <input id="fcDay">
          </div>

          <div class="fc-field">
            <label>العام الدراسي</label>
            <input
              id="fcYear"
              placeholder="مثال: 1448 هـ"
            >
          </div>

          <div class="fc-field">
            <label>الفصل الدراسي</label>
            <input id="fcSemester">
          </div>

          <div class="fc-field">
            <label>الدور</label>
            <input
              id="fcRound"
              value="الدور الأول"
            >
          </div>

          <div class="fc-field full">
            <label>عنوان الاختبار</label>
            <input id="fcExamTitle">
          </div>

          <div class="fc-field full">
            <label>تعليمات الاختبار</label>
            <textarea id="fcInstructions" rows="5"></textarea>
          </div>

        </div>

        <div class="fc-table-settings">

          <div class="fc-table-settings-title">
            جدول الدرجات
          </div>

          <div class="fc-table-settings-note">
            اكتب درجة كل سؤال، والمجموع يحسب تلقائيًا.
          </div>

          <div class="fc-table-actions">
            <button
              type="button"
              id="fcAddScoreRow"
              class="btn light"
            >
              + إضافة صف
            </button>

            <button
              type="button"
              id="fcAddApprovalColumn"
              class="btn light"
            >
              + إضافة عمود
            </button>
          </div>

          <div id="fcScoreRowsEditor"></div>

          <div class="fc-cover-total">
            المجموع:
            <strong id="fcAutoTotal">0</strong>
          </div>

          <div class="fc-table-settings-title">
            أعمدة الاعتماد
          </div>

          <div id="fcApprovalColumnsEditor"></div>

        </div>

        <label class="fc-check">
          <input
            type="checkbox"
            id="fcUseSchoolLogo"
            checked
          >
          إظهار شعار المدرسة المرفوع إن وجد
        </label>

        <div class="fc-actions">

          <button
            type="button"
            id="fcReload"
            class="btn light"
          >
            ↻ تحديث من بيانات الاختبار
          </button>

          <button
            type="button"
            id="fcPrint"
            class="btn primary"
          >
            🖨️ طباعة الغلاف
          </button>

          <button
            type="button"
            id="fcClose"
            class="btn light"
          >
            إغلاق
          </button>

        </div>

      </div>

      <div class="final-cover-preview">
        <div id="fcPreview"></div>
      </div>

    </div>
  `;

  document.body.appendChild(modal);


  const fieldIds = [
    "fcRegion","fcSchool","fcSubject",
    "fcGrade","fcDuration","fcDate",
    "fcDay","fcYear","fcSemester",
    "fcRound","fcExamTitle",
    "fcInstructions","fcUseSchoolLogo"
  ];


  function resetCoverRowsFromExam(){

    const qs = getQuestionsSafe();

    coverRows = qs.length
      ? qs.map((q,i)=>({
          label:questionLabel(i),
          score:Number(q?.score || 0)
        }))
      : [{
          label:"الأول",
          score:0
        }];

    coverTableInitialized = true;

    renderTableEditor();
  }


  function renderTableEditor(){

    const rowsBox =
      $c("fcScoreRowsEditor");

    const colsBox =
      $c("fcApprovalColumnsEditor");

    if(rowsBox){

      rowsBox.innerHTML =
        coverRows.map((row,index)=>`
          <div class="fc-edit-score-row">

            <span class="fc-edit-num">
              ${index + 1}
            </span>

            <input
              type="text"
              data-cover-label="${index}"
              value="${esc(row.label)}"
              placeholder="السؤال"
            >

            <input
              type="number"
              min="0"
              step="0.5"
              data-cover-score="${index}"
              value="${Number(row.score || 0)}"
              placeholder="الدرجة"
            >

            <button
              type="button"
              class="fc-delete-small"
              data-delete-cover-row="${index}"
            >
              ×
            </button>

          </div>
        `).join("");
    }


    if(colsBox){

      colsBox.innerHTML =
        approvalColumns.map((title,index)=>`
          <div class="fc-edit-column-row">

            <input
              type="text"
              data-cover-column="${index}"
              value="${esc(title)}"
              placeholder="اسم العمود"
            >

            <button
              type="button"
              class="fc-delete-small"
              data-delete-cover-column="${index}"
            >
              ×
            </button>

          </div>
        `).join("");
    }


    if($c("fcAutoTotal")){
      $c("fcAutoTotal").textContent =
        totalScore();
    }
  }


  function loadFromExam(forceRows=false){

    $c("fcRegion").value =
      val("region");

    $c("fcSchool").value =
      val("school");

    $c("fcSubject").value =
      val("subject");

    $c("fcGrade").value =
      val("grade");

    $c("fcDuration").value =
      val("duration");

    $c("fcDate").value =
      formatCoverDate(val("examDate"));

    $c("fcDay").value =
      getDay(val("examDate"));

    $c("fcSemester").value =
      val("semester");

    $c("fcExamTitle").value =
      val("examType") || "اختبار نهائي";

    if(!$c("fcRound").value){
      $c("fcRound").value =
        "الدور الأول";
    }

    if(!$c("fcInstructions").value){

      $c("fcInstructions").value =
`اقرأ/ي السؤال جيدًا قبل البدء بالإجابة.
اكتب/ي الإجابة بخط واضح.
تأكد/ي من الإجابة عن جميع الأسئلة.
راجع/ي إجاباتك قبل تسليم الورقة.`;
    }

    if(forceRows || !coverTableInitialized){
      resetCoverRowsFromExam();
    }else{
      renderTableEditor();
    }

    renderPreview();
  }


  function scoreTable(){

    const rows =
      coverRows.map((row,index)=>`

        <tr>

          <td class="fc-q">
            ${esc(row.label || questionLabel(index))}
          </td>

          <td class="fc-question-score">
            ${esc(Number(row.score || 0))}
          </td>

          <td></td>
          <td></td>

          ${approvalColumns.map(()=>`
            <td class="fc-name-box"></td>
            <td class="fc-signature-box"></td>
          `).join("")}

        </tr>

      `).join("");


    return `
      <table class="fc-score-table">

        <thead>

          <tr>

            <th rowspan="2">
              رقم السؤال
            </th>

            <th rowspan="2">
              درجة السؤال
            </th>

            <th colspan="2">
              الدرجة
            </th>

            ${approvalColumns.map(title=>`
              <th colspan="2">
                ${esc(title)}
              </th>
            `).join("")}

          </tr>

          <tr>

            <th>رقمًا</th>
            <th>كتابة</th>

            ${approvalColumns.map(()=>`
              <th>الاسم</th>
              <th>التوقيع</th>
            `).join("")}

          </tr>

        </thead>

        <tbody>

          ${rows}

          <tr class="fc-total">

            <td>
              المجموع
            </td>

            <td>
              ${esc(totalScore())}
            </td>

            <td></td>
            <td></td>

            ${approvalColumns.map(()=>`
              <td></td>
              <td></td>
            `).join("")}

          </tr>

        </tbody>

      </table>
    `;
  }


  function coverHTML(){

    const schoolLogo =
      $c("fcUseSchoolLogo").checked
        ? getSchoolLogo()
        : "";

    const instructions =
      String($c("fcInstructions").value || "")
        .split(/\r?\n/)
        .map(x=>x.trim())
        .filter(Boolean);

    const dense =
      coverRows.length > 8 ||
      approvalColumns.length > 3
        ? "dense"
        : "";

    return `
      <div class="fc-sheet ${dense}">

        <div class="fc-frame">

          <div class="fc-head">

            <div class="fc-head-info">
              <div>
                <strong>
                  المملكة العربية السعودية
                </strong>
              </div>

              <div>وزارة التعليم</div>

              <div>
                ${esc($c("fcRegion").value || "المنطقة التعليمية")}
              </div>

              <div>
                ${esc($c("fcSchool").value || "اسم المدرسة")}
              </div>
            </div>


            <div class="fc-logo">

              <img
                src="moe-logo.svg"
                class="moe"
                alt=""
              >

              ${
                schoolLogo
                  ? `
                    <img
                      src="${esc(schoolLogo)}"
                      class="school"
                      alt=""
                    >
                  `
                  : ""
              }

            </div>


            <div class="fc-head-info left">

              <div>
                المادة:
                <strong>
                  ${esc($c("fcSubject").value || "-")}
                </strong>
              </div>

              <div>
                الصف:
                <strong>
                  ${esc($c("fcGrade").value || "-")}
                </strong>
              </div>

              <div>
                الزمن:
                <strong>
                  ${esc($c("fcDuration").value || "-")}
                </strong>
              </div>

              <div>
                اليوم:
                <strong>
                  ${esc($c("fcDay").value || "-")}
                </strong>
              </div>

              <div>
                التاريخ:
                <strong>
                  ${esc($c("fcDate").value || "-")}
                </strong>
              </div>

            </div>

          </div>


          <div class="fc-main-title">

            <div class="basmala">
              بسم الله الرحمن الرحيم
            </div>

            <h1>
              ${esc($c("fcExamTitle").value || "الاختبار النهائي")}
              لمادة
              ${esc($c("fcSubject").value || "المادة")}
            </h1>

            <div class="sub">
              للصف
              ${esc($c("fcGrade").value || "-")}
            </div>

            <div class="sub">
              العام الدراسي
              ${esc($c("fcYear").value || "................")}
            </div>

            <div class="sub">
              ${esc($c("fcSemester").value || "")}
              ${
                $c("fcRound").value
                  ? ` - ${esc($c("fcRound").value)}`
                  : ""
              }
            </div>

          </div>


          <div class="fc-student-box">

            <div class="fc-student-row">
              اسم الطالب/الطالبة:
              <span class="fc-student-line"></span>
            </div>

            <div class="fc-student-row">
              رقم الجلوس:
              <span class="fc-student-line"></span>
            </div>

          </div>


          ${scoreTable()}


          ${
            instructions.length
              ? `
                <div class="fc-instructions">

                  <div class="fc-instructions-title">
                    تعليمات الاختبار
                  </div>

                  ${instructions.map(x=>`
                    <div class="fc-inst">
                      ${esc(x)}
                    </div>
                  `).join("")}

                </div>
              `
              : ""
          }


          <div class="fc-footer">
            مع تمنياتنا لكم بالتوفيق والنجاح
          </div>

        </div>

      </div>
    `;
  }


  function renderPreview(){
    $c("fcPreview").innerHTML =
      coverHTML();
  }


  function syncButton(){

    btn.style.display = "inline-flex";

    if(isFinal()){
      btn.classList.remove("final-cover-locked");
      btn.title = "فتح غلاف الاختبار النهائي";
      btn.setAttribute("aria-label","فتح غلاف الاختبار النهائي");
    }else{
      btn.classList.add("final-cover-locked");
      btn.title = "يتطلب اختيار اختبار نهائي أولًا";
      btn.setAttribute("aria-label","يتطلب اختيار اختبار نهائي أولًا");
    }
  }


  btn.addEventListener("click",()=>{

    if(!isFinal()){

      alert(
        'غلاف الاختبار مخصص للاختبار النهائي.\n\n' +
        'من خانة "نوع الاختبار" بالأعلى اختر أو اكتب "اختبار نهائي"، ' +
        'ثم اضغط على زر غلاف الاختبار مرة أخرى.'
      );

      try{
        examType.focus();
        examType.scrollIntoView({
          behavior:"smooth",
          block:"center"
        });
      }catch{}

      return;
    }

    loadFromExam();

    modal.hidden = false;
  });


  $c("fcClose").addEventListener(
    "click",
    ()=>modal.hidden = true
  );


  $c("fcReload").addEventListener(
    "click",
    ()=>loadFromExam(true)
  );


  modal.addEventListener("click",e=>{
    if(e.target === modal){
      modal.hidden = true;
    }
  });


  fieldIds.forEach(id=>{

    const el = $c(id);
    if(!el) return;

    el.addEventListener(
      "input",
      renderPreview
    );

    el.addEventListener(
      "change",
      renderPreview
    );

  });


  $c("fcAddScoreRow").addEventListener(
    "click",
    ()=>{

      coverRows.push({
        label:questionLabel(coverRows.length),
        score:0
      });

      renderTableEditor();
      renderPreview();
    }
  );


  $c("fcAddApprovalColumn").addEventListener(
    "click",
    ()=>{

      approvalColumns.push(
        "اعتماد جديد"
      );

      renderTableEditor();
      renderPreview();
    }
  );


  $c("fcScoreRowsEditor").addEventListener(
    "input",
    event=>{

      if(event.target.matches("[data-cover-label]")){

        const i =
          Number(event.target.dataset.coverLabel);

        coverRows[i].label =
          event.target.value;

        renderPreview();
      }


      if(event.target.matches("[data-cover-score]")){

        const i =
          Number(event.target.dataset.coverScore);

        coverRows[i].score =
          Math.max(
            0,
            Number(event.target.value || 0)
          );

        $c("fcAutoTotal").textContent =
          totalScore();

        renderPreview();
      }

    }
  );


  $c("fcScoreRowsEditor").addEventListener(
    "click",
    event=>{

      const btn =
        event.target.closest(
          "[data-delete-cover-row]"
        );

      if(!btn) return;

      if(coverRows.length <= 1){
        alert("يجب أن يبقى صف واحد على الأقل.");
        return;
      }

      coverRows.splice(
        Number(btn.dataset.deleteCoverRow),
        1
      );

      renderTableEditor();
      renderPreview();
    }
  );


  $c("fcApprovalColumnsEditor").addEventListener(
    "input",
    event=>{

      if(
        !event.target.matches(
          "[data-cover-column]"
        )
      ){
        return;
      }

      const i =
        Number(event.target.dataset.coverColumn);

      approvalColumns[i] =
        event.target.value;

      renderPreview();
    }
  );


  $c("fcApprovalColumnsEditor").addEventListener(
    "click",
    event=>{

      const btn =
        event.target.closest(
          "[data-delete-cover-column]"
        );

      if(!btn) return;

      if(approvalColumns.length <= 1){
        alert("يجب أن يبقى عمود واحد على الأقل.");
        return;
      }

      approvalColumns.splice(
        Number(btn.dataset.deleteCoverColumn),
        1
      );

      renderTableEditor();
      renderPreview();
    }
  );


  examType.addEventListener(
    "input",
    syncButton
  );

  examType.addEventListener(
    "change",
    syncButton
  );


  $c("fcPrint").addEventListener(
    "click",
    ()=>{

      const popup =
        window.open(
          "",
          "_blank",
          "width=1000,height=900"
        );

      if(!popup){
        alert(
          "المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى."
        );
        return;
      }

      const markup =
        coverHTML();

      popup.document.open();

      popup.document.write(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>غلاف الاختبار النهائي</title>

<link
  rel="stylesheet"
  href="final-cover.css"
>

</head>

<body>

${markup}

<script>
window.addEventListener("load",function(){
  setTimeout(function(){
    window.focus();
    window.print();
  },300);
});
<\/script>

</body>
</html>
      `);

      popup.document.close();
    }
  );


  syncButton();

})();
