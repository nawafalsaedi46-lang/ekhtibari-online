(function(){
  "use strict";

  const KEY = "ekhtibari_full_exam_layout";

  function install(){

    /* إزالة واجهة التصاميم القديمة فقط */
    document
      .querySelectorAll(".exam-layout-picker, .exam-paper-themes")
      .forEach(function(el){
        el.remove();
      });

    if(document.getElementById("simpleExamLayoutSelector")){
      return;
    }

    const paperFrame = document.getElementById("paperFrame");
    if(!paperFrame) return;

    const field = paperFrame.closest(".field");
    if(!field) return;

    const style = document.createElement("style");
    style.id = "simpleExamLayoutStyle";

    style.textContent = `
      .simple-exam-layout{
        grid-column:1/-1;
        margin-top:12px;
        padding:14px;
        border:1px solid #dbe3ea;
        border-radius:14px;
        background:#f8fafc;
      }

      .simple-exam-layout label{
        display:block;
        margin-bottom:7px;
        font-size:13px;
        font-weight:900;
        color:#0f172a;
      }

      .simple-exam-layout select{
        width:100%;
        height:44px;
        padding:0 12px;
        border:1px solid #cbd5e1;
        border-radius:10px;
        background:#fff;
        color:#0f172a;
        font-family:inherit;
        font-size:13px;
        font-weight:800;
        cursor:pointer;
      }

      .simple-exam-layout small{
        display:block;
        margin-top:7px;
        color:#64748b;
        font-size:10px;
      }

      @media print{
        .simple-exam-layout{
          display:none !important;
        }
      }
    `;

    document.head.appendChild(style);

    const box = document.createElement("div");
    box.id = "simpleExamLayoutSelector";
    box.className = "simple-exam-layout";

    box.innerHTML = `
      <label>🎨 تغيير شكل ورقة الاختبار</label>

      <select id="examLayoutChoice">
        <option value="1">التصميم الأصلي</option>
        <option value="3">حديث احترافي</option>
        <option value="5">فاخر</option>
      </select>

      <small>
        يتغير شكل الورقة فقط، ولا تتغير الأسئلة أو الدرجات.
      </small>
    `;

    field.parentNode.insertBefore(
      box,
      field.nextSibling
    );

    const select =
      document.getElementById("examLayoutChoice");

    let current =
      localStorage.getItem(KEY) || "1";

    /* التصميمات القديمة 2 و4 ترجع للأصلي */
    if(!["1","3","5"].includes(current)){
      current = "1";
      localStorage.setItem(KEY,current);
    }

    select.value = current;

    document.documentElement.setAttribute(
      "data-exam-layout",
      current
    );

    function apply(value){

      if(!["1","3","5"].includes(value)){
        value = "1";
      }

      localStorage.setItem(KEY,value);

      document.documentElement.setAttribute(
        "data-exam-layout",
        value
      );

      /*
        نحرك تحديث المعاينة الحالي بدون لمس app.js.
        exam-layouts.js يقرأ نفس القيمة.
      */
      const examType =
        document.getElementById("examType");

      if(examType){
        examType.dispatchEvent(
          new Event("input",{bubbles:true})
        );

        examType.dispatchEvent(
          new Event("change",{bubbles:true})
        );
      }
    }

    select.addEventListener(
      "change",
      function(){
        apply(this.value);
      }
    );

    apply(current);
  }

  install();

})();