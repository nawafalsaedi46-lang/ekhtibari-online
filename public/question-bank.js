(() => {
  "use strict";

  const openBtn =
    document.getElementById("qBankOpenBtn");

  const questionsListEl =
    document.getElementById("questionsList");

  const saveQuestionButton =
    document.getElementById("saveQuestionBtn");

  const cancelEditButton =
    document.getElementById("cancelEditBtn");

  if(
    !openBtn ||
    !questionsListEl ||
    !saveQuestionButton
  ){
    return;
  }


  const qbEsc = value =>
    String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");


  const typeNames = {
    mcq:"اختيار من متعدد",
    truefalse:"صح أو خطأ",
    fill:"أكمل الفراغ",
    essay:"مقالي",
    mention:"اذكري",
    order:"ترتيب",
    table:"جدول",
    image:"صورة / رسم",
    math:"رياضيات",
    reading:"قطعة قراءة"
  };


  let bankQuestions = [];
  let bankEditingId = null;
  let bankEditingMeta = null;
  let searchTimer = null;


  const modal =
    document.createElement("div");

  modal.className = "qbank-modal";
  modal.hidden = true;

  modal.innerHTML = `
    <div class="qbank-shell">

      <div class="qbank-head">

        <div class="qbank-title-wrap">

          <div class="qbank-icon">
            📚
          </div>

          <div>
            <h2>بنك الأسئلة</h2>
            <p>
              أسئلتك محفوظة في حسابك ويمكن استخدامها في أي اختبار.
            </p>
          </div>

        </div>

        <button
          type="button"
          id="qBankClose"
          class="qbank-close"
          aria-label="إغلاق"
        >
          ×
        </button>

      </div>


      <div class="qbank-toolbar">

        <div class="qbank-filter-grid">

          <input
            type="search"
            id="qBankSearch"
            placeholder="🔎 ابحث في السؤال أو الإجابة..."
          >

          <select id="qBankType">
            <option value="">جميع أنواع الأسئلة</option>
            <option value="mcq">اختيار من متعدد</option>
            <option value="truefalse">صح أو خطأ</option>
            <option value="fill">أكمل الفراغ</option>
            <option value="essay">مقالي</option>
            <option value="mention">اذكري</option>
            <option value="order">ترتيب</option>
            <option value="table">جدول</option>
            <option value="image">صورة / رسم</option>
            <option value="math">رياضيات</option>
            <option value="reading">قطعة قراءة</option>
          </select>

          <input
            type="text"
            id="qBankSubject"
            placeholder="المادة"
          >

          <input
            type="text"
            id="qBankGrade"
            placeholder="الصف"
          >

        </div>

        <div class="qbank-toolbar-bottom">

          <div
            id="qBankCount"
            class="qbank-count"
          >
            0 سؤال
          </div>

          <button
            type="button"
            id="qBankSaveAll"
            class="btn light"
          >
            ⭐ حفظ جميع أسئلة الاختبار في البنك
          </button>

        </div>

      </div>


      <div
        id="qBankList"
        class="qbank-list"
      ></div>

    </div>
  `;

  document.body.appendChild(modal);


  const toast =
    document.createElement("div");

  toast.className = "qbank-toast";

  document.body.appendChild(toast);


  function showToast(text){

    toast.textContent = text;

    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer =
      setTimeout(
        ()=>toast.classList.remove("show"),
        2200
      );
  }


  async function qbApi(url,options={}){

    const response =
      await fetch(url,{
        ...options,
        headers:{
          "Content-Type":"application/json",
          ...(options.headers || {})
        }
      });

    if(
      response.status === 401 ||
      response.status === 403
    ){
      location.href = "/";
      throw new Error("انتهت الجلسة");
    }

    const data =
      await response.json().catch(()=>({}));

    if(!response.ok){
      throw new Error(
        data.error || "حدث خطأ"
      );
    }

    return data;
  }


  function getCurrentSubject(){
    return String(
      document.getElementById("subject")?.value || ""
    ).trim();
  }


  function getCurrentGrade(){
    return String(
      document.getElementById("grade")?.value || ""
    ).trim();
  }


  function firstQuestionText(question){

    const first =
      Array.isArray(question?.items)
        ? question.items[0]
        : null;

    return String(
      first?.text ||
      question?.title ||
      ""
    ).trim();
  }


  function deepClone(value){
    return JSON.parse(
      JSON.stringify(value)
    );
  }


  async function loadBank(){

    const params =
      new URLSearchParams();

    const q =
      document.getElementById(
        "qBankSearch"
      ).value.trim();

    const type =
      document.getElementById(
        "qBankType"
      ).value;

    const subject =
      document.getElementById(
        "qBankSubject"
      ).value.trim();

    const grade =
      document.getElementById(
        "qBankGrade"
      ).value.trim();


    if(q) params.set("q",q);
    if(type) params.set("type",type);
    if(subject) params.set("subject",subject);
    if(grade) params.set("grade",grade);


    const list =
      document.getElementById(
        "qBankList"
      );

    list.innerHTML = `
      <div class="qbank-empty">
        <div>
          جاري تحميل بنك الأسئلة...
        </div>
      </div>
    `;


    try{

      const data =
        await qbApi(
          "/api/question-bank?" +
          params.toString()
        );

      bankQuestions =
        Array.isArray(data.questions)
          ? data.questions
          : [];

      renderBank();


    }catch(error){

      list.innerHTML = `
        <div class="qbank-empty">
          <div>
            تعذر تحميل بنك الأسئلة.<br>
            ${qbEsc(error.message)}
          </div>
        </div>
      `;
    }
  }


  function renderBank(){

    const list =
      document.getElementById(
        "qBankList"
      );

    document.getElementById(
      "qBankCount"
    ).textContent =
      `${bankQuestions.length} سؤال`;


    if(!bankQuestions.length){

      list.innerHTML = `
        <div class="qbank-empty">

          <div>

            <div class="qbank-empty-icon">
              📚
            </div>

            <strong>
              بنك الأسئلة فارغ
            </strong>

            <div style="margin-top:7px">
              من أسئلة الاختبار اضغط
              «⭐ حفظ في البنك».
            </div>

          </div>

        </div>
      `;

      return;
    }


    list.innerHTML =
      bankQuestions.map((entry,index)=>{

        const q =
          entry.data || {};

        const snippet =
          firstQuestionText(q);

        return `
          <article
            class="qbank-card"
            data-bank-id="${qbEsc(entry.id)}"
          >

            <div class="qbank-card-top">

              <div class="qbank-card-main">

                <div class="qbank-card-title">
                  ${qbEsc(
                    entry.title ||
                    q.title ||
                    "سؤال"
                  )}
                </div>

                <div class="qbank-meta">

                  <span class="qbank-chip">
                    ${qbEsc(
                      typeNames[entry.type] ||
                      entry.type ||
                      "سؤال"
                    )}
                  </span>

                  ${
                    entry.subject
                      ? `
                        <span class="qbank-chip">
                          📘 ${qbEsc(entry.subject)}
                        </span>
                      `
                      : ""
                  }

                  ${
                    entry.grade
                      ? `
                        <span class="qbank-chip">
                          🎓 ${qbEsc(entry.grade)}
                        </span>
                      `
                      : ""
                  }

                  <span class="qbank-chip">
                    ⭐ ${Number(q.score || 0)} درجة
                  </span>

                </div>

                ${
                  snippet
                    ? `
                      <div class="qbank-snippet">
                        ${qbEsc(snippet)}
                      </div>
                    `
                    : ""
                }

              </div>

              <div class="qbank-card-number">
                #${index + 1}
              </div>

            </div>


            <div class="qbank-actions">

              <button
                type="button"
                class="qbank-action qbank-use"
                data-qbank-use="${qbEsc(entry.id)}"
              >
                + إضافة للاختبار
              </button>

              <button
                type="button"
                class="qbank-action qbank-edit"
                data-qbank-edit="${qbEsc(entry.id)}"
              >
                ✏️ تعديل
              </button>

              <button
                type="button"
                class="qbank-action qbank-delete"
                data-qbank-delete="${qbEsc(entry.id)}"
              >
                حذف
              </button>

            </div>

          </article>
        `;

      }).join("");
  }


  async function saveQuestionToBank(index){

    if(
      typeof questions === "undefined" ||
      !Array.isArray(questions) ||
      !questions[index]
    ){
      return;
    }

    const question =
      deepClone(questions[index]);

    try{

      await qbApi(
        "/api/question-bank",
        {
          method:"POST",
          body:JSON.stringify({
            question,
            subject:getCurrentSubject(),
            grade:getCurrentGrade()
          })
        }
      );

      showToast(
        "✅ تم حفظ السؤال في بنك الأسئلة"
      );


    }catch(error){

      alert(error.message);
    }
  }


  function injectBankButtons(){

    const cards =
      questionsListEl.querySelectorAll(
        ".saved-question"
      );

    cards.forEach((card,index)=>{

      const actions =
        card.querySelector(
          ".saved-question-actions"
        );

      if(
        !actions ||
        actions.querySelector(
          ".qbank-save-question"
        )
      ){
        return;
      }

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "mini-btn qbank-save-question";

      button.textContent =
        "⭐ حفظ في البنك";

      button.addEventListener(
        "click",
        ()=>saveQuestionToBank(index)
      );

      actions.prepend(button);
    });
  }


  const observer =
    new MutationObserver(
      injectBankButtons
    );

  observer.observe(
    questionsListEl,
    {
      childList:true,
      subtree:true
    }
  );

  injectBankButtons();


  openBtn.addEventListener(
    "click",
    ()=>{

      document.getElementById(
        "qBankSubject"
      ).value =
        getCurrentSubject();

      document.getElementById(
        "qBankGrade"
      ).value =
        getCurrentGrade();

      modal.hidden = false;

      loadBank();
    }
  );


  document.getElementById(
    "qBankClose"
  ).addEventListener(
    "click",
    ()=>modal.hidden = true
  );


  modal.addEventListener(
    "click",
    event=>{

      if(event.target === modal){
        modal.hidden = true;
      }
    }
  );


  [
    "qBankSearch",
    "qBankSubject",
    "qBankGrade"
  ].forEach(id=>{

    document
      .getElementById(id)
      .addEventListener(
        "input",
        ()=>{

          clearTimeout(searchTimer);

          searchTimer =
            setTimeout(loadBank,250);
        }
      );

  });


  document.getElementById(
    "qBankType"
  ).addEventListener(
    "change",
    loadBank
  );


  document.getElementById(
    "qBankSaveAll"
  ).addEventListener(
    "click",
    async ()=>{

      if(
        typeof questions === "undefined" ||
        !questions.length
      ){
        alert(
          "لا توجد أسئلة في الاختبار لحفظها."
        );
        return;
      }

      if(
        !confirm(
          `حفظ جميع أسئلة الاختبار (${questions.length}) في البنك؟`
        )
      ){
        return;
      }

      let saved = 0;

      for(
        let i=0;
        i<questions.length;
        i++
      ){

        try{

          await qbApi(
            "/api/question-bank",
            {
              method:"POST",
              body:JSON.stringify({
                question:deepClone(questions[i]),
                subject:getCurrentSubject(),
                grade:getCurrentGrade()
              })
            }
          );

          saved++;

        }catch(error){

          console.error(
            "QUESTION BANK BULK:",
            error
          );
        }
      }

      showToast(
        `✅ تم حفظ ${saved} سؤال في البنك`
      );

      loadBank();
    }
  );


  document.getElementById(
    "qBankList"
  ).addEventListener(
    "click",
    async event=>{

      const useButton =
        event.target.closest(
          "[data-qbank-use]"
        );

      const editButton =
        event.target.closest(
          "[data-qbank-edit]"
        );

      const deleteButton =
        event.target.closest(
          "[data-qbank-delete]"
        );


      if(useButton){

        const entry =
          bankQuestions.find(
            x=>x.id ===
            useButton.dataset.qbankUse
          );

        if(!entry?.data) return;

        questions.push(
          deepClone(entry.data)
        );

        refreshAll();

        modal.hidden = true;

        showToast(
          "✅ تمت إضافة السؤال إلى الاختبار"
        );

        return;
      }


      if(deleteButton){

        const id =
          deleteButton.dataset.qbankDelete;

        const entry =
          bankQuestions.find(
            x=>x.id === id
          );

        if(
          !confirm(
            `حذف السؤال من بنك الأسئلة؟\n\n${
              entry?.title || ""
            }`
          )
        ){
          return;
        }

        try{

          await qbApi(
            `/api/question-bank/${encodeURIComponent(id)}`,
            {
              method:"DELETE"
            }
          );

          bankQuestions =
            bankQuestions.filter(
              x=>x.id !== id
            );

          renderBank();

          showToast(
            "تم حذف السؤال من البنك"
          );


        }catch(error){

          alert(error.message);
        }

        return;
      }


      if(editButton){

        const entry =
          bankQuestions.find(
            x=>x.id ===
            editButton.dataset.qbankEdit
          );

        if(!entry?.data) return;

        const q =
          deepClone(entry.data);

        bankEditingId =
          entry.id;

        bankEditingMeta = {
          subject:entry.subject || "",
          grade:entry.grade || ""
        };


        activateType(q.type);

        questionTitle.value =
          q.title || "";

        renderSpecialFields(q);

        questionEditor.innerHTML = "";

        (q.items || []).forEach(
          addEditorItem
        );

        itemCount.value =
          Math.max(
            1,
            (q.items || []).length
          );

        saveQuestionButton.textContent =
          "💾 حفظ تعديل بنك الأسئلة";

        cancelEditButton.style.display =
          "inline-block";

        modal.hidden = true;

        document
          .getElementById("questionCard")
          ?.scrollIntoView({
            behavior:"smooth",
            block:"start"
          });

        showToast(
          "✏️ عدّل السؤال ثم اضغط حفظ"
        );
      }

    }
  );


  /*
    وضع تعديل بنك الأسئلة:
    نعترض زر الحفظ قبل app.js
    حتى لا يضيف السؤال إلى الاختبار.
  */
  saveQuestionButton.addEventListener(
    "click",
    async event=>{

      if(!bankEditingId){
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();


      const items =
        readEditorItems();

      if(!validate(items)){
        return;
      }


      const type =
        document.getElementById(
          "questionType"
        ).value;


      const q = {
        type,
        title:
          questionTitle.value.trim() ||
          defaultTitle(type),

        score:Number(
          document.getElementById(
            "questionScore"
          )?.value || 0
        ),

        passage:
          type === "reading"
            ? (
                document.getElementById(
                  "readingPassage"
                )?.value.trim() || ""
              )
            : "",

        wordBank:
          type === "fill"
            ? (
                document.getElementById(
                  "fillWordBank"
                )?.value.trim() || ""
              )
            : "",

        items
      };


      const id =
        bankEditingId;

      const meta =
        bankEditingMeta || {};


      saveQuestionButton.disabled = true;

      saveQuestionButton.textContent =
        "جاري حفظ التعديل...";


      try{

        await qbApi(
          `/api/question-bank/${encodeURIComponent(id)}`,
          {
            method:"PATCH",
            body:JSON.stringify({
              question:q,
              subject:
                meta.subject ||
                getCurrentSubject(),

              grade:
                meta.grade ||
                getCurrentGrade()
            })
          }
        );


        bankEditingId = null;
        bankEditingMeta = null;

        resetEditor();

        saveQuestionButton.disabled =
          false;

        modal.hidden = false;

        await loadBank();

        showToast(
          "✅ تم تحديث السؤال في البنك"
        );


      }catch(error){

        saveQuestionButton.disabled =
          false;

        saveQuestionButton.textContent =
          "💾 حفظ تعديل بنك الأسئلة";

        alert(error.message);
      }

    },
    true
  );


  cancelEditButton?.addEventListener(
    "click",
    ()=>{

      if(bankEditingId){
        bankEditingId = null;
        bankEditingMeta = null;
      }
    },
    true
  );

})();
