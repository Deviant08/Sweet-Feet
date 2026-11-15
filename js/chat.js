/*
 * ============================================================
 *  Sweet Feet v2 — js/chat.js
 *  Private customer ↔ retailer inbox.
 *  History via REST /messages; live updates via /ws/chat.
 * ============================================================
 */

import { api, getToken, clearSession, getWsUrl, logoutRedirectUrl, sfAlert, escapeHtml } from "./api.js";

export function initChat() {
  const inboxList = document.getElementById("inboxList");
  const chatPanel = document.getElementById("chatPanel");
  if (!inboxList || !chatPanel) return;

  const isRetailer = !!localStorage.getItem("sf_retailer_id");
  const isCustomer = !!localStorage.getItem("sf_user_id");

  if (!getToken() || (!isRetailer && !isCustomer)) {
    window.location.href =
      "/nav/login.html?next=" + encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  let activePartnerId = null;
  let activePartnerName = "";
  let lastMessageId = null;
  let allConversations = [];
  let socket = null;
  let socketReady = false;
  let reconnectTimer = null;
  let pingTimer = null;
  let pollTimer = null;

  const chatEmptyState = document.getElementById("chatEmptyState");
  const chatHeader = document.getElementById("chatHeader");
  const chatMessages = document.getElementById("chatMessages");
  const chatInputBar = document.getElementById("chatInputBar");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatAvatarEl = document.getElementById("chatAvatar");
  const chatPartnerName = document.getElementById("chatPartnerName");
  const chatPartnerSub = document.getElementById("chatPartnerSub");
  const inboxItemsEl = document.getElementById("inboxItems");
  const inboxSearchEl = document.getElementById("inboxSearch");

  const preProductId = new URLSearchParams(window.location.search).get("product");
  const preRetailerId = new URLSearchParams(window.location.search).get("retailer");

  function escHtml(s) {
    return escapeHtml(String(s ?? ""));
  }

  function initial(name) {
    const n = String(name || "?").trim();
    return (n[0] || "?").toUpperCase();
  }

  function fmtTime(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function setLiveHint(state) {
    if (!chatPartnerSub) return;
    if (state === "live") chatPartnerSub.textContent = "Connected";
    else if (state === "connecting") chatPartnerSub.textContent = "Connecting…";
    else chatPartnerSub.textContent = "";
  }

  function wsSend(obj) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    try {
      socket.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  function connectSocket() {
    const url = getWsUrl();
    if (!url) return;
    try {
      socket = new WebSocket(url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(getToken() || ""));
    } catch (e) {
      startPollFallback();
      return;
    }
    socket.addEventListener("open", () => {
      socketReady = true;
      setLiveHint("live");
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => wsSend({ type: "ping" }), 25000);
      if (activePartnerId) wsSend({ type: "join", partnerId: activePartnerId });
      stopPollFallback();
    });
    socket.addEventListener("message", (ev) => {
      let frame;
      try {
        frame = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (frame.type === "message" && frame.message) {
        handleIncoming(frame.message, frame);
      } else if (frame.type === "inbox") {
        if (Array.isArray(frame.conversations)) {
          allConversations = frame.conversations;
          renderInbox(allConversations);
        }
      } else if (frame.type === "typing") {
        /* optional */
      }
    });
    socket.addEventListener("close", () => {
      socketReady = false;
      setLiveHint("connecting");
      if (pingTimer) clearInterval(pingTimer);
      startPollFallback();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectSocket, 3000);
    });
    socket.addEventListener("error", () => {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    });
  }

  function startPollFallback() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      loadInbox();
      if (activePartnerId) fetchMessages();
    }, 8000);
  }

  function stopPollFallback() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function handleIncoming(m, frame = {}) {
    const partnerId = isRetailer ? String(m.customer) : String(m.retailer);
    if (!frame.skipUnread && String(activePartnerId) !== partnerId) {
      /* bump unread via reload */
    }
    const existing = allConversations.find((c) => String(c.partnerId) === partnerId);
    if (existing) {
      existing.last_message = m.message;
      existing.unread_count =
        frame.skipUnread || String(activePartnerId) === partnerId ? 0 : 1;
    }
    renderInbox(allConversations);
    appendOrRefresh(m);
  }

  async function loadInbox() {
    try {
      const data = await api("/messages/inbox");
      allConversations = data.conversations || data || [];
      if (!Array.isArray(allConversations)) allConversations = [];
      renderInbox(allConversations);
      if (preRetailerId && !activePartnerId) {
        const hit = allConversations.find((c) => String(c.partnerId) === String(preRetailerId));
        if (hit) openConversation(hit.partnerId, hit.partnerName);
        else openConversation(preRetailerId, "Seller");
      }
    } catch (e) {
      if (!activePartnerId) {
        /* keep empty */
      }
      if (inboxItemsEl) {
        inboxItemsEl.innerHTML =
          '<div style="padding:1.5rem;color:#6b5e52">Could not load conversations.</div>';
      }
    }
  }

  function renderInbox(convs) {
    if (!inboxItemsEl) return;
    if (!convs.length) {
      inboxItemsEl.innerHTML = isRetailer
        ? '<div style="padding:1.5rem;color:#6b5e52">No customer messages yet.</div>'
        : '<div style="padding:1.5rem;color:#6b5e52">No conversations yet. Message a seller from a product.</div>';
      return;
    }
    inboxItemsEl.innerHTML = convs
      .map((c) => {
        const isActive = String(activePartnerId) === String(c.partnerId);
        const unread = Number(c.unread_count || 0);
        return `
        <div class="inbox_item ${isActive ? "active" : ""}" data-id="${escapeHtml(c.partnerId)}" data-name="${escapeHtml(c.partnerName)}">
          <div class="inbox_avatar">${escapeHtml(initial(c.partnerName))}</div>
          <div class="inbox_info">
            <div class="inbox_name">${escapeHtml(c.partnerName)}</div>
            <div class="inbox_preview">${escapeHtml(c.last_message || "")}</div>
          </div>
          ${unread > 0 ? `<span class="inbox_unread">${unread}</span>` : ""}
        </div>`;
      })
      .join("");
    inboxItemsEl.querySelectorAll(".inbox_item").forEach((item) => {
      item.addEventListener("click", () => openConversation(item.dataset.id, item.dataset.name));
    });
  }

  if (inboxSearchEl) {
    inboxSearchEl.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      renderInbox(allConversations.filter((c) => (c.partnerName || "").toLowerCase().includes(q)));
    });
  }

  function showThreadView() {
    document.querySelector(".chat_layout")?.classList.add("thread-open");
  }

  function showListView() {
    document.querySelector(".chat_layout")?.classList.remove("thread-open");
    activePartnerId = null;
    activePartnerName = "";
    lastMessageId = null;
    chatEmptyState?.classList.remove("hidden");
    chatHeader?.classList.add("hidden");
    chatMessages?.classList.add("hidden");
    chatInputBar?.classList.add("hidden");
    if (chatMessages) chatMessages.innerHTML = "";
    renderInbox(allConversations);
  }

  async function openConversation(partnerId, partnerName) {
    activePartnerId = partnerId;
    activePartnerName = partnerName;
    lastMessageId = null;

    chatEmptyState?.classList.add("hidden");
    chatHeader?.classList.remove("hidden");
    chatMessages?.classList.remove("hidden");
    chatInputBar?.classList.remove("hidden");

    if (chatAvatarEl) chatAvatarEl.textContent = initial(partnerName);
    if (chatPartnerName) chatPartnerName.textContent = partnerName;
    setLiveHint(socketReady ? "live" : "connecting");
    if (chatMessages) chatMessages.innerHTML = "";

    renderInbox(allConversations);
    await fetchMessages();
    clearUnread(partnerId);
    wsSend({ type: "join", partnerId });
    showThreadView();
  }

  function paintMessages(msgs) {
    if (!chatMessages || !Array.isArray(msgs) || !msgs.length) return;
    const latest = msgs[msgs.length - 1];
    const lid = latest._id || latest.id;
    if (lid === lastMessageId) return;
    lastMessageId = lid;
    chatMessages.innerHTML = msgs
      .map((m) => {
        const isMine = isRetailer ? m.senderType === "retailer" : m.senderType === "customer";
        return `
            <div class="msg_row ${isMine ? "msg_mine" : "msg_theirs"}">
              <div class="msg_bubble">${escHtml(m.message)}</div>
              <div class="msg_time">${fmtTime(m.createdAt || m.created_at)}</div>
            </div>`;
      })
      .join("");
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendOrRefresh(m) {
    const partner = isRetailer ? String(m.customer) : String(m.retailer);
    if (activePartnerId && String(activePartnerId) !== partner) return;
    if (!chatMessages) return;
    const id = String(m._id || m.id || "");
    if (id && id === lastMessageId) return;
    lastMessageId = id || lastMessageId;
    const isMine = isRetailer ? m.senderType === "retailer" : m.senderType === "customer";
    chatMessages.insertAdjacentHTML(
      "beforeend",
      `<div class="msg_row ${isMine ? "msg_mine" : "msg_theirs"}">
        <div class="msg_bubble">${escHtml(m.message)}</div>
        <div class="msg_time">${fmtTime(m.createdAt || m.created_at)}</div>
      </div>`
    );
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function fetchMessages() {
    if (!activePartnerId) return;
    const q = isCustomer
      ? `?retailerId=${encodeURIComponent(activePartnerId)}`
      : `?customerId=${encodeURIComponent(activePartnerId)}`;
    try {
      const data = await api("/messages" + q);
      const msgs = data.messages || data || [];
      paintMessages(msgs);
      clearUnread(activePartnerId);
    } catch {
      /* ignore */
    }
  }

  function clearUnread(partnerId) {
    const c = allConversations.find((x) => String(x.partnerId) === String(partnerId));
    if (c) c.unread_count = 0;
    renderInbox(allConversations);
  }

  async function sendMessage() {
    const text = (chatInput?.value || "").trim();
    if (!text || !activePartnerId) return;
    chatInput.value = "";
    chatInput.disabled = true;

    const live = wsSend({
      type: "message",
      text,
      partnerId: activePartnerId,
      productId: !isRetailer && preProductId && lastMessageId === null ? preProductId : undefined,
    });

    if (!live) {
      const payload = { message: text };
      if (isCustomer) {
        payload.retailerId = activePartnerId;
        if (preProductId && lastMessageId === null) payload.productId = preProductId;
      } else {
        payload.customerId = activePartnerId;
      }
      try {
        await api("/messages", { method: "POST", body: payload });
        await fetchMessages();
        clearUnread(activePartnerId);
      } catch (e) {
        await sfAlert(e.message || "Could not send message.");
      }
    } else {
      clearUnread(activePartnerId);
    }

    chatInput.disabled = false;
    chatInput.focus();
  }

  let typingOn = false;
  chatInput?.addEventListener("input", () => {
    if (!typingOn) {
      typingOn = true;
      wsSend({ type: "typing", on: true });
      setTimeout(() => {
        typingOn = false;
        wsSend({ type: "typing", on: false });
      }, 1200);
    }
  });

  chatSendBtn?.addEventListener("click", sendMessage);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      stopPollFallback();
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        socket?.close();
      } catch {
        /* ignore */
      }
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        /* ignore */
      }
      const dest = logoutRedirectUrl();
      clearSession();
      window.location.href = dest;
    });
  }

  document.getElementById("chatBackBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showListView();
  });
  connectSocket();
  loadInbox();
}
