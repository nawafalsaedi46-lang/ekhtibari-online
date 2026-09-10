let questions = [];
let editingQuestionIndex = -1;
let editingItemIndex = -1;
let currentVersion = "student";
let AUTO_SAVE_KEY = null;

const $ = id => document.getElementById(id);
const questionType = $("questionType");
const itemCount = $("itemCount");
const typeCards = document.querySelectorAll(".type-card");
const questionTitle = $("questionTitle");
const specialQuestionFields = $("specialQuestionFields");
const questionEditor = $("questionEditor");
const addItemBtn = $("addItemBtn");
const saveQuestionBtn = $("saveQuestionBtn");
const cancelEditBtn = $("cancelEditBtn");
const questionsList = $("questionsList");
const questionCount = $("questionCount");
const calculatedScore = $("calculatedScore");
const paperQuestions = $("paperQuestions");
const versionBadge = $("versionBadge");
const customLogo = $("customLogo");
const studentInfoRow = $("studentInfoRow");
const teacherLabel = $("teacherLabel");
const examPaper = $("examPaper");
const previewHeader = $("previewHeader");
const printRoot = $("printRoot");

let schoolLogoData = "";

const formIds = [
  "examDate","region","school","teacherGender","teacher","subject","grade",
  "semester","examType","duration","totalScore","questionFontSize","paperFrame","endMessage"
];

