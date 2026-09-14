(function(){
  "use strict";

  const THEMES = [
    {id:"1", name:"التصميم الحالي"},
    {id:"2", name:"رسمي أخضر"},
    {id:"3", name:"حديث احترافي"},
    {id:"4", name:"أكاديمي فاخر"},
    {id:"5", name:"سماوي هندسي"}
  ];

  const paperFrame = document.getElementById("paperFrame");
  if(!paperFrame) return;

  const field = paperFrame.closest(".field");
  if(!field) return;

  const box = document.createElement("div");
  box.className = "field exam-paper-themes";

  box.innerHTML = `
    <label>تصميم ورقة الاختبار</label>

    <div class="paper-theme-grid">
      ${THEMES.map(t => `
        <button
          type="button"
          class="paper-theme-btn"
          data-paper-theme="${t.id}"
        >
          <span class="paper-theme-preview paper-theme-${t.id}-preview"></span>
          <span class="paper-theme-name">${t.name}</span>
        </button>
      `).join("")}
    </div>
  `;

  field.parentNode.insertBefore(
    box,
    field.nextSibling
  );

  function removeThemeClasses(el){
    if(!el) return;

    for(let i=1;i<=5;i++){
      el.classList.remove("paper-theme-" + i);
    }
  }

  function applyTheme(theme){

    theme = String(theme || "1");

    document.documentElement.dataset.paperTheme = theme;

    document
      .querySelectorAll(
        ".paper-inner-border, .paper, .print-page, .a4-page, #printRoot, #printRoot > *"
      )
      .forEach(el=>{
        removeThemeClasses(el);
        el.classList.add("paper-theme-" + theme);
      });

    box
      .querySelectorAll(".paper-theme-btn")
      .forEach(btn=>{
        btn.classList.toggle(
          "active",
          btn.dataset.paperTheme === theme
        );
      });

    localStorage.setItem(
      "ekhtibari_paper_theme",
      theme
    );
  }

  box.addEventListener("click", function(e){

    const btn =
      e.target.closest(".paper-theme-btn");

    if(!btn) return;

    applyTheme(
      btn.dataset.paperTheme
    );
  });

  const observer =
    new MutationObserver(function(){
      const theme =
        localStorage.getItem(
          "ekhtibari_paper_theme"
        ) || "1";

      document
        .querySelectorAll(
          ".paper-inner-border, .paper, .print-page, .a4-page, #printRoot, #printRoot > *"
        )
        .forEach(el=>{

          if(
            !el.classList.contains(
              "paper-theme-" + theme
            )
          ){
            removeThemeClasses(el);
            el.classList.add(
              "paper-theme-" + theme
            );
          }
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

      applyTheme(
        localStorage.getItem(
          "ekhtibari_paper_theme"
        ) || "1"
      );

    }
  );

  applyTheme(
    localStorage.getItem(
      "ekhtibari_paper_theme"
    ) || "1"
  );

})();
