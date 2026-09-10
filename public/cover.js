(() => {
  "use strict";

  const coverButton = document.getElementById("finalCoverBtn");
  if(!coverButton) return;

  const byId = id => document.getElementById(id);

  const value = id =>
    String(byId(id)?.value || "").trim();

  const esc = text =>
    String(text ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");

  function getQuestions(){
    try{
      return Array.isArray(questions) ? questions : [];
    }catch{
      return [];
    }
  }

  function scoreValue(num){
    const n = Number(num || 0);
    return Number.isInteger(n) ? String(n) : String(n);
  }

  function totalScore(){
    const manual = value("totalScore");

    if(manual !== "" && Number.isFinite(Number(manual))){
      return scoreValue(manual);
    }

    return scoreValue(
      getQuestions().reduce(
        (sum,q)=>sum + Number(q?.score || 0),
        0
      )
    );
  }

  function questionName(index){
    const names = [
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
      "الثاني عشر"
    ];

    return names[index] || String(index + 1);
  }

  function prettyDate(raw){
    if(!raw) return "";

    const parts = raw.split("-");

    return parts.length === 3
      ? `${parts[2]}/${parts[1]}/${parts[0]}`
      : raw;
  }

  function dayName(raw){
    if(!raw) return "";

    try{
      return new Date(raw + "T12:00:00")
        .toLocaleDateString(
          "ar-SA",
          {weekday:"long"}
        );
    }catch{
      return "";
    }
  }

  function isFinalExam(){
    return /نهائ|نهاي|نهاية/.test(
      value("examType")
    );
  }


  /* =====================================================
     النافذة
  ===================================================== */

  const modal = document.createElement("div");

  modal.id = "finalCoverModal";
  modal.className = "final-cover-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div
      class="final-cover-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalCoverTitle"
    >

      <h3 id="finalCoverTitle">
        📄 غلاف الاختبار النهائي
      </h3>

      <p class="cover-subtitle">
        صفحة رسمية مستقلة تسبق أوراق الاختبار.
        لن يتم تغيير تنسيق الأسئلة أو نظام الطباعة الحالي.
      </p>

      <div class="final-cover-form">

        <div>
          <label for="finalAcademicYear">
            العام الدراسي
          </label>

          <input
            type="text"
            id="finalAcademicYear"
            placeholder="مثال: 1448 هـ"
          >
        </div>

        <div>
          <label for="finalExamRound">
            الدور
          </label>

          <input
            type="text"
            id="finalExamRound"
            value="الدور الأول"
            placeholder="الدور الأول"
          >
        </div>

        <div class="cover-full">
          <label for="finalCoverInstructions">
            تعليمات عامة
          </label>

          <textarea
            id="finalCoverInstructions"
            rows="5"
          >اقرأ/ي السؤال جيدًا قبل الإجابة
اكتب/ي بخط واضح مع مراعاة نظافة الورقة
لا تترك/ي سؤالًا بدون إجابة
راجع/ي إجاباتك قبل التسليم</textarea>
        </div>

      </div>

      <div class="final-cover-modal-actions">

        <button
          type="button"
          id="cancelFinalCoverBtn"
          class="btn light"
        >
          إلغاء
        </button>

        <button
          type="button"
          id="printFinalCoverBtn"
          class="btn primary"
        >
          🖨️ طباعة الغلاف + الاختبار
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  const academicYear =
    document.getElementById("finalAcademicYear");

  const roundInput =
    document.getElementById("finalExamRound");

  const instructionsInput =
    document.getElementById("finalCoverInstructions");


  try{
    academicYear.value =
      localStorage.getItem(
        "ekhtibari-final-academic-year"
      ) || "";

    roundInput.value =
      localStorage.getItem(
        "ekhtibari-final-round"
      ) || "الدور الأول";

    instructionsInput.value =
      localStorage.getItem(
        "ekhtibari-final-instructions"
      ) ||
`اقرأ/ي السؤال جيدًا قبل الإجابة
اكتب/ي بخط واضح مع مراعاة نظافة الورقة
لا تترك/ي سؤالًا بدون إجابة
راجع/ي إجاباتك قبل التسليم`;
  }catch{}


  function openModal(){
    modal.hidden = false;

    setTimeout(()=>{
      academicYear.focus();
    },50);
  }

  function closeModal(){
    modal.hidden = true;
  }

  document
    .getElementById("cancelFinalCoverBtn")
    .addEventListener("click",closeModal);

  modal.addEventListener("click",event=>{
    if(event.target === modal){
      closeModal();
    }
  });

  document.addEventListener("keydown",event=>{
    if(event.key === "Escape" && !modal.hidden){
      closeModal();
    }
  });


  /* =====================================================
     جدول الدرجات
  ===================================================== */

  function scoreTableHTML(){
    const qs = getQuestions();

    const rows = qs.length
      ? qs.map((q,index)=>`
          <tr>
            <td class="cover-question-name">
              ${esc(questionName(index))}
            </td>

            <td class="cover-question-score">
              ${esc(scoreValue(q?.score))}
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
      <table class="final-cover-score-table">

        <thead>

          <tr>
            <th rowspan="2">رقم السؤال</th>
            <th rowspan="2">درجة السؤال</th>

            <th colspan="2">
              الدرجة
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

          <tr class="cover-total-row">
            <td>المجموع</td>

            <td>
              ${esc(totalScore())}
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

        </tbody>

      </table>
    `;
  }


  /* =====================================================
     بناء صفحة الغلاف
  ===================================================== */

  function buildCoverPage(){

    const qs = getQuestions();

    const year =
      academicYear.value.trim();

    const round =
      roundInput.value.trim();

    const instructions =
      instructionsInput.value
        .split(/\r?\n/)
        .map(v=>v.trim())
        .filter(Boolean);

    const page =
      document.createElement("section");

    page.className =
      "print-page final-cover-page";

    if(qs.length >= 9){
      page.classList.add("cover-dense");
    }else if(qs.length >= 6){
      page.classList.add("cover-medium");
    }

    const subject =
      value("subject") || "المادة";

    const grade =
      value("grade") || "الصف";

    const semester =
      value("semester") || "الفصل الدراسي";

    const examType =
      value("examType") || "الاختبار النهائي";

    const region =
      value("region") || "المنطقة التعليمية";

    const school =
      value("school") || "اسم المدرسة";

    const duration =
      value("duration") || "-";

    const date =
      prettyDate(value("examDate")) || "-";

    const day =
      dayName(value("examDate")) || "-";


    page.innerHTML = `

      <div class="final-cover-shell">

        <div class="final-cover-top">

          <div class="final-cover-government">
            <strong>
              المملكة العربية السعودية
            </strong>

            <div>وزارة التعليم</div>

            <div>
              ${esc(region)}
            </div>

            <div>
              ${esc(school)}
            </div>
          </div>


          <div class="final-cover-logo">

            <img
              src="moe-logo.svg"
              alt="شعار وزارة التعليم"
            >

          </div>


          <div class="final-cover-meta">

            <div>
              المادة :
              <strong>${esc(subject)}</strong>
            </div>

            <div>
              الصف :
              <strong>${esc(grade)}</strong>
            </div>

            <div>
              الزمن :
              <strong>${esc(duration)}</strong>
            </div>

            <div>
              التاريخ :
              <strong>${esc(date)}</strong>
            </div>

            <div>
              اليوم :
              <strong>${esc(day)}</strong>
            </div>

          </div>

        </div>


        <div class="final-cover-title">

          <div class="final-cover-basmala">
            بسم الله الرحمن الرحيم
          </div>

          <h1>
            ${esc(examType)}
            لمادة
            ${esc(subject)}
          </h1>

          <div class="final-cover-grade">
            للصف ${esc(grade)}
          </div>

          <div class="final-cover-year">
            ( العام الدراسي ${esc(year)} )
          </div>

          <div class="final-cover-term">
            ${esc(semester)}
            ${round ? ` ( ${esc(round)} )` : ""}
          </div>

        </div>


        <div class="final-cover-student">

          <div class="final-cover-student-row">

            <span class="final-cover-student-label">
              اسم الطالب/ة:
            </span>

            <span class="final-cover-student-line"></span>

          </div>


          <div class="final-cover-student-row">

            <span class="final-cover-student-label">
              رقم الجلوس:
            </span>

            <span class="final-cover-student-line"></span>

          </div>

        </div>


        <div class="final-cover-score-wrap">
          ${scoreTableHTML()}
        </div>


        ${
          instructions.length
            ? `
              <div class="final-cover-instructions">

                <div class="final-cover-instructions-title">
                  تعليمات عامة:
                </div>

                ${instructions.map(line=>`
                  <div class="final-cover-instruction">
                    ${esc(line)}
                  </div>
                `).join("")}

              </div>
            `
            : ""
        }


        <div class="final-cover-footer">
          غلاف الاختبار النهائي
        </div>

      </div>
    `;

    return page;
  }


  /* =====================================================
     تشغيل زر الغلاف
  ===================================================== */

  coverButton.addEventListener("click",()=>{

    if(!isFinalExam()){
      alert(
        'هذا الغلاف مخصص للاختبار النهائي.\n' +
        'اكتب في خانة "نوع الاختبار": اختبار نهائي.'
      );

      return;
    }

    openModal();
  });


  document
    .getElementById("printFinalCoverBtn")
    .addEventListener("click",async()=>{

      const year =
        academicYear.value.trim();

      if(!year){
        alert("اكتب العام الدراسي أولًا.");
        academicYear.focus();
        return;
      }

      if(!getQuestions().length){
        alert("أضف أسئلة الاختبار أولًا.");
        return;
      }

      try{

        localStorage.setItem(
          "ekhtibari-final-academic-year",
          year
        );

        localStorage.setItem(
          "ekhtibari-final-round",
          roundInput.value.trim()
        );

        localStorage.setItem(
          "ekhtibari-final-instructions",
          instructionsInput.value
        );

      }catch{}


      let previousVersion = "student";

      try{

        previousVersion = currentVersion;

        /* الغلاف النهائي دائمًا يطبع نسخة الطالب */
        currentVersion = "student";

        if(typeof refreshAll === "function"){
          refreshAll();
        }

        /*
          نستعمل نظام الطباعة الحالي كما هو.
          لا نعدله ولا نستبدله.
        */
        await buildPrintPages();

        const root =
          document.getElementById("printRoot");

        if(!root){
          throw new Error(
            "حاوية الطباعة غير موجودة"
          );
        }

        const cover =
          buildCoverPage();

        root.insertBefore(
          cover,
          root.firstChild
        );

        closeModal();


        const restoreAfterPrint = ()=>{

          cover.remove();

          currentVersion =
            previousVersion;

          if(typeof refreshAll === "function"){
            refreshAll();
          }

        };


        window.addEventListener(
          "afterprint",
          restoreAfterPrint,
          {once:true}
        );


        setTimeout(()=>{
          window.print();
        },100);


      }catch(error){

        console.error(
          "FINAL COVER ERROR",
          error
        );

        try{
          currentVersion =
            previousVersion;

          if(typeof refreshAll === "function"){
            refreshAll();
          }
        }catch{}

        alert(
          "تعذر تجهيز غلاف الاختبار. " +
          "لم يتم تغيير نظام الطباعة الأساسي."
        );
      }

    });


})();
