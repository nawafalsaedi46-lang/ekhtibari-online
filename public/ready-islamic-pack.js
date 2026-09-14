(function(){
"use strict";

const saveAllBtn = document.getElementById("qBankSaveAll");
const openBankBtn = document.getElementById("qBankOpenBtn");

if(!saveAllBtn || document.getElementById("readyIslamicPackBtn")) return;

const btn = document.createElement("button");
btn.type = "button";
btn.id = "readyIslamicPackBtn";
btn.className = "btn light";
btn.textContent = "📥 إضافة حزمة الدراسات الإسلامية";

saveAllBtn.parentNode.insertBefore(btn, saveAllBtn);

const pack = [

{
  type:"mcq",
  title:"اختاري الإجابة الصحيحة فيما يلي:",
  score:20,
  items:[
    {
      text:"لا نصلي إلا لله مثال على؟",
      options:["توحيد الألوهية","توحيد الربوبية","توحيد الأسماء والصفات"],
      answer:"0"
    },
    {
      text:"كل إنسان يولد على؟",
      options:["الشرك","الفطرة","الخوف"],
      answer:"1"
    },
    {
      text:"أقر المشركون في عهد الرسول صلى الله عليه وسلم بتوحيد؟",
      options:["الألوهية","الأسماء والصفات","الربوبية"],
      answer:"2"
    },
    {
      text:"هو الأساس لجميع الأعمال فلا يقبل الله أي عمل بدونه؟",
      options:["التوحيد","بر الوالدين","المحبة"],
      answer:"0"
    },
    {
      text:"هو الإقرار بأن الله تعالى رب كل شيء، ومالكه وخالقه ورازقه ومدبره؟",
      options:["توحيد الألوهية","توحيد الربوبية","توحيد الأسماء والصفات"],
      answer:"1"
    },
    {
      text:"من صرف شيئًا من العبادة لغير الله يكون قد وقع في؟",
      options:["التوحيد","الإسلام","الشرك"],
      answer:"2"
    },
    {
      text:"قال الله تعالى: (الله خالق كل شيء) دليل على أن الله هو؟",
      options:["الخالق","المالك","الرازق"],
      answer:"0"
    },
    {
      text:"الذي سمى النبي صلى الله عليه وسلم محمدًا هو؟",
      options:["أبوه عبدالله","جده عبدالمطلب","أمه آمنة"],
      answer:"1"
    },
    {
      text:"اسم قبيلة النبي صلى الله عليه وسلم هي؟",
      options:["ثقيف","هوازن","قريش"],
      answer:"2"
    },
    {
      text:"كان لون بشرة النبي صلى الله عليه وسلم؟",
      options:["بيضاء","صفراء","حمراء"],
      answer:"0"
    },
    {
      text:"أعظم معجزات النبي صلى الله عليه وسلم هي؟",
      options:["الحديث","القرآن","التوحيد"],
      answer:"1"
    },
    {
      text:"معنى الشفاعة؟",
      options:["الصداقة","المحبة","الوساطة"],
      answer:"2"
    },
    {
      text:"أول زوجة تزوجها النبي صلى الله عليه وسلم هي؟",
      options:["خديجة رضي الله عنها","عائشة رضي الله عنها","فاطمة رضي الله عنها"],
      answer:"0"
    },
    {
      text:"اشتهرت عائشة رضي الله عنها بـ؟",
      options:["المال","الذكاء والحفظ","الخوف"],
      answer:"1"
    },
    {
      text:"كان عمر الرسول صلى الله عليه وسلم عندما تزوج السيدة خديجة رضي الله عنها؟",
      options:["15 سنة","20 سنة","25 سنة"],
      answer:"2"
    },
    {
      text:"واجبنا تجاه نعمة الماء؟",
      options:["شكر الله عليها","عدم إعطائها لمن يحتاجها","الإسراف فيها"],
      answer:"0"
    },
    {
      text:"أقول عند الخروج من الخلاء؟",
      options:["الحمد لله","غفرانك","أستغفر الله"],
      answer:"1"
    },
    {
      text:"عدد فروض الوضوء؟",
      options:["4 فروض","5 فروض","6 فروض"],
      answer:"2"
    },
    {
      text:"من سنن الوضوء؟",
      options:["السواك","غسل اليدين إلى المرفقين","غسل الرجلين إلى الكعبين"],
      answer:"0"
    },
    {
      text:"من نواقض الوضوء؟",
      options:["النعاس","أكل لحم الإبل","اللعب"],
      answer:"1"
    }
  ]
},

{
  type:"order",
  title:"اربطي العمود (أ) بما يناسبه من العمود (ب) باستعمال الأرقام:",
  score:6,
  items:[
    {
      text:"اربطي كل عبارة بما يناسبها:",
      orderPairs:[
        {
          left:"يسمى توحيد الألوهية بـ",
          right:"توحيد العبادة"
        },
        {
          left:"أبو هريرة رضي الله عنه هو",
          right:"عبدالرحمن بن صخر الدوسي"
        },
        {
          left:"أحب دراسة سيرة الرسول ﷺ من أجل",
          right:"أتعرف على أخلاقه وصفاته"
        },
        {
          left:"من رأى وجه النبي ﷺ علم أنه",
          right:"لا يكذب"
        },
        {
          left:"أستر عن الأنظار",
          right:"من آداب قضاء الحاجة"
        },
        {
          left:"من شروط الوضوء",
          right:"طهارة الماء"
        }
      ]
    }
  ]
},

{
  type:"table",
  title:"صنفي العبادات التي يجب لها الوضوء، والعبادات التي يسن لها الوضوء؟",
  score:4,
  items:[
    {
      text:"صنفي العبادات في الجدول التالي:",
      answerBank:"( الصلاة - النوم - عند ذكر الله - الطواف بالكعبة المشرفة )",
      rows:[
        {
          label:"عبادات يجب لها الوضوء",
          answer:"الصلاة + الطواف بالكعبة المشرفة"
        },
        {
          label:"عبادات يسن لها الوضوء",
          answer:"النوم + عند ذكر الله"
        }
      ]
    }
  ]
},

{
  type:"fill",
  title:"أكملي الفراغات التالية بما يناسبها من المصطلحات التي أمامك:",
  score:5,
  wordBank:"الطاغوت - الماء الطهور - الخليل - الموالاة - توحيد الألوهية",
  items:[
    {
      text:"إفراد الله بالعبادة يسمى",
      answer:"توحيد الألوهية"
    },
    {
      text:"كل ما عبد من دون الله وهو راضٍ يسمى",
      answer:"الطاغوت"
    },
    {
      text:"من وصل إلى أعلى درجات المحبة يسمى",
      answer:"الخليل"
    },
    {
      text:"الماء الذي لم يتغير بنجاسة يسمى",
      answer:"الماء الطهور"
    },
    {
      text:"أن لا أفصل بين غسل الأعضاء فصلاً طويلاً تسمى",
      answer:"الموالاة"
    }
  ]
},

{
  type:"mention",
  title:"أسئلة قصيرة:",
  score:5,
  items:[
    {
      text:"اذكري ثلاثة من مصادر الماء الطهور؟",
      mentionCount:3,
      answer:"ماء المطر\nماء البحر\nماء الآبار"
    },
    {
      text:"اذكري اثنتين من فضائل النبي صلى الله عليه وسلم.",
      mentionCount:2,
      answer:"أنه خليل الله\nأنه خاتم النبيين"
    }
  ]
}

];

async function api(url, options={}){
  const response = await fetch(url,{
    ...options,
    headers:{
      "Content-Type":"application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(()=>({}));

  if(!response.ok){
    throw new Error(data.error || "تعذر حفظ الأسئلة");
  }

  return data;
}

btn.addEventListener("click", async function(){

  if(!confirm(
    "إضافة حزمة الدراسات الإسلامية إلى بنك الأسئلة؟\n\n" +
    "• اختيار من متعدد: 20 فقرة\n" +
    "• ربط\n" +
    "• تصنيف\n" +
    "• أكمل\n" +
    "• أسئلة قصيرة\n\n" +
    "جميعها تحتوي على الحل."
  )){
    return;
  }

  btn.disabled = true;
  btn.textContent = "جاري إضافة الأسئلة...";

  try{

    const existingData = await api("/api/question-bank");
    const existing = Array.isArray(existingData.questions)
      ? existingData.questions
      : [];

    const subject =
      document.getElementById("subject")?.value.trim()
      || "الدراسات الإسلامية";

    const grade =
      document.getElementById("grade")?.value.trim()
      || "";

    let added = 0;
    let skipped = 0;

    for(const question of pack){

      const alreadyExists = existing.some(q =>
        q.type === question.type &&
        String(q.title || "").trim() ===
        String(question.title || "").trim()
      );

      if(alreadyExists){
        skipped++;
        continue;
      }

      await api("/api/question-bank",{
        method:"POST",
        body:JSON.stringify({
          question,
          subject,
          grade
        })
      });

      added++;
    }

    alert(
      "✅ تمت إضافة الحزمة إلى بنك الأسئلة\n\n" +
      "تمت الإضافة: " + added +
      "\nتم تجاهل المكرر: " + skipped +
      "\n\nيمكنك تعديل أو حذف أي سؤال من البنك."
    );

    if(openBankBtn){
      openBankBtn.click();
    }

  }catch(error){

    alert("❌ " + error.message);

  }finally{

    btn.disabled = false;
    btn.textContent = "📥 إضافة حزمة الدراسات الإسلامية";

  }

});

})();