const form=document.getElementById("teacherLoginForm");
const errorBox=document.getElementById("loginError");
form.addEventListener("submit",async e=>{
  e.preventDefault(); errorBox.textContent="";
  const license=document.getElementById("license").value.trim().toUpperCase();
  const password=document.getElementById("password").value;
  try{
    const r=await fetch("/api/auth/teacher-login",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({license,password})});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"طھط¹ط°ط± طھط³ط¬ظٹظ„ ط§ظ„ط¯ط®ظˆظ„");
    location.href="/teacher";
  }catch(err){errorBox.textContent=err.message}
});