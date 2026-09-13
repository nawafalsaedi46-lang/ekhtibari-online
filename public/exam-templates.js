(function () {
  "use strict";

  var examType = document.getElementById("examType");
  var duration = document.getElementById("duration");
  var totalScore = document.getElementById("totalScore");

  if (!examType || !duration || !totalScore) {
    console.warn("Exam Templates: required fields not found");
    return;
  }

  var section = examType.closest("section.card");
  var formGrid = section ? section.querySelector(".form-grid") : null;

  if (!section || !formGrid) {
    console.warn("Exam Templates: exam section not found");
    return;
  }

  /* التصميم داخل نفس الملف حتى لا نلمس style.css */
  var style = document.createElement("style");
  style.textContent = `
    .exam-templates-safe{
      margin:0 0 18px;
      padding:16px;
      border:1px solid #dbe4ec;
      border-radius:16px;
      background:#f8fafc;
    }

    .exam-templates-safe h3{
      margin:0 0 5px;
      color:#0f172a;
      font-size:17px;
    }

    .exam-templates-safe p{
      margin:0 0 13px;
      color:#64748b;
      font-size:12px;
    }

    .exam-templates-safe-grid{
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:9px;
    }

    .exam-template-safe-btn{
      border:1px solid #dbe4ec;
      background:#fff;
      border-radius:12px;
      padding:13px 9px;
      cursor:pointer;
      font:inherit;
      text-align:center;
      color:#0f172a;
    }

    .exam-template-safe-btn:hover{
      border-color:#0f766e;
      background:#f0fdfa;
    }

    .exam-template-safe-btn strong{
      display:block;
      margin-bottom:5px;
      font-size:13px;
    }

    .exam-template-safe-btn span{
      display:block;
      color:#64748b;
      font-size:10px;
    }

    @media(max-width:800px){
      .exam-templates-safe-grid{
        grid-template-columns:repeat(2,1fr);
      }
    }
  `;
  document.head.appendChild(style);

  var box = document.createElement("div");
  box.className = "exam-templates-safe";

  box.innerHTML = `
    <h3>📋 قوالب الاختبارات الجاهزة</h3>
    <p>اختر قالبًا كبداية، وبعدها تستطيع تعديل جميع البيانات يدويًا.</p>

    <div class="exam-templates-safe-grid">

      <button type="button" class="exam-template-safe-btn"
        data-type="اختبار قصير"
        data-duration="20 دقيقة"
        data-score="10">
        <strong>⚡ اختبار قصير</strong>
        <span>20 دقيقة • 10 درجات</span>
      </button>

      <button type="button" class="exam-template-safe-btn"
        data-type="اختبار فترة"
        data-duration="45 دقيقة"
        data-score="20">
        <strong>📝 اختبار فترة</strong>
        <span>45 دقيقة • 20 درجة</span>
      </button>

      <button type="button" class="exam-template-safe-btn"
        data-type="اختبار منتصف الفصل"
        data-duration="60 دقيقة"
        data-score="30">
        <strong>📘 منتصف الفصل</strong>
        <span>60 دقيقة • 30 درجة</span>
      </button>

      <button type="button" class="exam-template-safe-btn"
        data-type="اختبار نهائي"
        data-duration="90 دقيقة"
        data-score="40">
        <strong>🏆 اختبار نهائي</strong>
        <span>90 دقيقة • 40 درجة</span>
      </button>

    </div>
  `;

  formGrid.parentNode.insertBefore(box, formGrid);

  box.addEventListener("click", function (e) {
    var btn = e.target.closest(".exam-template-safe-btn");
    if (!btn) return;

    examType.value = btn.getAttribute("data-type");
    duration.value = btn.getAttribute("data-duration");
    totalScore.value = btn.getAttribute("data-score");

    [examType, duration, totalScore].forEach(function (el) {
      el.dispatchEvent(new Event("input", { bubbles:true }));
      el.dispatchEvent(new Event("change", { bubbles:true }));
    });
  });

})();
