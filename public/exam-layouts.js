(function(){
  "use strict";

  const KEY = "ekhtibari_full_exam_layout";

  const layouts = [
    ["1","التصميم الأصلي"],
    ["2","وزاري رسمي"],
    ["3","حديث احترافي"],
    ["4","أكاديمي هادئ"],
    ["5","كلاسيكي فاخر"]
  ];

  const ordinal = [
    "",
    "الأول","الثاني","الثالث","الرابع","الخامس",
    "السادس","السابع","الثامن","التاسع","العاشر",
    "الحادي عشر","الثاني عشر","الثالث عشر","الرابع عشر",
    "الخامس عشر","السادس عشر","السابع عشر","الثامن عشر",
    "التاسع عشر","العشرون"
  ];

  const sections = [
    "",
    "أولاً","ثانيًا","ثالثًا","رابعًا","خامسًا",
    "سادسًا","سابعًا","ثامنًا","تاسعًا","عاشرًا"
  ];

  function val(id, fallback=""){
    const el = document.getElementById(id);
    const value = String(el?.value || "").trim();
    return value || fallback;
  }

  function getLayout(){
    return localStorage.getItem(KEY) || "1";
  }

  function setText(el, value){
    if(el && el.textContent !== value){
      el.textContent = value;
    }
  }

  function formatDate(value){
    if(!value) return "-";
    const p = value.split("-");
    return p.length === 3
      ? `${p[2]}/${p[1]}/${p[0]}`
      : value;
  }

  function ensureHeaderExtras(header){

    const parent = header.parentElement;
    if(!parent) return;

    let hero = [...parent.children]
      .find(el=>el.classList?.contains("layout-hero"));

    if(!hero){
      hero = document.createElement("div");
      hero.className = "layout-hero";

      hero.innerHTML = `
        <div class="layout-hero-main">
          <strong class="layout-hero-subject"></strong>
          <span class="layout-hero-type"></span>
        </div>
        <div class="layout-hero-side"></div>
      `;

      parent.insertBefore(hero, header);
    }

    let meta = [...parent.children]
      .find(el=>el.classList?.contains("layout-meta-strip"));

    if(!meta){
      meta = document.createElement("div");
      meta.className = "layout-meta-strip";

      meta.innerHTML = `
        <span data-meta="grade"></span>
        <span data-meta="semester"></span>
        <span data-meta="date"></span>
        <span data-meta="duration"></span>
        <span data-meta="score"></span>
        <span data-meta="school"></span>
      `;

      header.insertAdjacentElement("afterend", meta);
    }

    setText(
      hero.querySelector(".layout-hero-subject"),
      val("subject","المادة")
    );

    setText(
      hero.querySelector(".layout-hero-type"),
      val("examType","اختبار")
    );

    setText(
      hero.querySelector(".layout-hero-side"),
      val("school","اسم المدرسة")
    );

    const values = {
      grade: "الصف: " + val("grade","-"),
      semester: "الفصل: " + val("semester","-"),
      date: "التاريخ: " + formatDate(val("examDate","")),
      duration: "الزمن: " + val("duration","-"),
      score: "الدرجة: " + val("totalScore","-"),
      school: val("school","اسم المدرسة")
    };

    Object.entries(values).forEach(([key,value])=>{
      setText(
        meta.querySelector(`[data-meta="${key}"]`),
        value
      );
    });
  }


  function parseQuestionTitle(text){

    const match = String(text || "").match(
      /^(تابع\s+)?السؤال\s+(\d+)\s*:\s*(.*)$/s
    );

    if(!match) return null;

    return {
      continued:Boolean(match[1]),
      number:Number(match[2]),
      title:match[3]
    };
  }


  function formatQuestionTitle(info, layout){

    const n = info.number;
    const title = info.title;
    const follow = info.continued;

    if(layout === "2"){
      return (
        (follow ? "تابع " : "") +
        "السؤال " +
        (ordinal[n] || n) +
        "  |  " +
        title
      );
    }

    if(layout === "3"){
      return (
        (follow ? "متابعة " : "") +
        String(n).padStart(2,"0") +
        "  /  " +
        title
      );
    }

    if(layout === "4"){
      return (
        (follow ? "تابع " : "") +
        (sections[n] || ("السؤال " + n)) +
        ": " +
        title
      );
    }

    if(layout === "5"){
      return (
        (follow ? "تابع " : "") +
        "السؤال رقم (" +
        n +
        ")  ◆  " +
        title
      );
    }

    return (
      (follow ? "تابع " : "") +
      "السؤال " +
      n +
      ": " +
      title
    );
  }


  function decorateQuestionTitle(node){

    if(!node) return;

    if(!node.dataset.examOriginalTitle){
      node.dataset.examOriginalTitle =
        node.textContent || "";
    }

    const original =
      node.dataset.examOriginalTitle;

    const info =
      parseQuestionTitle(original);

    if(!info) return;

    const wanted =
      formatQuestionTitle(
        info,
        getLayout()
      );

    setText(node, wanted);
  }


  function decorateAll(){

    document
      .querySelectorAll(".exam-header")
      .forEach(ensureHeaderExtras);

    document
      .querySelectorAll(
        ".paper-question-title > span:first-child," +
        ".print-question-title > span:first-child"
      )
      .forEach(decorateQuestionTitle);
  }


  const paperFrame =
    document.getElementById("paperFrame");

  if(!paperFrame) return;

  const field =
    paperFrame.closest(".field");

  if(!field) return;


  let picker =
    document.querySelector(".exam-layout-picker");

  if(picker){
    picker.remove();
  }

  picker = document.createElement("div");
  picker.className = "exam-layout-picker";

  picker.innerHTML = `
    <div class="exam-layout-picker-title">
      <strong>🎨 تصميم ورقة الاختبار</strong>
      <span>كل تصميم يغيّر شكل الورقة وصياغة عناوين الأسئلة</span>
    </div>

    <div class="exam-layout-grid">

      ${layouts.map(([id,name])=>`
        <button
          type="button"
          class="exam-layout-btn"
          data-layout="${id}"
        >
          <span class="exam-layout-mini">
            <i class="mini-head"></i>
            <i class="mini-line"></i>
            <i class="mini-line short"></i>
            <i class="mini-line"></i>
          </span>

          <span class="exam-layout-name">
            ${name}
          </span>
        </button>
      `).join("")}

    </div>
  `;

  field.parentNode.insertBefore(
    picker,
    field.nextSibling
  );


  function updateButtons(id){

    picker
      .querySelectorAll(".exam-layout-btn")
      .forEach(btn=>{
        btn.classList.toggle(
          "active",
          btn.dataset.layout === id
        );
      });
  }


  function applyLayout(id){

    id = String(id || "1");

    localStorage.setItem(KEY,id);

    document.documentElement
      .setAttribute(
        "data-exam-layout",
        id
      );

    updateButtons(id);

    decorateAll();
  }


  picker.addEventListener(
    "click",
    function(event){

      const button =
        event.target.closest(
          ".exam-layout-btn"
        );

      if(!button) return;

      applyLayout(
        button.dataset.layout
      );
    }
  );


  [
    "subject",
    "examType",
    "school",
    "grade",
    "semester",
    "examDate",
    "duration",
    "totalScore"
  ].forEach(id=>{

    document
      .getElementById(id)
      ?.addEventListener(
        "input",
        decorateAll
      );

    document
      .getElementById(id)
      ?.addEventListener(
        "change",
        decorateAll
      );
  });


  let queued = false;

  const observer =
    new MutationObserver(function(){

      if(queued) return;

      queued = true;

      queueMicrotask(function(){
        queued = false;
        decorateAll();
      });
    });

  observer.observe(
    document.body,
    {
      childList:true,
      subtree:true
    }
  );


  window.addEventListener(
    "beforeprint",
    function(){

      document.documentElement
        .setAttribute(
          "data-exam-layout",
          getLayout()
        );

      decorateAll();
    }
  );


  applyLayout(
    getLayout()
  );

})();