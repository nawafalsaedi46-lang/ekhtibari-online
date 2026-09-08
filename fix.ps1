$ErrorActionPreference="Stop"
Set-Location "C:\Users\User\Downloads\ekhtibari_online"

$s=Get-Content .\server.js -Raw

$tp='req\.session\.role\s*=\s*"teacher";\s*req\.session\.teacherId\s*=\s*teacher\.id;\s*res\.json\(\{\s*ok:\s*true\s*\}\);'
$tr=@'
req.session.role = "teacher";
      req.session.teacherId = teacher.id;
      req.session.save(saveErr => {
        if (saveErr) return res.status(500).json({ error: "تعذر حفظ جلسة الدخول." });
        res.json({ ok: true });
      });
'@
$s=[regex]::Replace($s,$tp,$tr,1)

$ap='req\.session\.role\s*=\s*"admin";\s*res\.json\(\{\s*ok:\s*true\s*\}\);'
$ar=@'
req.session.role = "admin";
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: "تعذر حفظ جلسة الإدارة." });
      res.json({ ok: true });
    });
'@
$s=[regex]::Replace($s,$ap,$ar,1)

if($s -notmatch 'app\.delete\("/api/admin/teachers/:id"'){
$del=@'
app.delete("/api/admin/teachers/:id", requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, active FROM teachers WHERE id = $1 LIMIT 1",
      [req.params.id]
    );

    const teacher = rows[0];

    if (!teacher) {
      return res.status(404).json({ error: "المعلم غير موجود." });
    }

    if (teacher.active) {
      return res.status(409).json({
        error: "أوقف المعلم أولًا قبل الحذف."
      });
    }

    await pool.query(
      "DELETE FROM teachers WHERE id = $1",
      [req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "تعذر حذف المعلم." });
  }
});

'@

$s=[regex]::Replace(
  $s,
  '(?s)/\*\s*=+\s*\r?\n\s*الصفحات\s*\r?\n=+\s*\*/',
  $del+'/* ========================='+[Environment]::NewLine+'   الصفحات'+[Environment]::NewLine+'========================= */',
  1
)
}

[IO.File]::WriteAllText(
  (Resolve-Path .\server.js),
  $s,
  (New-Object Text.UTF8Encoding($false))
)

$h=Get-Content .\public\admin.html -Raw

$h=[regex]::Replace(
  $h,
  '\s*<div class="field"><label>تاريخ انتهاء الترخيص - اختياري</label><input id="expiresAt" type="date"></div>',
  ''
)

$h=$h.Replace(
  '<th>الحالة</th><th>الانتهاء</th><th>الاختبارات</th>',
  '<th>الحالة</th><th>الاختبارات</th>'
)

[IO.File]::WriteAllText(
  (Resolve-Path .\public\admin.html),
  $h,
  (New-Object Text.UTF8Encoding($false))
)

$j=Get-Content .\public\admin.js -Raw

$j=$j.Replace(
  'const r=await fetch(url,{...options,headers:',
  'const r=await fetch(url,{...options,credentials:"same-origin",headers:'
)

$j=[regex]::Replace(
  $j,
  '\s*<td>\$\{t\.expiresAt\|\|"دائم"\}</td>',
  ''
)

$j=[regex]::Replace(
  $j,
  '\s*expiresAt:document\.getElementById\("expiresAt"\)\.value\|\|null',
  ''
)

$old=@'
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">تغيير كلمة المرور</button>
'@

$new=@'
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">تغيير كلمة المرور</button>
        <button class="mini-btn delete" ${t.active?'disabled title="أوقف المعلم أولًا"':''} onclick="deleteTeacher('${t.id}','${t.name.replaceAll("'","")}',${t.active})">حذف</button>
'@

$j=$j.Replace($old.Trim(),$new.Trim())

if($j -notmatch 'async function deleteTeacher'){

$fn=@'
async function deleteTeacher(id,name,active){

  if(active){
    alert("أوقف المعلم أولًا قبل الحذف.");
    return;
  }

  if(!confirm(`حذف المعلم "${name}" نهائيًا؟ سيتم حذف اختباراته أيضًا.`)){
    return;
  }

  try{

    await adminApi(`/api/admin/teachers/${id}`,{
      method:"DELETE"
    });

    msg("تم حذف المعلم ✅");
    await loadTeachers();

  }catch(e){

    msg(e.message,true);

  }
}

'@

$j=$j.Replace(
  'document.getElementById("adminLogoutBtn").addEventListener',
  $fn+'document.getElementById("adminLogoutBtn").addEventListener'
)

}

$j=$j.Replace(
  'window.toggleTeacher=toggleTeacher;window.resetTeacherPassword=resetTeacherPassword;',
  'window.toggleTeacher=toggleTeacher;window.resetTeacherPassword=resetTeacherPassword;window.deleteTeacher=deleteTeacher;'
)

[IO.File]::WriteAllText(
  (Resolve-Path .\public\admin.js),
  $j,
  (New-Object Text.UTF8Encoding($false))
)

$l=Get-Content .\public\login.js -Raw

$l=$l.Replace(
  'fetch("/api/auth/teacher-login",{method:"POST",headers:',
  'fetch("/api/auth/teacher-login",{method:"POST",credentials:"same-origin",headers:'
)

[IO.File]::WriteAllText(
  (Resolve-Path .\public\login.js),
  $l,
  (New-Object Text.UTF8Encoding($false))
)

if(Test-Path .\render.yaml){

  $r=Get-Content .\render.yaml -Raw

  $r=$r -replace `
  '(?ms)(- key:\s*ADMIN_USERNAME\s*\r?\n\s*value:\s*)admin\b', `
  '${1}NA1425'

  [IO.File]::WriteAllText(
    (Resolve-Path .\render.yaml),
    $r,
    (New-Object Text.UTF8Encoding($false))
  )
}

node --check .\server.js
node --check .\public\admin.js
node --check .\public\login.js

git add server.js public/admin.html public/admin.js public/login.js render.yaml
git commit -m "Fix teacher login and admin controls"
git push origin main

Write-Host ""
Write-Host "تم بنجاح ✅"
Write-Host "انتظر Render حتى يصبح Live ثم جرب دخول المعلم."