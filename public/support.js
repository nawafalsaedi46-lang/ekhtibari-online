let supportTickets = [];
let currentTicketId = null;


async function supportApi(url,options={}){

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
    throw new Error(
      "انتهت جلسة الحساب."
    );
  }

  const data =
    await response
      .json()
      .catch(() => ({}));

  if(!response.ok){
    throw new Error(
      data.error ||
      "حدث خطأ."
    );
  }

  return data;
}


function escapeHtml(value=""){

  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function categoryLabel(value){

  const labels = {
    technical:"🛠️ مشكلة تقنية",
    suggestion:"💡 اقتراح",
    question:"❓ استفسار",
    subscription:"💳 اشتراك أو تجديد",
    other:"📌 أخرى"
  };

  return labels[value] ||
    "📌 أخرى";
}


function statusInfo(value){

  if(value === "resolved"){
    return {
      text:"🟢 تم الحل",
      className:"status-resolved"
    };
  }

  if(value === "in_progress"){
    return {
      text:"🟡 قيد المعالجة",
      className:"status-progress"
    };
  }

  return {
    text:"🔵 جديد",
    className:"status-new"
  };
}


function formatDate(value){

  if(!value){
    return "-";
  }

  const date =
    new Date(value);

  if(Number.isNaN(date.getTime())){
    return "-";
  }

  return date.toLocaleString(
    "ar-SA"
  );
}


function formMessage(text,error=false){

  const el =
    document.getElementById(
      "ticketFormMessage"
    );

  el.textContent =
    text || "";

  el.style.color =
    error
      ? "#b91c1c"
      : "#047857";
}


async function loadMe(){

  const data =
    await supportApi("/api/me");

  document.getElementById(
    "supportTeacherName"
  ).textContent =
    data.teacher.name;

  document.getElementById(
    "supportTeacherLicense"
  ).textContent =
    data.teacher.license;
}


async function loadTickets(){

  const data =
    await supportApi(
      "/api/support/tickets"
    );

  supportTickets =
    data.tickets || [];

  renderTickets();
}


function renderTickets(){

  document.getElementById(
    "ticketCount"
  ).textContent =
    supportTickets.length;

  const box =
    document.getElementById(
      "ticketsList"
    );

  if(!supportTickets.length){

    box.innerHTML =
      '<div class="support-empty">لا توجد رسائل حتى الآن.</div>';

    return;
  }

  box.innerHTML =
    supportTickets.map(ticket => {

      const status =
        statusInfo(
          ticket.status
        );

      return `
        <button
          type="button"
          class="ticket-item ${
            ticket.teacherUnread
              ? "unread"
              : ""
          }"
          onclick="openTicket('${ticket.id}')"
        >

          <div class="ticket-top">

            <div class="ticket-subject">

              ${
                ticket.teacherUnread
                  ? '<span class="unread-dot"></span> '
                  : ""
              }

              ${escapeHtml(ticket.subject)}

            </div>

            <span
              class="status-badge ${status.className}"
            >
              ${status.text}
            </span>

          </div>

          <div class="ticket-bottom">

            <span>
              ${categoryLabel(ticket.category)}
            </span>

            <span>
              ${formatDate(ticket.updatedAt)}
            </span>

          </div>

        </button>
      `;

    }).join("");
}


async function openTicket(id){

  try{

    const data =
      await supportApi(
        "/api/support/tickets/" +
        encodeURIComponent(id)
      );

    currentTicketId =
      data.ticket.id;

    const status =
      statusInfo(
        data.ticket.status
      );

    document.getElementById(
      "conversationTicketId"
    ).textContent =
      data.ticket.id;

    document.getElementById(
      "conversationSubject"
    ).textContent =
      data.ticket.subject;

    document.getElementById(
      "conversationMeta"
    ).textContent =
      categoryLabel(
        data.ticket.category
      ) +
      " — " +
      status.text;

    const messages =
      data.messages || [];

    const box =
      document.getElementById(
        "conversationMessages"
      );

    box.innerHTML =
      messages.map(msg => {

        const isAdmin =
          msg.senderRole === "admin";

        return `
          <div class="message-row ${
            isAdmin
              ? "admin"
              : "teacher"
          }">

            <div class="message-bubble">

              <div class="message-sender">
                ${
                  isAdmin
                    ? "إدارة اختباري"
                    : "أنت"
                }
              </div>

              <div>
                ${escapeHtml(msg.body)}
              </div>

              <div class="message-date">
                ${formatDate(msg.createdAt)}
              </div>

            </div>

          </div>
        `;

      }).join("");

    document.getElementById(
      "ticketModal"
    ).classList.add("show");

    document.getElementById(
      "ticketModal"
    ).setAttribute(
      "aria-hidden",
      "false"
    );

    setTimeout(() => {
      box.scrollTop =
        box.scrollHeight;
    },30);

    await loadTickets();

  }catch(error){

    alert(error.message);

  }
}


function closeTicket(){

  currentTicketId =
    null;

  document.getElementById(
    "ticketModal"
  ).classList.remove("show");

  document.getElementById(
    "ticketModal"
  ).setAttribute(
    "aria-hidden",
    "true"
  );
}


document.getElementById(
  "closeTicketModal"
).addEventListener(
  "click",
  closeTicket
);


document.getElementById(
  "ticketModal"
).addEventListener(
  "click",
  event => {

    if(
      event.target.id ===
      "ticketModal"
    ){
      closeTicket();
    }

  }
);


document.getElementById(
  "newTicketForm"
).addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const button =
      document.getElementById(
        "sendTicketBtn"
      );

    button.disabled =
      true;

    formMessage(
      "جاري إرسال الرسالة..."
    );

    try{

      const data =
        await supportApi(
          "/api/support/tickets",
          {
            method:"POST",
            body:JSON.stringify({

              category:
                document.getElementById(
                  "ticketCategory"
                ).value,

              subject:
                document.getElementById(
                  "ticketSubject"
                ).value.trim(),

              body:
                document.getElementById(
                  "ticketBody"
                ).value.trim()

            })
          }
        );

      event.target.reset();

      formMessage(
        "تم إرسال رسالتك للإدارة ✅ رقم الطلب: " +
        data.ticket.id
      );

      await loadTickets();

    }catch(error){

      formMessage(
        error.message,
        true
      );

    }finally{

      button.disabled =
        false;

    }

  }
);


document.getElementById(
  "ticketReplyForm"
).addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if(!currentTicketId){
      return;
    }

    const textarea =
      document.getElementById(
        "ticketReplyBody"
      );

    const body =
      textarea.value.trim();

    if(!body){
      return;
    }

    const button =
      document.getElementById(
        "sendReplyBtn"
      );

    button.disabled =
      true;

    try{

      await supportApi(
        "/api/support/tickets/" +
        encodeURIComponent(
          currentTicketId
        ) +
        "/messages",
        {
          method:"POST",
          body:JSON.stringify({
            body
          })
        }
      );

      textarea.value = "";

      const id =
        currentTicketId;

      await openTicket(id);

    }catch(error){

      alert(error.message);

    }finally{

      button.disabled =
        false;

    }

  }
);


window.openTicket =
  openTicket;


Promise.all([
  loadMe(),
  loadTickets()
]).catch(error => {

  console.error(error);

});