function escapeHTML(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function getValue(id){
  const el = $(id);
  return el ? String(el.value || "").trim() : "";
}

function getFillQuestionBank(q){
  if(!q) return "";

  if(String(q.wordBank || "").trim()){
    return String(q.wordBank).trim();
  }

  const oldItem =
    Array.isArray(q.items)
      ? q.items.find(item=>String(item?.wordBank || "").trim())
      : null;

  return String(oldItem?.wordBank || "").trim();
}

function formatDate(value){
  if(!value) return "-";
  const p = value.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value;
}

function qTypeName(type){
  return ({
    mcq:"اختيار من متعدد", truefalse:"صح أو خطأ", fill:"أكمل الفراغ",
    essay:"مقالي", mention:"اذكري", order:"ترتيب", table:"جدول", image:"صورة / رسم",
    math:"رياضيات", reading:"قطعة قراءة"
  })[type] || type;
}


function optionLetter(index){
  const letters = ["أ","ب","ج","د","هـ","و","ز","ح","ط","ي"];
  return letters[index] || String(index + 1);
}

function refreshMcqAnswerSelect(block){
  const options = [...block.querySelectorAll(".item-option")];
  const answerSelect = block.querySelector(".item-answer");
  if(!answerSelect) return;

  const current = Number(answerSelect.value || 0);
  answerSelect.innerHTML = options.map((_,i)=>
    `<option value="${i}">${optionLetter(i)}</option>`
  ).join("");

  const safe = Math.min(current, Math.max(0, options.length - 1));
  answerSelect.value = String(safe);
}

function renumberMcqOptions(block){
  const rows = [...block.querySelectorAll(".mcq-option-row")];
  rows.forEach((row,i)=>{
    const label = row.querySelector(".mcq-option-label");
    if(label) label.textContent = `الخيار ${optionLetter(i)}`;
  });
  refreshMcqAnswerSelect(block);
}

function defaultTitle(type){
  return ({
    mcq:"اختر الإجابة الصحيحة فيما يلي:",
    truefalse:"حدد هل العبارة صحيحة أم خاطئة:",
    fill:"أكمل الفراغ فيما يلي:",
    essay:"أجب عن الأسئلة التالية:",
    mention:"اذكري ما يلي:",
    order:"رتب العناصر التالية بالترتيب الصحيح:",
    table:"أكمل الجدول التالي:",
    image:"تأمل الصورة أو الرسم ثم أجب:",
    math:"حل المسائل التالية:",
    reading:"اقرأ القطعة التالية ثم أجب عن الأسئلة:"
  })[type] || "أجب عن السؤال التالي:";
}

function activateType(type){
  questionType.value = type;
  typeCards.forEach(c => c.classList.toggle("active", c.dataset.type === type));
}

function calculateTotalScore(){
  return questions.reduce((s,q)=>s+Number(q.score||0),0);
}

function headerHTML(includeStudent=true, compact=false){
  const gender = getValue("teacherGender") || "معلم";
  const logoHTML = `
    <div class="ministry-logo">
      <img src="moe-logo.svg" alt="شعار وزارة التعليم"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="moe-fallback" style="display:none">وزارة التعليم</div>
    </div>`;

  const schoolLogo = schoolLogoData ? `
    <div class="school-logo-area"><img src="${schoolLogoData}" alt="شعار المدرسة"></div>` : "";

  return `
    <div class="${compact ? "print-header-wrap" : ""}">
      <div class="version-badge">${currentVersion === "answer" ? "نموذج الإجابة" : "نسخة الطالب"}</div>
      <div class="exam-header">
        <div class="ministry-info">
          <strong>المملكة العربية السعودية</strong>
          <span>وزارة التعليم</span>
          <span>${escapeHTML(getValue("region") || "المنطقة التعليمية")}</span>
          <span>${escapeHTML(getValue("school") || "اسم المدرسة")}</span>
        </div>
        ${logoHTML}
        <div class="exam-info">
          <table>
            <tr><th>المادة</th><td>${escapeHTML(getValue("subject") || "-")}</td></tr>
            <tr><th>الصف</th><td>${escapeHTML(getValue("grade") || "-")}</td></tr>
            <tr><th>الفصل</th><td>${escapeHTML(getValue("semester") || "-")}</td></tr>
            <tr><th>التاريخ</th><td>${escapeHTML(formatDate(getValue("examDate")))}</td></tr>
            <tr><th>الزمن</th><td>${escapeHTML(getValue("duration") || "-")}</td></tr>
            <tr><th>الدرجة</th><td>${escapeHTML(getValue("totalScore") || String(calculateTotalScore()))}</td></tr>
          </table>
        </div>
      </div>
      ${schoolLogo}
      <div class="exam-title">
        ${escapeHTML(getValue("examType") || "اختبار")} - ${escapeHTML(getValue("subject") || "المادة")}
      </div>
      ${includeStudent && currentVersion === "student" ? `
        <div class="student-info">
          <div>اسم الطالب: ............................................................</div>
          <div>الصف: ....................................</div>
        </div>` : ""}
    </div>`;
}

function renderSpecialFields(data={}){
  specialQuestionFields.innerHTML = "";
  if(questionType.value === "reading"){
    const box = document.createElement("div");
    box.className = "special-box";
    box.innerHTML = `
      <div class="special-box-title">قطعة القراءة</div>
      <div class="field"><textarea id="readingPassage" rows="7" placeholder="اكتب قطعة القراءة هنا...">${escapeHTML(data.passage||"")}</textarea></div>`;
    specialQuestionFields.appendChild(box);
  }
  if(questionType.value === "fill"){

    const fillBank = document.createElement("div");
    fillBank.className = "special-box fill-question-bank-editor";

    fillBank.innerHTML = `
      <div class="special-box-title">
        الكلمات المقترحة للسؤال
        <small>(اختياري)</small>
      </div>

      <div class="field">
        <input
          type="text"
          id="fillWordBank"
          value="${escapeHTML(getFillQuestionBank(data))}"
          placeholder="مثال: الصلاة - الزكاة - الصيام - الحج"
        >

        <small>
          تظهر مرة واحدة فوق جميع فقرات أكمل الفراغ.
        </small>
      </div>
    `;

    specialQuestionFields.appendChild(fillBank);
  }

  const score = document.createElement("div");
  score.className = "special-box";
  score.innerHTML = `
    <div class="special-box-title">درجة السؤال كاملًا</div>
    <div class="field"><input type="number" id="questionScore" min="0" step="0.5" value="${Number(data.score ?? 1)}"></div>`;
  specialQuestionFields.appendChild(score);
}

function emptyItem(type){
  if(type==="mcq") return {text:"",options:["","","",""],answer:"0"};
  if(type==="truefalse") return {text:"",answer:"true"};
  if(type==="mention") return {text:"",mentionCount:3,answer:""};
  if(type==="order") return {text:"",orderItems:["","","",""]};
  if(type==="table") return {text:"",rows:[{label:"",answer:""},{label:"",answer:""},{label:"",answer:""}]};
  if(type==="image") return {text:"",image:"",answer:""};
  return {text:"",answer:""};
}

function addEditorItem(itemData=null){
  const type = questionType.value;
  const item = itemData || emptyItem(type);
  const index = questionEditor.querySelectorAll(".question-item-editor").length;
  const wrap = document.createElement("div");
  wrap.className = "question-item-editor";

  let extra = "";
  if(type==="mcq"){
    const opts = Array.isArray(item.options) && item.options.length >= 2
      ? item.options
      : ["","","",""];

    extra = `
      <div class="mcq-options-editor">
        <div class="mcq-options-toolbar">
          <strong>الخيارات</strong>
          <button type="button" class="mini-btn edit add-mcq-option">+ إضافة خيار</button>
        </div>

        <div class="options-grid mcq-options-list">
          ${opts.map((value,i)=>`
            <div class="field mcq-option-row">
              <div class="mcq-option-head">
                <label class="mcq-option-label">الخيار ${optionLetter(i)}</label>
                <button type="button" class="mini-btn delete remove-mcq-option">حذف</button>
              </div>
              <input type="text" class="item-option" value="${escapeHTML(value||"")}" placeholder="اكتب الخيار">
            </div>`).join("")}
        </div>
      </div>

      <div class="field">
        <label>الإجابة الصحيحة</label>
        <select class="item-answer">
          ${opts.map((_,i)=>`<option value="${i}" ${String(item.answer)===String(i)?"selected":""}>${optionLetter(i)}</option>`).join("")}
        </select>
      </div>`;
  } else if(type==="truefalse"){
    extra = `
      <div class="field"><label>الإجابة الصحيحة</label>
        <select class="item-answer">
          <option value="true" ${String(item.answer)==="true"?"selected":""}>صح</option>
          <option value="false" ${String(item.answer)==="false"?"selected":""}>خطأ</option>
        </select>
      </div>`;
  } else if(type==="fill"){
    extra = `
      <div class="field">
        <label>الإجابة الصحيحة</label>
        <input
          type="text"
          class="item-answer"
          value="${escapeHTML(item.answer||"")}"
          placeholder="اكتب الإجابة الصحيحة"
        >
      </div>
    `;

  } else if(type==="mention"){

    const count = Math.max(
      1,
      Math.floor(Number(item.mentionCount || 3))
    );

    extra = `
      <div class="mention-editor">
        <div class="field">
          <label>عدد الإجابات المطلوبة لهذه الفقرة</label>
          <input
            type="number"
            class="mention-count"
            min="1"
            step="1"
            value="${count}"
            placeholder="مثال: 5"
          >
          <small>مثال: إذا كانت الصيغة "اذكري ثلاثة" اختر 3.</small>
        </div>

        <div class="field">
          <label>نموذج الإجابة</label>
          <textarea
            class="item-answer mention-model-answer"
            rows="5"
            placeholder="اكتب كل إجابة في سطر مستقل"
          >${escapeHTML(item.answer||"")}</textarea>
        </div>
      </div>
    `;

  } else if(type==="order"){

    const pairs =
      item.orderPairs?.length
        ? item.orderPairs
        : [
            {left:"",right:""},
            {left:"",right:""},
            {left:"",right:""},
            {left:"",right:""}
          ];

    extra = `
      <div class="order-columns-editor">

        <div class="order-columns-head">
          <strong>العمود (أ)</strong>
          <strong>العمود (ب)</strong>
          <span></span>
        </div>

        <div class="order-pairs-list">

          ${pairs.map((pair,i)=>`
            <div class="order-pair-row">

              <input
                type="text"
                class="order-left"
                value="${escapeHTML(pair.left||"")}"
                placeholder="عبارة العمود (أ)"
              >

              <input
                type="text"
                class="order-right"
                value="${escapeHTML(pair.right||"")}"
                placeholder="ما يناسبها في العمود (ب)"
              >

              <button
                type="button"
                class="mini-btn delete remove-order-pair"
              >
                حذف
              </button>

            </div>
          `).join("")}

        </div>

        <button
          type="button"
          class="mini-btn edit add-order-pair"
        >
          + إضافة صف
        </button>

      </div>`;
  } else if(type==="table"){
    const rows = item.rows?.length ? item.rows : [{label:"",answer:""},{label:"",answer:""},{label:"",answer:""}];
    const answerBank = item.answerBank || "";

    const bankAnswers = [
      ...answerBank.matchAll(/\(?\s*([^-]+?)\s*\)?(?=\s*(?:-|$))/g)
    ]
      .map(match=>match[1].trim())
      .filter(Boolean);

    extra = `
      <div class="field">
        <label>الإجابات المتاحة فوق الجدول</label>
        <input
          type="text"
          class="table-answer-bank"
          value="${escapeHTML(answerBank)}"
          placeholder="مثال: (الصلاة) - الزكاة - (الصيام)"
        >
      </div>

      <div class="table-editor-grid"><strong>البيان</strong><strong>الإجابة</strong>
        ${rows.map(r=>`
          <input type="text" class="table-label" value="${escapeHTML(r.label||"")}">

          <select class="table-answer" multiple size="4">
            <option value="">اختر الإجابة</option>

            ${(()=>{
              const savedAnswers = String(r.answer||"")
                .split(/\s*\+\s*/)
                .map(v=>v.trim())
                .filter(Boolean);

              return [
                ...new Set([
                  ...bankAnswers,
                  ...savedAnswers
                ])
              ].map(answer=>`
                <option
                  value="${escapeHTML(answer)}"
                  ${savedAnswers.includes(answer) ? "selected" : ""}
                >
                  ${escapeHTML(answer)}
                </option>
              `).join("");
            })()}

          </select>`).join("")}
      </div>

      <div class="table-row-actions">

        <button
          type="button"
          class="mini-btn edit add-table-row"
        >
          + إضافة صف
        </button>

        <button
          type="button"
          class="mini-btn delete remove-table-row"
        >
          حذف آخر صف
        </button>

      </div>`;
  } else if(type==="image"){
    extra = `
      <div class="field"><label>الصورة أو الرسم</label>
        <input type="file" class="item-image-input" accept="image/*">
        <img class="image-preview-editor" src="${item.image||""}" ${item.image?"":'style="display:none"'} alt="">
      </div>
      <div class="field"><label>الإجابة النموذجية</label><textarea class="item-answer" rows="2">${escapeHTML(item.answer||"")}</textarea></div>`;
  } else {
    extra = `<div class="field"><label>الإجابة النموذجية</label><textarea class="item-answer" rows="2">${escapeHTML(item.answer||"")}</textarea></div>`;
  }

  wrap.innerHTML = `
    <div class="item-editor-header">
      <div class="item-number">${index+1}</div>
      <button type="button" class="mini-btn delete remove-editor-item">حذف</button>
    </div>
    <div class="item-fields">
      <div class="field"><textarea class="item-text" rows="2" placeholder="اكتب الفقرة ${index+1}">${escapeHTML(item.text||"")}</textarea></div>
      ${extra}
    </div>`;

  wrap.querySelector(".remove-editor-item").addEventListener("click",()=>{
    const blocks = questionEditor.querySelectorAll(".question-item-editor");
    if(blocks.length<=1){ alert("يجب أن تبقى فقرة واحدة على الأقل."); return; }
    wrap.remove(); renumberEditor(); itemCount.value = questionEditor.querySelectorAll(".question-item-editor").length;
  });


  const addOptionBtn = wrap.querySelector(".add-mcq-option");
  if(addOptionBtn){
    addOptionBtn.addEventListener("click",()=>{
      const list = wrap.querySelector(".mcq-options-list");
      const count = list.querySelectorAll(".mcq-option-row").length;

      const row = document.createElement("div");
      row.className = "field mcq-option-row";
      row.innerHTML = `
        <div class="mcq-option-head">
          <label class="mcq-option-label">الخيار ${optionLetter(count)}</label>
          <button type="button" class="mini-btn delete remove-mcq-option">حذف</button>
        </div>
        <input type="text" class="item-option" placeholder="اكتب الخيار">
      `;
      list.appendChild(row);

      row.querySelector(".remove-mcq-option").addEventListener("click",()=>{
        const rows = list.querySelectorAll(".mcq-option-row");
        if(rows.length <= 2){
          alert("يجب أن يحتوي الاختيار من متعدد على خيارين على الأقل.");
          return;
        }
        row.remove();
        renumberMcqOptions(wrap);
      });

      renumberMcqOptions(wrap);
    });

    wrap.querySelectorAll(".remove-mcq-option").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const list = wrap.querySelector(".mcq-options-list");
        const rows = list.querySelectorAll(".mcq-option-row");
        if(rows.length <= 2){
          alert("يجب أن يحتوي الاختيار من متعدد على خيارين على الأقل.");
          return;
        }
        btn.closest(".mcq-option-row")?.remove();
        renumberMcqOptions(wrap);
      });
    });
  }

  if(type==="table"){

    const bankInput =
      wrap.querySelector(".table-answer-bank");

    if(bankInput){

      bankInput.addEventListener("input",()=>{

        const answers = [
          ...bankInput.value.matchAll(/\(?\s*([^-]+?)\s*\)?(?=\s*(?:-|$))/g)
        ]
          .map(match=>match[1].trim())
          .filter(Boolean);

        wrap
          .querySelectorAll(".table-answer")
          .forEach(select=>{

            const current =
              select.value;

            const options = [
              ...new Set([
                ...answers,
                current
              ].filter(Boolean))
            ];

            select.innerHTML =
              '<option value="">اختر الإجابة</option>' +
              options.map(answer=>
                '<option value="' +
                escapeHTML(answer) +
                '">' +
                escapeHTML(answer) +
                '</option>'
              ).join("");

            select.value = current;

          });

      });

    }

  }


  if(type==="order"){

    const list =
      wrap.querySelector(
        ".order-pairs-list"
      );

    function bindOrderPairDelete(){

      wrap
        .querySelectorAll(
          ".remove-order-pair"
        )
        .forEach(button=>{

          if(button.dataset.bound==="1"){
            return;
          }

          button.dataset.bound="1";

          button.addEventListener(
            "click",
            ()=>{

              const rows =
                list.querySelectorAll(
                  ".order-pair-row"
                );

              if(rows.length <= 2){

                alert(
                  "يجب أن يبقى صفان على الأقل."
                );

                return;
              }

              button
                .closest(
                  ".order-pair-row"
                )
                ?.remove();

            }
          );

        });

    }

    bindOrderPairDelete();


    const addButton =
      wrap.querySelector(
        ".add-order-pair"
      );

    if(addButton){

      addButton.addEventListener(
        "click",
        ()=>{

          const row =
            document.createElement(
              "div"
            );

          row.className =
            "order-pair-row";

          row.innerHTML = `
            <input
              type="text"
              class="order-left"
              placeholder="عبارة العمود (أ)"
            >

            <input
              type="text"
              class="order-right"
              placeholder="ما يناسبها في العمود (ب)"
            >

            <button
              type="button"
              class="mini-btn delete remove-order-pair"
            >
              حذف
            </button>
          `;

          list.appendChild(row);

          bindOrderPairDelete();

        }
      );

    }

  }


  if(type==="table"){

    const tableGrid =
      wrap.querySelector(
        ".table-editor-grid"
      );

    const addTableRowButton =
      wrap.querySelector(
        ".add-table-row"
      );

    const removeTableRowButton =
      wrap.querySelector(
        ".remove-table-row"
      );


    if(addTableRowButton){

      addTableRowButton.addEventListener(
        "click",
        ()=>{

          const bankInput =
            wrap.querySelector(
              ".table-answer-bank"
            );

          const bankAnswers = [
            ...(bankInput?.value || "")
              .matchAll(/\(?\s*([^-]+?)\s*\)?(?=\s*(?:-|$))/g)
          ]
            .map(match=>match[1].trim())
            .filter(Boolean);


          const label =
            document.createElement(
              "input"
            );

          label.type = "text";
          label.className =
            "table-label";

          label.placeholder =
            "اكتب البيان";


          const select =
            document.createElement(
              "select"
            );

          select.className =
            "table-answer";
          select.multiple = true;
          select.size = 4;


          const emptyOption =
            document.createElement(
              "option"
            );

          emptyOption.value = "";
          emptyOption.textContent =
            "اختر الإجابة";

          select.appendChild(
            emptyOption
          );


          [
            ...new Set(bankAnswers)
          ].forEach(answer=>{

            const option =
              document.createElement(
                "option"
              );

            option.value =
              answer;

            option.textContent =
              answer;

            select.appendChild(
              option
            );

          });


          tableGrid.append(
            label,
            select
          );

        }
      );

    }


    if(removeTableRowButton){

      removeTableRowButton.addEventListener(
        "click",
        ()=>{

          const labels =
            tableGrid.querySelectorAll(
              ".table-label"
            );

          const answers =
            tableGrid.querySelectorAll(
              ".table-answer"
            );

          if(labels.length <= 1){

            alert(
              "يجب أن يبقى صف واحد على الأقل."
            );

            return;
          }

          labels[
            labels.length - 1
          ].remove();

          answers[
            answers.length - 1
          ]?.remove();

        }
      );

    }

  }


  /* TABLE_MULTI_NORMAL_CLICK */
  if(type==="table"){

    wrap.addEventListener(
      "mousedown",
      event=>{

        const option =
          event.target.closest?.("option");

        if(!option) return;

        const select =
          option.closest(
            "select.table-answer[multiple]"
          );

        if(!select) return;

        event.preventDefault();

        option.selected =
          !option.selected;

        select.dispatchEvent(
          new Event(
            "change",
            {bubbles:true}
          )
        );

      }
    );

  }


  const imageInput = wrap.querySelector(".item-image-input");
  if(imageInput){
    imageInput.addEventListener("change", e=>{
      const file = e.target.files?.[0];
      if(!file) return;
      resizeImage(file,700,data=>{
        const p = wrap.querySelector(".image-preview-editor");
        p.src=data; p.style.display="block";
      });
    });
  }

  questionEditor.appendChild(wrap);
  renumberEditor();
}

