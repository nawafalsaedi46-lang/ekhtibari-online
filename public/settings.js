async function api(url,options={}){

  const r=await fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers||{})
    }
  });

  if(r.status===401 || r.status===403){
    location.href="/";
    throw new Error("انتهت الجلسة");
  }

  const d=await r.json().catch(()=>({}));

  if(!r.ok){
    throw new Error(d.error||"حدث خطأ");
  }

  return d;
}


function showMessage(id,text,error=false){

  const el=document.getElementById(id);

  el.textContent=text||"";

  el.className=
    "message "+(error?"error":"success");
}


async function loadSettings(){

  try{

    const d=await api("/api/me");

    document.getElementById("profileName").value=
      d.teacher.name||"";

    document.getElementById("profileGender").value=
      d.teacher.gender||"معلم";

    document.getElementById("settingsLicense").textContent=
      d.teacher.license||"-";

    document.getElementById("settingsStatus").textContent=
      d.teacher.active===false
        ? "موقوف"
        : "نشط";

    document.getElementById("settingsExpiry").textContent=
      d.teacher.expiresAt||"غير محدد";

  }catch(e){

    console.error(e);

  }
}


document
.getElementById("profileForm")
.addEventListener("submit",async e=>{

  e.preventDefault();

  showMessage(
    "profileMessage",
    "جاري الحفظ..."
  );

  try{

    const d=await api("/api/me",{

      method:"PATCH",

      body:JSON.stringify({

        name:
          document
          .getElementById("profileName")
          .value
          .trim(),

        gender:
          document
          .getElementById("profileGender")
          .value

      })

    });

    document.getElementById("profileName").value=
      d.teacher.name;

    showMessage(
      "profileMessage",
      "تم حفظ بيانات المعلم ✅"
    );

  }catch(e){

    showMessage(
      "profileMessage",
      e.message,
      true
    );

  }

});


document
.getElementById("passwordForm")
.addEventListener("submit",async e=>{

  e.preventDefault();

  const currentPassword=
    document.getElementById("currentPassword").value;

  const newPassword=
    document.getElementById("newPassword").value;

  const confirmPassword=
    document.getElementById("confirmPassword").value;


  if(newPassword!==confirmPassword){

    showMessage(
      "passwordMessage",
      "تأكيد كلمة المرور غير مطابق.",
      true
    );

    return;
  }


  try{

    await api("/api/me/password",{

      method:"PATCH",

      body:JSON.stringify({
        currentPassword,
        newPassword
      })

    });

    e.target.reset();

    showMessage(
      "passwordMessage",
      "تم تغيير كلمة المرور بنجاح ✅"
    );

  }catch(e){

    showMessage(
      "passwordMessage",
      e.message,
      true
    );

  }

});


loadSettings();
