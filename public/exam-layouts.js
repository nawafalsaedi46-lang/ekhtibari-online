(function(){
  "use strict";

  const KEY = "ekhtibari_full_exam_layout";

  const layouts = [
    ["1","التصميم الأصلي"],
    ["2","وزاري رسمي"],
    ["3","حديث منظم"],
    ["4","أكاديمي"],
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

  const typeNames = {
    mcq:"اختيار من متعدد",
    tf:"صح أو خطأ",
    fill:"أكمل الفراغ",
    match:"وصل",
    essay:"سؤال مقالي",
    order:"رتّب",
    image:"سؤال بصورة أو رسم",
    math:"مسائل رياضيات",
    reading:"قطعة قراءة",
    mention:"اذكري",
    table:"جدول"
  };

  function esc(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function getType(q){
    try{
      if(typeof qTypeName === "function"){
        return qTypeName(q.type);
      }
    }catch(e){}

    return typeNames[q?.type] || "سؤال";
  }

  function getLayout(){
    return localStorage.getItem(KEY) || "1";
  }

  window.formatExamQuestionTitle = function(q, qi, continued){

    const layout = getLayout();
    const num = Number(qi) + 1;
    const title = String(q?.title || "");
    const type = getType(q);
    const follow = continued ? "تابع " : "";

    let text = "";

    if(layout === "2"){
      text =
        follow +
        "السؤال " +
        (ordinal[num] || num) +
        " — " +
        type +
        ": " +
        title;
    }
    else if(layout === "3"){
      text =
        follow +
        String(num).padStart(2,"0") +
        " | " +
        type +
        " — " +
        title;
    }
    else if(layout === "4"){
      text =
        follow +
        (ordinal[num] || ("السؤال " + num)) +
        ": " +
        title +
        " (" + type + ")";
    }
    else if(layout === "5"){
      text =
        follow +
        "السؤال رقم (" +
        num +
        ") — " +
        type +
        ": " +
        title;
    }
    else{
      text =
        follow +
        "السؤال " +
        num +
        ": " +
        title;
    }

    return esc(text);
  };


  const paperFrame =
    document.getElementById("paperFrame");

  if(!paperFrame) return;

  const field = paperFrame.closest(".field");
  if(!field) return;


  const picker = document.createElement("div");
  picker.className = "exam-layout-picker";

  picker.innerHTML = `
    <div class="exam-layout-picker-title">
      <strong>🎨 تصميم ورقة الاختبار</strong>
      <span>اختر الشكل الذي سيظهر للطالب وفي الطباعة</span>
    </div>

    <div class="exam-layout-grid">
      ${layouts.map(([id,name])=>`
        <button
          type="button"
          class="exam-layout-btn"
          data-layout="${id}"
        >
          <span class="exam-layout-mini">
            <i></i><i></i><i></i><i></i>
          </span>
          <span class="exam-layout-name">${name}</span>
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

    try{
      if(typeof renderPreview === "function"){
        renderPreview();
      }
    }catch(e){}
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


  document.documentElement
    .setAttribute(
      "data-exam-layout",
      getLayout()
    );

  updateButtons(getLayout());


  window.addEventListener(
    "beforeprint",
    function(){
      document.documentElement
        .setAttribute(
          "data-exam-layout",
          getLayout()
        );
    }
  );

})();