function renumberEditor(){
  questionEditor.querySelectorAll(".question-item-editor").forEach((b,i)=>{
    const n=b.querySelector(".item-number");
    if(!n) return;

    n.textContent =
      questionType.value==="mention"
        ? `( ${optionLetter(i)} )`
        : i+1;
  });
}

function setEditorItemCount(count){
  count = Math.max(1, Math.floor(Number(count)||1));
  let current = questionEditor.querySelectorAll(".question-item-editor").length;
  while(current < count){ addEditorItem(); current++; }
  while(current > count){
    questionEditor.querySelectorAll(".question-item-editor")[current-1]?.remove();
    current--;
  }
  renumberEditor();
  itemCount.value = count;
}

function readEditorItems(){
  const type = questionType.value;
  return [...questionEditor.querySelectorAll(".question-item-editor")].map(block=>{
    const text = block.querySelector(".item-text")?.value.trim() || "";
    if(type==="mcq"){
      return {
        text,
        options:[...block.querySelectorAll(".item-option")].map(e=>e.value.trim()),
        answer:block.querySelector(".item-answer")?.value || "0"
      };
    }
    if(type==="mention"){
      return {
        text,
        mentionCount:Math.max(
          1,
          Math.floor(
            Number(block.querySelector(".mention-count")?.value || 1)
          )
        ),
        answer:block.querySelector(".item-answer")?.value.trim() || ""
      };
    }

    if(type==="order"){

      const lefts=[
        ...block.querySelectorAll(".order-left")
      ];

      const rights=[
        ...block.querySelectorAll(".order-right")
      ];

      const orderPairs =
        lefts.map((left,i)=>({
          left:left.value.trim(),
          right:rights[i]?.value.trim()||""
        }))
        .filter(pair=>pair.left||pair.right);

      return {
        text,
        orderPairs
      };
    }
    if(type==="table"){
      const labels=[...block.querySelectorAll(".table-label")], answers=[...block.querySelectorAll(".table-answer")];

      return {
        text,
        answerBank:block.querySelector(".table-answer-bank")?.value.trim()||"",
        rows:labels.map((e,i)=>({
          label:e.value.trim(),
          answer:[...(answers[i]?.selectedOptions||[])]
          .map(option=>option.value.trim())
          .filter(Boolean)
          .join(" + ")
        })).filter(r=>r.label||r.answer)
      };
    }
    if(type==="image"){
      const p=block.querySelector(".image-preview-editor");
      return {text,image:p&&p.style.display!=="none"?p.src:"",answer:block.querySelector(".item-answer")?.value.trim()||""};
    }
    return {text,answer:block.querySelector(".item-answer")?.value.trim()||""};
  });
}

