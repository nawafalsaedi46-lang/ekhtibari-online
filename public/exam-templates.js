(function () {
  "use strict";

  if (document.getElementById("proExamTemplates")) return;

  const examType = document.getElementById("examType");
  const duration = document.getElementById("duration");
  const totalScore = document.getElementById("totalScore");
  const questionFontSize = document.getElementById("questionFontSize");
  const paperFrame = document.getElementById("paperFrame");
  const endMessage = document.getElementById("endMessage");

  if (!examType || !duration || !totalScore) return;

  const section = examType.closest("section.card");
  const formGrid = section ? section.querySelector(".form-grid") : null;
  if (!section || !formGrid) return;

  const presets = [
    {
      id: "short",
      icon: "⚡",
      title: "اختبار قصير",
      desc: "للتقويم السريع والاختبارات اليومية",
      time: "20 دقيقة",
      score: "10",
      type: "اختبار قصير",
      font: "14",
      frame: "simple"
    },
    {
      id: "period",
      icon: "📝",
      title: "اختبار فترة",
      desc: "قالب متوازن لاختبارات الفترات",
      time: "45 دقيقة",
      score: "20",
      type: "اختبار فترة",
      font: "14",
      frame: "official"
    },
    {
      id: "midterm",
      icon: "📘",
      title: "منتصف الفصل",
      desc: "اختبار شامل لمنتصف الفصل الدراسي",
      time: "60 دقيقة",
      score: "30",
      type: "اختبار منتصف الفصل",
      font: "14",
      frame: "official"
    },
    {
      id: "final",
      icon: "🏆",
      title: "اختبار نهائي",
      desc: "قالب رسمي للاختبارات النهائية",
      time: "90 دقيقة",
      score: "40",
      type: "اختبار نهائي",
      font: "14",
      frame: "official"
    }
  ];

  const style = document.createElement("style");
  style.id = "proExamTemplatesStyle";
  style.textContent = `
    .pet-wrap{
      margin:0 0 22px;
      border:1px solid #e2e8f0;
      border-radius:20px;
      background:linear-gradient(135deg,#ffffff 0%,#f8fafc 100%);
      padding:18px;
      box-shadow:0 8px 28px rgba(15,23,42,.055);
    }

    .pet-head{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      margin-bottom:15px;
    }

    .pet-title{
      display:flex;
      align-items:center;
      gap:10px;
    }

    .pet-title-icon{
      width:40px;
      height:40px;
      border-radius:12px;
      display:flex;
      align-items:center;
      justify-content:center;
      background:#ecfdf5;
      font-size:20px;
    }

    .pet-title h3{
      margin:0;
      font-size:17px;
      color:#0f172a;
      font-weight:900;
    }

    .pet-title p{
      margin:3px 0 0;
      font-size:11px;
      color:#64748b;
    }

    .pet-badge{
      background:#f0fdfa;
      color:#0f766e;
      border:1px solid #ccfbf1;
      border-radius:999px;
      padding:6px 10px;
      font-size:10px;
      font-weight:900;
      white-space:nowrap;
    }

    .pet-grid{
      display:grid;
      grid-template-columns:repeat(4,minmax(0,1fr));
      gap:11px;
    }

    .pet-card{
      position:relative;
      border:1px solid #e2e8f0;
      background:#fff;
      border-radius:16px;
      padding:15px 13px;
      text-align:right;
      cursor:pointer;
      transition:.18s ease;
      font-family:inherit;
      min-height:150px;
    }

    .pet-card:hover{
      transform:translateY(-3px);
      border-color:#14b8a6;
      box-shadow:0 10px 25px rgba(15,118,110,.10);
    }

    .pet-card.active{
      border:2px solid #0f766e;
      background:#f0fdfa;
      box-shadow:0 0 0 3px rgba(15,118,110,.08);
    }

    .pet-icon{
      font-size:27px;
      margin-bottom:8px;
    }

    .pet-name{
      font-size:14px;
      font-weight:900;
      color:#0f172a;
      margin-bottom:4px;
    }

    .pet-desc{
      font-size:10.5px;
      color:#64748b;
      line-height:1.6;
      min-height:34px;
    }

    .pet-info{
      display:flex;
      gap:5px;
      flex-wrap:wrap;
      margin-top:10px;
    }

    .pet-info span{
      background:#f1f5f9;
      color:#475569;
      border-radius:999px;
      padding:4px 7px;
      font-size:9px;
      font-weight:800;
    }

    .pet-selected{
      display:none;
      position:absolute;
      top:9px;
      left:9px;
      background:#0f766e;
      color:white;
      width:22px;
      height:22px;
      border-radius:50%;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:bold;
    }

    .pet-card.active .pet-selected{
      display:flex;
    }

    .pet-note{
      margin-top:13px;
      padding:9px 11px;
      border-radius:10px;
      background:#f8fafc;
      color:#64748b;
      font-size:10px;
      line-height:1.6;
    }

    .pet-toast{
      position:fixed;
      left:50%;
      bottom:28px;
      transform:translate(-50%,20px);
      padding:11px 17px;
      background:#0f172a;
      color:#fff;
      border-radius:11px;
      font-size:12px;
      font-weight:800;
      z-index:999999;
      opacity:0;
      transition:.2s;
      pointer-events:none;
      box-shadow:0 12px 30px rgba(0,0,0,.25);
    }

    .pet-toast.show{
      opacity:1;
      transform:translate(-50%,0);
    }

    @media(max-width:900px){
      .pet-grid{grid-template-columns:repeat(2,1fr)}
    }

    @media(max-width:520px){
      .pet-grid{grid-template-columns:1fr}
      .pet-head{align-items:flex-start}
      .pet-badge{display:none}
    }
  `;

  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "proExamTemplates";
  wrap.className = "pet-wrap";

  wrap.innerHTML = `
    <div class="pet-head">
      <div class="pet-title">
        <div class="pet-title-icon">📋</div>
        <div>
          <h3>قوالب الاختبارات الجاهزة</h3>
          <p>اختر القالب المناسب ثم عدّل البيانات كما تريد</p>
        </div>
      </div>

      <div class="pet-badge">جاهز للاستخدام</div>
    </div>

    <div class="pet-grid">
      ${presets.map(p => `
        <button type="button" class="pet-card" data-template="${p.id}">
          <div class="pet-selected">✓</div>
          <div class="pet-icon">${p.icon}</div>
          <div class="pet-name">${p.title}</div>
          <div class="pet-desc">${p.desc}</div>

          <div class="pet-info">
            <span>⏱ ${p.time}</span>
            <span>⭐ ${p.score} درجة</span>
          </div>
        </button>
      `).join("")}
    </div>

    <div class="pet-note">
      القالب يغيّر نوع الاختبار والزمن والدرجة وإعدادات الورقة فقط، ولا يحذف الأسئلة ولا يغيّر المدرسة أو المادة أو الصف.
    </div>
  `;

  formGrid.parentNode.insertBefore(wrap, formGrid);

  const toast = document.createElement("div");
  toast.className = "pet-toast";
  document.body.appendChild(toast);

  function fire(el) {
    if (!el) return;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  function applyPreset(preset) {
    examType.value = preset.type;
    duration.value = preset.time;
    totalScore.value = preset.score;

    if (questionFontSize) questionFontSize.value = preset.font;
    if (paperFrame) paperFrame.value = preset.frame;
    if (endMessage) endMessage.value = "( انتهت الأسئلة )";

    [
      examType,
      duration,
      totalScore,
      questionFontSize,
      paperFrame,
      endMessage
    ].forEach(fire);

    wrap.querySelectorAll(".pet-card").forEach(card => {
      card.classList.toggle(
        "active",
        card.dataset.template === preset.id
      );
    });

    showToast("✅ تم تطبيق قالب " + preset.title);
  }

  wrap.addEventListener("click", function (event) {
    const card = event.target.closest(".pet-card");
    if (!card) return;

    const preset = presets.find(p => p.id === card.dataset.template);
    if (!preset) return;

    applyPreset(preset);
  });

})();