let tickets = [];
let currentTicketId = null;


async function adminSupportApi(url,options={}){

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

    location.href =
      "/admin-login";

    throw new Error(
      "انتهت جلسة الإدارة."
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


async function loadTickets(){

  const data =
    await adminSupportApi(
      "/api/admin/support/tickets"
    );

  tickets =
    data.tickets || [];

  updateStats();

  renderTickets();
}


function updateStats(){

  document.getElementById(
    "allCount"
  ).textContent =
    tickets.length;

  document.getElementById(
    "unreadCount"
  ).textContent =
    tickets.filter(
      ticket =>
        ticket.adminUnread
    ).length;

  document.getElementById(
    "newCount"
  ).textContent =
    tickets.filter(
      ticket =>
        ticket.status === "new"
    ).length;

  document.getElementById(
    "progressCount"
  ).textContent =
    tickets.filter(
      ticket =>
        ticket.status === "in_progress"
    ).length;

  document.getElementById(
    "resolvedCount"
  ).textContent =
    tickets.filter(
      ticket =>
        ticket.status === "resolved"
    ).length;

}


function filteredTickets(){

  const query =
    document.getElementById(
      "ticketSearch"
    ).value
      .trim()
      .toLowerCase();

  const status =
    document.getElementById(
      "statusFilter"
    ).value;

  const category =
    document.getElementById(
      "categoryFilter"
    ).value;

  const unreadOnly =
    document.getElementById(
      "unreadOnly"
    ).checked;

  return tickets.filter(ticket => {

    if(
      status &&
      ticket.status !== status
    ){
      return false;
    }

    if(
      category &&
      ticket.category !== category
    ){
      return false;
    }

    if(
      unreadOnly &&
      !ticket.adminUnread
    ){
      return false;
    }

    if(!query){
      return true;
    }

    const haystack = [
      ticket.id,
      ticket.subject,
      ticket.teacherName,
      ticket.teacherLicense
    ].join(" ").toLowerCase();

    return haystack.includes(query);

  });

}


function renderTickets(){

  const list =
    filteredTickets();

  const box =
    document.getElementById(
      "ticketsList"
    );

  if(!list.length){

    box.innerHTML =
      '<div class="empty">لا توجد رسائل مطابقة.</div>';

    return;
  }

  box.innerHTML =
    list.map(ticket => {

      const status =
        statusInfo(
          ticket.status
        );

      return `
        <div
          class="ticket-row ${
            ticket.adminUnread
              ? "unread"
              : ""
          }"
          onclick="openAdminTicket('${ticket.id}')"
        >

          <div>

            <div class="ticket-title">

              ${
                ticket.adminUnread
                  ? '<span class="unread-mark"></span>'
                  : ""
              }

              ${escapeHtml(ticket.subject)}

            </div>

            <span class="ticket-id-small">
              ${escapeHtml(ticket.id)}
            </span>

            <div class="ticket-category">
              ${categoryLabel(ticket.category)}
            </div>

          </div>


          <div>

            <div class="teacher-name">
              ${escapeHtml(ticket.teacherName)}
            </div>

            <span class="teacher-license">
              ${escapeHtml(ticket.teacherLicense)}
            </span>

          </div>


          <span
            class="status-badge ${status.className}"
          >
            ${status.text}
          </span>


          <div class="ticket-time">
            ${formatDate(ticket.updatedAt)}
          </div>

        </div>
      `;

    }).join("");

}


async function openAdminTicket(id){

  try{

    const data =
      await adminSupportApi(
        "/api/admin/support/tickets/" +
        encodeURIComponent(id)
      );

    const ticket =
      data.ticket;

    currentTicketId =
      ticket.id;

    document.getElementById(
      "conversationTicketId"
    ).textContent =
      ticket.id;

    document.getElementById(
      "conversationSubject"
    ).textContent =
      ticket.subject;

    document.getElementById(
      "conversationTeacher"
    ).textContent =
      ticket.teacherName +
      " — " +
      ticket.teacherLicense;

    document.getElementById(
      "conversationMeta"
    ).textContent =
      categoryLabel(
        ticket.category
      ) +
      " — تاريخ الطلب: " +
      formatDate(
        ticket.createdAt
      );

    document.getElementById(
      "ticketStatus"
    ).value =
      ticket.status;

    document.getElementById(
      "statusMessage"
    ).textContent =
      "";

    const messages =
      data.messages || [];

    const box =
      document.getElementById(
        "conversationMessages"
      );

    box.innerHTML =
      messages.map(message => {

        const fromAdmin =
          message.senderRole === "admin";

        return `
          <div
            class="message-row ${
              fromAdmin
                ? "admin"
                : "teacher"
            }"
          >

            <div class="message-bubble">

              <div class="message-sender">

                ${
                  fromAdmin
                    ? "أنت - الإدارة"
                    : escapeHtml(
                        ticket.teacherName
                      )
                }

              </div>

              <div class="message-text">${escapeHtml(message.body)}</div>

              <div class="message-date">
                ${formatDate(message.createdAt)}
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


function closeModal(){

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
  "closeModalBtn"
).addEventListener(
  "click",
  closeModal
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
      closeModal();
    }

  }
);


document.getElementById(
  "replyForm"
).addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    if(!currentTicketId){
      return;
    }

    const textarea =
      document.getElementById(
        "replyBody"
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

      await adminSupportApi(
        "/api/admin/support/tickets/" +
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

      await openAdminTicket(id);

    }catch(error){

      alert(error.message);

    }finally{

      button.disabled =
        false;

    }

  }
);


document.getElementById(
  "saveStatusBtn"
).addEventListener(
  "click",
  async () => {

    if(!currentTicketId){
      return;
    }

    const status =
      document.getElementById(
        "ticketStatus"
      ).value;

    const message =
      document.getElementById(
        "statusMessage"
      );

    try{

      message.style.color =
        "#64748b";

      message.textContent =
        "جاري الحفظ...";

      await adminSupportApi(
        "/api/admin/support/tickets/" +
        encodeURIComponent(
          currentTicketId
        ) +
        "/status",
        {
          method:"PATCH",
          body:JSON.stringify({
            status
          })
        }
      );

      message.style.color =
        "#047857";

      message.textContent =
        "تم حفظ الحالة ✅";

      await loadTickets();

    }catch(error){

      message.style.color =
        "#b91c1c";

      message.textContent =
        error.message;

    }

  }
);


[
  "ticketSearch",
  "statusFilter",
  "categoryFilter",
  "unreadOnly"
].forEach(id => {

  const el =
    document.getElementById(id);

  el.addEventListener(
    id === "ticketSearch"
      ? "input"
      : "change",
    renderTickets
  );

});


document.getElementById(
  "refreshBtn"
).addEventListener(
  "click",
  loadTickets
);


document.getElementById(
  "logoutBtn"
).addEventListener(
  "click",
  async () => {

    await fetch(
      "/api/auth/logout",
      {
        method:"POST"
      }
    );

    location.href =
      "/admin-login";

  }
);


window.openAdminTicket =
  openAdminTicket;


loadTickets().catch(error => {

  document.getElementById(
    "ticketsList"
  ).innerHTML =
    '<div class="empty">' +
    escapeHtml(error.message) +
    '</div>';

});