function validate(items){
  if(!items.length){alert("أضف فقرة واحدة على الأقل.");return false}
  for(let i=0;i<items.length;i++){
    if(!items[i].text){alert(`اكتب الفقرة رقم ${i+1}.`);return false}
    if(questionType.value==="mcq"){
      if(!Array.isArray(items[i].options) || items[i].options.length < 2){
        alert(`يجب أن تحتوي الفقرة رقم ${i+1} على خيارين على الأقل.`);
        return false;
      }
      if(items[i].options.some(x=>!x)){
        alert(`أكمل خيارات الفقرة رقم ${i+1}.`);
        return false;
      }
      if(Number(items[i].answer) >= items[i].options.length){
        items[i].answer = "0";
      }
    }
  }
  if(questionType.value==="reading" && !$("readingPassage")?.value.trim()){alert("اكتب قطعة القراءة.");return false}
  return true;
}

function saveQuestion(){
  const items=readEditorItems();
  if(!validate(items)) return;

  const q={
    type:questionType.value,
    title:questionTitle.value.trim()||defaultTitle(questionType.value),
    score:Number($("questionScore")?.value||0),
    passage:questionType.value==="reading" ? ($("readingPassage")?.value.trim()||"") : "",
    wordBank:questionType.value==="fill"
      ? ($("fillWordBank")?.value.trim() || "")
      : "",
    items
  };

  if(editingQuestionIndex>=0 && editingItemIndex>=0){
    questions[editingQuestionIndex].items[editingItemIndex]=items[0];
  }else if(editingQuestionIndex>=0){
    questions[editingQuestionIndex]=q;
  }else{
    questions.push(q);
  }
  resetEditor();
  refreshAll();
}

