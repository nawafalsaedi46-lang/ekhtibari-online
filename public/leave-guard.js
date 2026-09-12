(() => {
  "use strict";

  const backBtn =
    document.querySelector(
      '.account-bar a[href="/dashboard"]'
    );

  if(!backBtn) return;

  const targetUrl =
    backBtn.getAttribute("href") || "/dashboard";


  function hasSavedQuestions(){

    try{
      return (
        Array.isArray(window.questions) &&
        window.questions.length > 0
      );
    }catch{
      try{
        return (
          typeof questions !== "undefined" &&
          Array.isArray(questions) &&
          questions.length > 0
        );
      }catch{
        return false;
      }
    }
  }


  function hasDraftQuestion(){

    const fields =
      document.querySelectorAll(
        "#questionEditor .item-text"
      );

    return [...fields].some(
      el => String(el.value || "").trim() !== ""
    );
  }


  function hasExamWork(){
    return (
      hasSavedQuestions() ||
      hasDraftQuestion()
    );
  }


  const modal =
    document.createElement("div");

  modal.className =
    "unsaved-exam-modal";

  modal.hidden = true;

  modal.innerHTML = `
    <div class="unsaved-exam-box">

      <div class="unsaved-exam-icon">
        💾
      </div>

      <h3>
        هل تريد حفظ الأسئلة؟
      </h3>

      <p>
        لديك أسئلة في الاختبار.
        هل تريد حفظها في حسابك قبل الرجوع للرئيسية؟
      </p>

      <div
        id="unsavedExamError"
        class="unsaved-exam-error"
      ></div>

      <div class="unsaved-exam-actions">

        <button
          type="button"
          id="confirmSaveBeforeLeave"
          class="unsaved-save-btn"
        >
          نعم، احفظ
        </button>

        <button
          type="button"
          id="leaveWithoutSave"
          class="unsaved-leave-btn"
        >
          لا، رجوع بدون حفظ
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);


  const yesBtn =
    document.getElementById(
      "confirmSaveBeforeLeave"
    );

  const noBtn =
    document.getElementById(
      "leaveWithoutSave"
    );

  const errorBox =
    document.getElementById(
      "unsavedExamError"
    );


  function showError(text){

    errorBox.textContent = text;
    errorBox.style.display = "block";
  }


  function hideError(){

    errorBox.textContent = "";
    errorBox.style.display = "none";
  }


  backBtn.addEventListener(
    "click",
    event=>{

      if(!hasExamWork()){
        return;
      }

      event.preventDefault();

      hideError();

      modal.hidden = false;
    }
  );


  noBtn.addEventListener(
    "click",
    ()=>{

      location.href = targetUrl;
    }
  );


  yesBtn.addEventListener(
    "click",
    async ()=>{

      hideError();

      yesBtn.disabled = true;
      yesBtn.textContent = "جاري الحفظ...";


      /*
        إذا كان المعلم داخل سؤال ولم يضغط
        "حفظ السؤال"، نحاول حفظه أولًا.
      */
      if(hasDraftQuestion()){

        const questionSaveBtn =
          document.getElementById(
            "saveQuestionBtn"
          );

        if(questionSaveBtn){
          questionSaveBtn.click();

          await new Promise(
            resolve=>setTimeout(resolve,200)
          );
        }


        /*
          إذا بقي نص السؤال بعد الضغط،
          فمعناه أن السؤال لم يُحفظ
          بسبب نقص في البيانات.
        */
        if(hasDraftQuestion()){

          yesBtn.disabled = false;
          yesBtn.textContent =
            "نعم، احفظ";

          showError(
            "أكمل بيانات السؤال الحالي أولًا ثم اضغط حفظ."
          );

          return;
        }
      }


      const nameInput =
        document.getElementById(
          "examSaveName"
        );

      if(
        !nameInput ||
        !nameInput.value.trim()
      ){

        yesBtn.disabled = false;
        yesBtn.textContent =
          "نعم، احفظ";

        showError(
          "اكتب اسم الاختبار للحفظ أولًا."
        );

        if(nameInput){
          nameInput.focus();

          nameInput.scrollIntoView({
            behavior:"smooth",
            block:"center"
          });
        }

        return;
      }


      const status =
        document.getElementById(
          "accountSaveStatus"
        );

      if(status){
        status.textContent = "";
      }


      try{

        if(
          typeof window.saveAccountExam ===
          "function"
        ){
          await window.saveAccountExam();

        }else{

          const accountSaveBtn =
            document.getElementById(
              "saveToAccountBtn"
            );

          if(!accountSaveBtn){
            throw new Error(
              "زر الحفظ غير موجود"
            );
          }

          accountSaveBtn.click();

          await new Promise(
            resolve=>setTimeout(resolve,1200)
          );
        }


        const resultText =
          String(
            status?.textContent || ""
          );


        if(
          resultText.includes(
            "تم حفظ الاختبار"
          )
        ){

          location.href = targetUrl;
          return;
        }


        yesBtn.disabled = false;
        yesBtn.textContent =
          "نعم، احفظ";

        showError(
          resultText ||
          "تعذر حفظ الاختبار. حاول مرة أخرى."
        );


      }catch(error){

        yesBtn.disabled = false;
        yesBtn.textContent =
          "نعم، احفظ";

        showError(
          error?.message ||
          "تعذر حفظ الاختبار."
        );
      }

    }
  );

})();
