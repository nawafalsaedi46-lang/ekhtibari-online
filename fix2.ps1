$ErrorActionPreference="Stop"
Set-Location "C:\Users\User\Downloads\ekhtibari_online"

$s=Get-Content .\server.js -Raw

$tp='req\.session\.role\s*=\s*"teacher";\s*req\.session\.teacherId\s*=\s*teacher\.id;\s*res\.json\(\{\s*ok:\s*true\s*\}\);'
$tr=@'
req.session.role = "teacher";
      req.session.teacherId = teacher.id;
      req.session.save(saveErr => {
        if (saveErr) return res.status(500).json({ error: "طھط¹ط°ط± ط­ظپط¸ ط¬ظ„ط³ط© ط§ظ„ط¯ط®ظˆظ„." });
        res.json({ ok: true });
      });
'@
$s=[regex]::Replace($s,$tp,$tr,1)

$ap='req\.session\.role\s*=\s*"admin";\s*res\.json\(\{\s*ok:\s*true\s*\}\);'
$ar=@'
req.session.role = "admin";
    req.session.save(saveErr => {
      if (saveErr) return res.status(500).json({ error: "طھط¹ط°ط± ط­ظپط¸ ط¬ظ„ط³ط© ط§ظ„ط¥ط¯ط§ط±ط©." });
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
      return res.status(404).json({ error: "ط§ظ„ظ…ط¹ظ„ظ… ط؛ظٹط± ظ…ظˆط¬ظˆط¯." });
    }

    if (teacher.active) {
      return res.status(409).json({
        error: "ط£ظˆظ‚ظپ ط§ظ„ظ…ط¹ظ„ظ… ط£ظˆظ„ظ‹ط§ ظ‚ط¨ظ„ ط§ظ„ط­ط°ظپ."
      });
    }

    await pool.query(
      "DELETE FROM teachers WHERE id = $1",
      [req.params.id]
    );

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "طھط¹ط°ط± ط­ط°ظپ ط§ظ„ظ…ط¹ظ„ظ…." });
  }
});

'@

$s=[regex]::Replace(
  $s,
  '(?s)/\*\s*=+\s*\r?\n\s*ط§ظ„طµظپط­ط§طھ\s*\r?\n=+\s*\*/',
  $del+'/* ========================='+[Environment]::NewLine+'   ط§ظ„طµظپط­ط§طھ'+[Environment]::NewLine+'========================= */',
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
  '\s*<div class="field"><label>طھط§ط±ظٹط® ط§ظ†طھظ‡ط§ط، ط§ظ„طھط±ط®ظٹطµ - ط§ط®طھظٹط§ط±ظٹ</label><input id="expiresAt" type="date"></div>',
  ''
)

$h=$h.Replace(
  '<th>ط§ظ„ط­ط§ظ„ط©</th><th>ط§ظ„ط§ظ†طھظ‡ط§ط،</th><th>ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ</th>',
  '<th>ط§ظ„ط­ط§ظ„ط©</th><th>ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ</th>'
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
  '\s*<td>\$\{t\.expiresAt\|\|"ط¯ط§ط¦ظ…"\}</td>',
  ''
)

$j=[regex]::Replace(
  $j,
  '\s*expiresAt:document\.getElementById\("expiresAt"\)\.value\|\|null',
  ''
)

$old=@'
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</button>
'@

$new=@'
        <button class="mini-btn edit" onclick="resetTeacherPassword('${t.id}','${t.name.replaceAll("'","")}')">طھط؛ظٹظٹط± ظƒظ„ظ…ط© ط§ظ„ظ…ط±ظˆط±</button>
        <button class="mini-btn delete" ${t.active?'disabled title="ط£ظˆظ‚ظپ ط§ظ„ظ…ط¹ظ„ظ… ط£ظˆظ„ظ‹ط§"':''} onclick="deleteTeacher('${t.id}','${t.name.replaceAll("'","")}',${t.active})">ط­ط°ظپ</button>
'@

$j=$j.Replace($old.Trim(),$new.Trim())

if($j -notmatch 'async function deleteTeacher'){

$fn=@'
async function deleteTeacher(id,name,active){

  if(active){
    alert("ط£ظˆظ‚ظپ ط§ظ„ظ…ط¹ظ„ظ… ط£ظˆظ„ظ‹ط§ ظ‚ط¨ظ„ ط§ظ„ط­ط°ظپ.");
    return;
  }

  if(!confirm(`ط­ط°ظپ ط§ظ„ظ…ط¹ظ„ظ… "${name}" ظ†ظ‡ط§ط¦ظٹظ‹ط§طں ط³ظٹطھظ… ط­ط°ظپ ط§ط®طھط¨ط§ط±ط§طھظ‡ ط£ظٹط¶ظ‹ط§.`)){
    return;
  }

  try{

    await adminApi(`/api/admin/teachers/${id}`,{
      method:"DELETE"
    });

    msg("طھظ… ط­ط°ظپ ط§ظ„ظ…ط¹ظ„ظ… âœ…");
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