function resetEditor(){
  editingQuestionIndex=-1; editingItemIndex=-1;
  activateType("mcq");
  questionTitle.value=defaultTitle("mcq");
  itemCount.value=1;
  renderSpecialFields();
  questionEditor.innerHTML="";
  addEditorItem();
  saveQuestionBtn.textContent="💾 حفظ السؤال";
  cancelEditBtn.style.display="none";
}

function editQuestion(i){
  const q=questions[i]; if(!q)return;
  editingQuestionIndex=i; editingItemIndex=-1;
  activateType(q.type); questionTitle.value=q.title||""; renderSpecialFields(q);
  questionEditor.innerHTML=""; q.items.forEach(addEditorItem); itemCount.value=q.items.length;
  saveQuestionBtn.textContent="💾 حفظ تعديل السؤال"; cancelEditBtn.style.display="inline-block";
  $("questionCard").scrollIntoView({behavior:"smooth",block:"start"});
}

function editSingleItem(qi,ii){
  const q=questions[qi]; if(!q?.items[ii])return;
  editingQuestionIndex=qi; editingItemIndex=ii;
  activateType(q.type); questionTitle.value=q.title||""; renderSpecialFields(q);
  questionEditor.innerHTML=""; addEditorItem(q.items[ii]); itemCount.value=1;
  saveQuestionBtn.textContent=`💾 حفظ تعديل الفقرة ${ii+1}`; cancelEditBtn.style.display="inline-block";
  $("questionCard").scrollIntoView({behavior:"smooth",block:"start"});
}

function deleteQuestion(i){
  if(!confirm("حذف السؤال كاملًا؟"))return;
  questions.splice(i,1); resetEditor(); refreshAll();
}

function deleteSingleItem(qi,ii){
  const q=questions[qi]; if(!q)return;
  if(!confirm("حذف هذه الفقرة؟"))return;
  q.items.splice(ii,1); if(!q.items.length) questions.splice(qi,1);
  resetEditor(); refreshAll();
}

function renderQuestionsList(){
  questionCount.textContent=questions.length;
  calculatedScore.textContent=calculateTotalScore();
  if(!questions.length){
    questionsList.innerHTML='<div class="empty-questions">لم تتم إضافة أسئلة حتى الآن.</div>';
    return;
  }
  questionsList.innerHTML=questions.map((q,qi)=>`
    <div class="saved-question">
      <div class="saved-question-header">
        <div>
          <div class="saved-question-title">السؤال ${qi+1} - ${escapeHTML(qTypeName(q.type))}</div>
          <div style="margin-top:5px">${escapeHTML(q.title||"")}</div>
          <div style="margin-top:5px;font-weight:700">درجة السؤال: ${Number(q.score||0)}</div>
        </div>
        <div class="saved-question-actions">
          <button class="mini-btn edit" onclick="editQuestion(${qi})">✏️ تعديل السؤال</button>
          <button class="mini-btn delete" onclick="deleteQuestion(${qi})">حذف السؤال</button>
        </div>
      </div>
      ${q.items.map((it,ii)=>`
        <div class="saved-item"><div class="saved-item-top">
          <div><strong>${q.type==="mention" ? `( ${optionLetter(ii)} )` : `${ii+1}.`}</strong> ${escapeHTML(it.text)}</div>
          <div class="saved-item-actions">
            <button class="mini-btn edit" onclick="editSingleItem(${qi},${ii})">تعديل</button>
            <button class="mini-btn delete" onclick="deleteSingleItem(${qi},${ii})">حذف</button>
          </div>
        </div></div>`).join("")}
    </div>`).join("");
}

