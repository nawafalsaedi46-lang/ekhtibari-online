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

  function totalScore(){
    const qs = getQuestionsSafe();

    return qs.reduce(
      (sum,q)=>sum + Number(q?.score || 0),
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


  function loadFromExam(){

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
      $c("fcRound").value = "الدور الأول";
    }

    if(!$c("fcInstructions").value){
      $c("fcInstructions").value =
`اقرأ/ي السؤال جيدًا قبل البدء بالإجابة.
اكتب/ي الإجابة بخط واضح.
تأكد/ي من الإجابة عن جميع الأسئلة.
راجع/ي إجاباتك قبل تسليم الورقة.`;
    }

    renderPreview();
  }


  function scoreTable(){

    const qs = getQuestionsSafe();

    const rows = qs.length
      ? qs.map((q,i)=>`
          <tr>
            <td class="fc-q">
              ${esc(questionLabel(i))}
            </td>

            <td>
              ${esc(Number(q?.score || 0))}
            </td>

            <td></td>
            <td></td>

            <td></td>
            <td></td>

            <td></td>
            <td></td>

            <td></td>
            <td></td>
          </tr>
        `).join("")
      : `
        <tr>
          <td>-</td>
          <td>0</td>
          <td></td><td></td>
          <td></td><td></td>
          <td></td><td></td>
          <td></td><td></td>
        </tr>
      `;

    return `
      <table class="fc-score-table">

        <thead>

          <tr>
            <th rowspan="2">السؤال</th>
            <th rowspan="2">درجته</th>

            <th colspan="2">
              الدرجة المستحقة
            </th>

            <th colspan="2">
              المصحح/ة
            </th>

            <th colspan="2">
              المراجع/ة
            </th>

            <th colspan="2">
              المدقق/ة
            </th>
          </tr>

          <tr>
            <th>رقمًا</th>
            <th>كتابة</th>

            <th>الاسم</th>
            <th>التوقيع</th>

            <th>الاسم</th>
            <th>التوقيع</th>

            <th>الاسم</th>
            <th>التوقيع</th>
          </tr>

        </thead>

        <tbody>

          ${rows}

          <tr class="fc-total">
            <td>المجموع</td>
            <td>${esc(totalScore())}</td>
            <td></td><td></td>
            <td></td><td></td>
            <td></td><td></td>
            <td></td><td></td>
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
      getQuestionsSafe().length > 8
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
    loadFromExam
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
