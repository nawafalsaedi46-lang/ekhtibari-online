const form=document.getElementById("adminLoginForm");
const errorBox=document.getElementById("loginError");
form.addEventListener("submit",async e=>{
  e.preventDefault(); errorBox.textContent="";
  try{
    const r=await fetch("/api/auth/admin-login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      username:document.getElementById("username").value.trim(),
      password:document.getElementById("password").value
    })});
    const d=await r.json();
    if(!r.ok) throw new Error(d.error||"تعذر تسجيل الدخول");
    location.href="/admin";
  }catch(err){errorBox.textContent=err.message}
});