function renderItemHTML(q,item,itemIndex,forPrint=false){
  const wrapClass = forPrint ? "print-question-item" : "paper-question-item";

  const itemLabel =
    q.type==="mention"
      ? `( ${optionLetter(itemIndex)} )`
      : `${itemIndex+1}.`;

  let html=`<div class="${wrapClass}"><div class="paper-item-question"><strong>${itemLabel}</strong> ${escapeHTML(item.text)}</div>`;

  if(q.type==="mcq"){
    html+=`<div class="paper-options options-count-${Math.min(item.options.length,6)}">${item.options.map((op,i)=>{
      const correct=currentVersion==="answer" && Number(item.answer)===i;
      return `<div class="${correct?"correct-choice":""}"><span class="option-letter">${optionLetter(i)})</span><span>${escapeHTML(op)}</span>${correct?'<span class="correct-mark">✓</span>':""}</div>`;
    }).join("")}</div>`;
  } else if(q.type==="truefalse"){
    const t=currentVersion==="answer"&&String(item.answer)==="true";
    const f=currentVersion==="answer"&&String(item.answer)==="false";
    html+=`<div class="truefalse-options"><span class="${t?"correct-choice":""}">صح ${t?"✓":""}</span><span class="${f?"correct-choice":""}">خطأ ${f?"✓":""}</span></div>`;
  } else if(q.type==="fill"){
    html+= currentVersion==="answer" && item.answer
      ? `<span class="inline-correct-answer">${escapeHTML(item.answer)}</span>`
      : `<span>....................................................</span>`;
  } else if(["essay","math","reading"].includes(q.type)){
    html+= currentVersion==="answer" && item.answer
      ? `<div class="inline-model-answer">${escapeHTML(item.answer).replaceAll("\n","<br>")}</div>`
      : `<div class="student-answer-lines">........................................................................<br>........................................................................</div>`;
  } else if(q.type==="mention"){

    const mentionCount = Math.max(
      1,
      Number(item.mentionCount || 1)
    );

    const answers = String(item.answer || "")
      .split(/\r?\n/)
      .map(v=>v.trim())
      .filter(Boolean);

    html += `
      <div class="mention-paper">
        ${Array.from({length:mentionCount},(_,i)=>`
          <div class="mention-paper-row">
            <span class="mention-number">${i+1}-</span>
            <span class="${currentVersion==="answer" ? "mention-answer-text inline-correct-answer" : "mention-answer-line"}">
              ${currentVersion==="answer" ? escapeHTML(answers[i] || "") : ""}
            </span>
          </div>
        `).join("")}
      </div>
    `;

  } else if(q.type==="order"){

    const pairs =
      Array.isArray(item.orderPairs)
        ? item.orderPairs
        : [];

    const mixedRight =
      pairs
        .map((pair,index)=>({
          text:pair.right,
          correctNumber:index+1
        }))
        .reverse();

    html += `
      <table class="exam-table order-columns-paper">

        <thead>
          <tr>
            <th>العمود (أ)</th>
            <th class="order-number-col">الرقم</th>
            <th>العمود (ب)</th>
          </tr>
        </thead>

        <tbody>

          ${pairs.map((pair,i)=>`

            <tr>

              <td>
                ${i+1}- ${escapeHTML(pair.left)}
              </td>

              <td class="order-number-col ${
                currentVersion==="answer"
                  ? "table-correct-answer"
                  : ""
              }">

                ${
                  currentVersion==="answer"
                    ? mixedRight[i].correctNumber
                    : ""
                }

              </td>

              <td>
                ${escapeHTML(mixedRight[i].text)}
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>
    `;
  } else if(q.type==="table"){

    if(item.answerBank){
      html += `
        <div class="table-answer-bank-paper">
          ${escapeHTML(item.answerBank)}
        </div>
      `;
    }

    html+=`<table class="exam-table"><thead><tr><th>البيان</th><th>الإجابة</th></tr></thead><tbody>${
      item.rows.map(r=>`<tr><td>${escapeHTML(r.label)}</td><td class="${currentVersion==="answer"?"table-correct-answer":""}">${currentVersion==="answer"?escapeHTML(r.answer):"........................"}</td></tr>`).join("")
    }</tbody></table>`;
  } else if(q.type==="image"){
    if(item.image) html+=`<img src="${item.image}" class="paper-image" alt="">`;
    html+= currentVersion==="answer" && item.answer
      ? `<div class="inline-model-answer">${escapeHTML(item.answer)}</div>`
      : `<div class="student-answer-lines">........................................................................</div>`;
  }
  return html+"</div>";
}

function renderPreview(){
  previewHeader.innerHTML=headerHTML(false,false);
  studentInfoRow.style.display=currentVersion==="student"?"grid":"none";
  versionBadge.textContent=currentVersion==="answer"?"نموذج الإجابة":"نسخة الطالب";
  teacherLabel.textContent=(getValue("teacherGender")==="معلمة"?"معلمة المادة:":"معلم المادة:");
  $("pTeacher").textContent=getValue("teacher")||"-";

  const frame=getValue("paperFrame")||"official";
  examPaper.classList.remove("frame-none","frame-simple","frame-official");
  examPaper.classList.add(`frame-${frame}`);

  if(!questions.length){
    paperQuestions.innerHTML='<div class="paper-empty">بعد إضافة الأسئلة ستظهر هنا تلقائيًا.</div>';
    return;
  }

  const end=getValue("endMessage");
  paperQuestions.innerHTML=questions.map((q,qi)=>`
    <div class="paper-question">
      <div class="paper-question-title">
        <span>السؤال ${qi+1}: ${escapeHTML(q.title)}</span>
        <span class="question-score-box">${Number(q.score||0)}</span>
      </div>
      ${q.type==="reading" ? `<div class="reading-passage">${escapeHTML(q.passage||"").replaceAll("\n","<br>")}</div>` : ""}

      ${q.type==="fill" && getFillQuestionBank(q)
        ? `<div class="fill-question-bank-paper">
             
             <span>( ${escapeHTML(getFillQuestionBank(q))} )</span>
           </div>`
        : ""}

      ${q.items.map((it,ii)=>renderItemHTML(q,it,ii,false)).join("")}
    </div>`).join("") +
    (end?`<div class="exam-end-message">${escapeHTML(end)}</div>`:"");

  paperQuestions.style.fontSize=`${getValue("questionFontSize")||14}px`;
}

function resizeImage(file,maxSize,cb){
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxSize||h>maxSize){
        if(w>h){h=Math.round(h*maxSize/w);w=maxSize}
        else{w=Math.round(w*maxSize/h);h=maxSize}
      }
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      cb(c.toDataURL("image/jpeg",.82));
    };
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
}

function save(){
  if(!AUTO_SAVE_KEY)return;
  const form={};
  formIds.forEach(id=>form[id]=$(id)?.value??"");
  try{
    localStorage.setItem(AUTO_SAVE_KEY,JSON.stringify({questions,currentVersion,form,schoolLogoData}));
  }catch(e){console.warn("تعذر الحفظ التلقائي",e)}
}

function load(){
  if(!AUTO_SAVE_KEY)return;
  try{
    const s=localStorage.getItem(AUTO_SAVE_KEY);
    if(!s)return;
    const d=JSON.parse(s);
    if(Array.isArray(d.questions))questions=d.questions;
    if(d.form) Object.entries(d.form).forEach(([id,v])=>{if($(id))$(id).value=v??""});
    if(d.schoolLogoData)schoolLogoData=d.schoolLogoData;
    currentVersion=d.currentVersion==="answer"?"answer":"student";
  }catch(e){console.warn(e)}
}

function useTeacherWorkspace(teacherId){
  if(!teacherId)return;

  AUTO_SAVE_KEY = "ekhtibari_teacher_" + teacherId;

  questions = [];
  schoolLogoData = "";
  currentVersion = "student";

  load();

  renderQuestionsList();
  renderPreview();

  if(versionBadge){
    versionBadge.textContent =
      currentVersion === "answer"
        ? "نموذج الإجابة"
        : "نسخة الطالب";
  }
}

window.useTeacherWorkspace = useTeacherWorkspace;

function refreshAll(){
  renderQuestionsList();
  renderPreview();
  save();
}

/* =========================================================
   الطباعة الحقيقية: توزيع الفقرات على صفحات A4
========================================================= */

function newPrintPage(firstPage=false){
  const frame=getValue("paperFrame")||"official";
  const page=document.createElement("section");
  page.className=`print-page frame-${frame}`;
  page.innerHTML=`
    <div class="print-page-inner">
      <div class="print-page-body"></div>
      <div class="print-page-number"></div>
    </div>`;
  printRoot.appendChild(page);

  const body=page.querySelector(".print-page-body");

  if(firstPage){
    body.insertAdjacentHTML("beforeend",headerHTML(true,true));
  }
  return page;
}

function pageBody(page){ return page.querySelector(".print-page-body"); }

function isOverflowing(page){
  const b=pageBody(page);
  return b.scrollHeight > b.clientHeight + 1;
}

function removeIfEmptyQuestion(container){
  if(container && !container.querySelector(".print-question-item") && !container.querySelector(".print-reading-passage")){
    container.remove();
  }
}

function makeQuestionChunk(q,qi,continued=false){
  const div=document.createElement("div");
  div.className="print-question";
  div.innerHTML=`
    <div class="print-question-title ${continued?"continued":""}">
      <span>${continued?"تابع ": ""}السؤال ${qi+1}: ${escapeHTML(q.title)}</span>
      <span class="print-score-box">${continued?"":Number(q.score||0)}</span>
    </div>

    ${
      !continued &&
      q.type==="fill" &&
      getFillQuestionBank(q)
        ? `
          <div class="fill-question-bank-paper">
            
            <span>( ${escapeHTML(getFillQuestionBank(q))} )</span>
          </div>
        `
        : ""
    }`;
  return div;
}

async function waitForImages(container){
  const imgs=[...container.querySelectorAll("img")].filter(i=>!i.complete);
  await Promise.all(imgs.map(img=>new Promise(res=>{
    img.addEventListener("load",res,{once:true});
    img.addEventListener("error",res,{once:true});
    setTimeout(res,800);
  })));
}

async function buildPrintPages(){
  printRoot.innerHTML="";
  printRoot.classList.add("measure");

  let page=newPrintPage(true);
  await waitForImages(page);

  for(let qi=0; qi<questions.length; qi++){
    const q=questions[qi];

    // جرّب السؤال كاملًا أولًا. إذا كان صغيرًا ويبقى داخل الصفحة، نحافظ عليه كاملًا.
    const full=makeQuestionChunk(q,qi,false);
    if(q.type==="reading"){
      full.insertAdjacentHTML("beforeend",`<div class="print-reading-passage">${escapeHTML(q.passage||"").replaceAll("\n","<br>")}</div>`);
    }
    q.items.forEach((it,ii)=>full.insertAdjacentHTML("beforeend",renderItemHTML(q,it,ii,true)));

    pageBody(page).appendChild(full);
    await waitForImages(full);

    if(!isOverflowing(page)){
      continue;
    }

    /*
      السؤال لم يتسع في المساحة المتبقية:
      إذا كانت الصفحة تحتوي سؤالًا سابقًا، ننقل السؤال كاملًا
      إلى صفحة A4 جديدة أولًا.
      ولا نقسم السؤال إلا إذا كان أكبر من صفحة كاملة.
    */
    full.remove();

    const pageAlreadyHasQuestion =
      !!pageBody(page).querySelector(".print-question");

    if(pageAlreadyHasQuestion){

      page = newPrintPage(false);

      pageBody(page).appendChild(full);

      await waitForImages(full);

      if(!isOverflowing(page)){
        continue;
      }

      // السؤال نفسه أكبر من صفحة كاملة، لذلك نسمح بتقسيم فقراته.
      full.remove();
    }

    let chunk=makeQuestionChunk(q,qi,false);
    pageBody(page).appendChild(chunk);

    if(isOverflowing(page)){
      chunk.remove();
      page=newPrintPage(false);
      chunk=makeQuestionChunk(q,qi,false);
      pageBody(page).appendChild(chunk);
    }

    if(q.type==="reading"){
      const passage=document.createElement("div");
      passage.className="print-reading-passage";
      passage.innerHTML=escapeHTML(q.passage||"").replaceAll("\n","<br>");
      chunk.appendChild(passage);

      if(isOverflowing(page)){
        passage.remove();
        removeIfEmptyQuestion(chunk);
        page=newPrintPage(false);
        chunk=makeQuestionChunk(q,qi,false);
        pageBody(page).appendChild(chunk);
        chunk.appendChild(passage);
      }
    }

    for(let ii=0; ii<q.items.length; ii++){
      const holder=document.createElement("div");
      holder.innerHTML=renderItemHTML(q,q.items[ii],ii,true);
      const itemNode=holder.firstElementChild;
      chunk.appendChild(itemNode);
      await waitForImages(itemNode);

      if(isOverflowing(page)){
        itemNode.remove();

        // إذا الصفحة تحتوي فقط عنوان السؤال تقريبًا، لا نترك فراغًا كبيرًا.
        removeIfEmptyQuestion(chunk);

        page=newPrintPage(false);
        chunk=makeQuestionChunk(q,qi,true);
        pageBody(page).appendChild(chunk);
        chunk.appendChild(itemNode);

        // فقرة ضخمة جدًا: نسمح بها حتى لا تدخل في حلقة لا نهائية.
        await waitForImages(itemNode);
      }
    }
  }

  const end=getValue("endMessage");
  const endBlock=document.createElement("div");
  endBlock.className="print-end-block";
  endBlock.innerHTML=`
    ${end?`<div class="print-end-message">${escapeHTML(end)}</div>`:""}
    <div class="print-teacher">${getValue("teacherGender")==="معلمة"?"معلمة المادة:":"معلم المادة:"} ${escapeHTML(getValue("teacher")||"-")}</div>`;

  pageBody(page).appendChild(endBlock);
  if(isOverflowing(page)){
    endBlock.remove();
    page=newPrintPage(false);
    pageBody(page).appendChild(endBlock);
  }

  const pages=[...printRoot.querySelectorAll(".print-page")];
  pages.forEach((p,i)=>{
    p.querySelector(".print-page-number").textContent=`صفحة ${i+1} من ${pages.length}`;
  });

  printRoot.classList.remove("measure");
}

async function printExam(){
  renderPreview();
  await buildPrintPages();
  setTimeout(()=>window.print(),50);
}

typeCards.forEach(card=>card.addEventListener("click",()=>{
  const type=card.dataset.type;
  editingQuestionIndex=-1; editingItemIndex=-1;
  activateType(type);
  questionTitle.value=defaultTitle(type);
  renderSpecialFields();
  questionEditor.innerHTML="";
  setEditorItemCount(Number(itemCount.value)||1);
  saveQuestionBtn.textContent="💾 حفظ السؤال";
  cancelEditBtn.style.display="none";
}));

itemCount.addEventListener("change",()=>{
  if(editingItemIndex>=0){itemCount.value=1;return}
  setEditorItemCount(itemCount.value);
});

addItemBtn.addEventListener("click",()=>{
  addEditorItem();
  itemCount.value=questionEditor.querySelectorAll(".question-item-editor").length;
});

saveQuestionBtn.addEventListener("click",saveQuestion);
cancelEditBtn.addEventListener("click",resetEditor);
$("studentVersionBtn").addEventListener("click",()=>{currentVersion="student";refreshAll()});
$("answerVersionBtn").addEventListener("click",()=>{currentVersion="answer";refreshAll()});
$("printBtn").addEventListener("click",printExam);

$("clearExamBtn").addEventListener("click",()=>{
  if(!confirm("هل تريد مسح الاختبار بالكامل؟"))return;
  localStorage.removeItem(AUTO_SAVE_KEY);
  questions=[]; schoolLogoData=""; currentVersion="student";
  formIds.forEach(id=>{
    const el=$(id); if(!el)return;
    if(id==="teacherGender")el.value="معلم";
    else if(id==="questionFontSize")el.value="14";
    else if(id==="paperFrame")el.value="official";
    else if(id==="endMessage")el.value="( انتهت الأسئلة )";
    else el.value="";
  });
  customLogo.value="";
  resetEditor();refreshAll();
});

customLogo.addEventListener("change",e=>{
  const file=e.target.files?.[0]; if(!file)return;
  resizeImage(file,400,data=>{schoolLogoData=data;refreshAll()});
});

formIds.forEach(id=>{
  const el=$(id); if(!el)return;
  el.addEventListener("input",refreshAll);
  el.addEventListener("change",refreshAll);
});

window.editQuestion=editQuestion;
window.deleteQuestion=deleteQuestion;
window.editSingleItem=editSingleItem;
window.deleteSingleItem=deleteSingleItem;

window.addEventListener("beforeprint",()=>{
  // لو المستخدم استخدم Ctrl+P بدل زر الطباعة، نبني الصفحات أيضًا.
  if(!printRoot.children.length) buildPrintPages();
});

activateType("mcq");
questionTitle.value=defaultTitle("mcq");
renderSpecialFields();
questionEditor.innerHTML="";
addEditorItem();
renderQuestionsList();
renderPreview();
if(currentVersion==="answer") versionBadge.textContent="نموذج الإجابة";

