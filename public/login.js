const form=document.getElementById("teacherLoginForm");
const errorBox=document.getElementById("loginError");
form.addEventListener("submit",async e=>{
  e.preventDefault(); errorBox.textContent="";
  const license=document.getElementById("license").value.trim().toUpperCase();
  const password=document.getElementById("password").value;
  try{
    const r=await fetch("/api/auth/teacher-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({license,password})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"تعذر تسجيل الدخول");
    location.href="/teacher";
  }catch(err){errorBox.textContent=err.message}
});