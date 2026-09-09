/*
 * ============================================================
 *  Sweet Feet v2 — js/chat.js
 *  Private customer ↔ retailer inbox.
 *  History via REST /messages; live updates via /ws/chat.
 * ============================================================
 */

import { api, getToken, clearSession, getWsUrl } from "./api.js";

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
  let pollInterval = null;
  let allConversations = [];
  let socket = null;
  let pingTimer = null;
  let reconnectTimer = null;
  let socketReady = false;

  const urlParams = new URLSearchParams(window.location.search);
  const preRetailerId = urlParams.get("retailer_id") || null;
  const preRetailerName = urlParams.get("retailer_name") || "";
  const preProductId = urlParams.get("product_id") || null;
  const preCustomerId = urlParams.get("customer_id") || null;
  const preCustomerName = urlParams.get("customer_name") || "";

  const inboxItemsEl = document.getElementById("inboxItems");
  const inboxSearchEl = document.getElementById("inboxSearch");
  const chatEmptyState = document.getElementById("chatEmptyState");
  const chatHeader = document.getElementById("chatHeader");
  const chatMessages = document.getElementById("chatMessages");
  const chatInputBar = document.getElementById("chatInputBar");
  const chatAvatarEl = document.getElementById("chatAvatar");
  const chatPartnerName = document.getElementById("chatPartnerName");
  const chatPartnerSub = document.getElementById("chatPartnerSub");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");

  function fmtTime(d) {
    return new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function escHtml(t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function initial(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  function setLiveHint(text) {
    if (chatPartnerSub) {
      const roleLabel = isRetailer ? "Customer" : "Retailer · Sweet Feet";
      chatPartnerSub.textContent = text ? `${roleLabel} · ${text}` : roleLabel;
    }
  }

  function wsSend(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  function connectSocket() {
    const token = getToken();
    if (!token) return;
    try {
      const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`;
      socket = new WebSocket(url);
    } catch {
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
      if (frame.type === "message" && frame.data) {
        appendOrRefresh(frame.data);
        bumpInbox(frame.data);
      } else if (frame.type === "inbox") {
        bumpInboxPreview(frame);
      } else if (frame.type === "typing" && frame.on) {
        setLiveHint(`${frame.name || "Partner"} is typing`);
        setTimeout(() => setLiveHint("live"), 1500);
      } else if (frame.type === "error") {
        console.warn("Chat socket:", frame.message);
      }
    });

    socket.addEventListener("close", () => {
      socketReady = false;
      setLiveHint("reconnecting");
      if (pingTimer) clearInterval(pingTimer);
      startPollFallback();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectSocket, 2000);
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
    if (pollInterval) return;
    pollInterval = setInterval(() => {
      if (activePartnerId) fetchMessages();
    }, 4000);
  }

  function stopPollFallback() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function buildInboxFromMessages(messages) {
    const map = new Map();
    for (const m of messages) {
      const partnerId = isRetailer
        ? String(m.customer?._id || m.customer)
        : String(m.retailer?._id || m.retailer);
      const partnerName = isRetailer
        ? m.customerName || m.customer?.fullName || "Customer"
        : m.retailerName || m.retailer?.businessName || "Retailer";
      const existing = map.get(partnerId);
      const ts = new Date(m.createdAt || m.created_at || 0).getTime();
      if (!existing || ts > existing._ts) {
        map.set(partnerId, {
          partnerId,
          partnerName,
          last_message: m.message,
          unread_count: m.isRead ? 0 : 1,
          _ts: ts,
        });
      } else if (!m.isRead) {
        existing.unread_count = (existing.unread_count || 0) + 1;
      }
    }
    return Array.from(map.values()).sort((a, b) => b._ts - a._ts);
  }

  function bumpInbox(m) {
    const partnerId = isRetailer ? String(m.customer) : String(m.retailer);
    const partnerName =
      m.authorName ||
      (isRetailer ? "Customer" : "Retailer");
    bumpInboxPreview({
      partnerId,
      partnerName,
      last_message: m.message,
      createdAt: m.createdAt,
    });
  }

  function bumpInboxPreview(frame) {
    const partnerId = String(frame.partnerId || "");
    if (!partnerId) return;
    const existing = allConversations.find((c) => String(c.partnerId) === partnerId);
    if (existing) {
      existing.last_message = frame.last_message;
      existing._ts = new Date(frame.createdAt || Date.now()).getTime();
      if (String(activePartnerId) !== partnerId) existing.unread_count = (existing.unread_count || 0) + 1;
    } else {
      allConversations.unshift({
        partnerId,
        partnerName: frame.partnerName || "Chat",
        last_message: frame.last_message,
        unread_count: String(activePartnerId) === partnerId ? 0 : 1,
        _ts: Date.now(),
      });
    }
    allConversations.sort((a, b) => b._ts - a._ts);
    renderInbox(allConversations);
  }

  async function loadInbox() {
    try {
      const json = await api("/messages");
      const msgs = json.data || [];
      allConversations = buildInboxFromMessages(Array.isArray(msgs) ? msgs : []);
      renderInbox(allConversations);

      if (!activePartnerId) {
        if (!isRetailer && preRetailerId) openConversation(preRetailerId, preRetailerName || "Retailer");
        else if (isRetailer && preCustomerId) openConversation(preCustomerId, preCustomerName || "Customer");
      }
    } catch {
      if (inboxItemsEl) {
        inboxItemsEl.innerHTML =
          `<div style="padding:2rem;text-align:center;color:var(--clr-muted)">Could not load conversations.</div>`;
      }
    }
  }

  function renderInbox(convs) {
    if (!inboxItemsEl) return;
    if (!convs.length) {
      inboxItemsEl.innerHTML = isRetailer
        ? `<div style="padding:2rem;text-align:center;color:var(--clr-muted);font-size:1.3rem">No messages yet.</div>`
        : `<div style="padding:2rem;text-align:center;color:var(--clr-muted);font-size:1.3rem">
             No conversations yet.<br><br>
             <a href="/nav/products.html" style="color:var(--clr-accent);font-weight:700">Browse the shop →</a>
           </div>`;
      return;
    }

    inboxItemsEl.innerHTML = convs
      .map((c) => {
        const isActive = String(activePartnerId) === String(c.partnerId);
        const unread = parseInt(c.unread_count, 10) || 0;
        return `
        <div class="inbox_item ${isActive ? "active" : ""}" data-id="${c.partnerId}" data-name="${c.partnerName}">
          <div class="inbox_avatar">${initial(c.partnerName)}</div>
          <div class="inbox_info">
            <div class="inbox_name">${c.partnerName}</div>
            <div class="inbox_preview">${c.last_message || ""}</div>
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
    wsSend({ type: "join", partnerId });
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
         <div class="msg_time">${fmtTime(m.createdAt || Date.now())}</div>
       </div>`
    );
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function fetchMessages() {
    if (!activePartnerId) return;
    try {
      const qs = isCustomer
        ? `?retailerId=${encodeURIComponent(activePartnerId)}`
        : `?customerId=${encodeURIComponent(activePartnerId)}`;
      const json = await api("/messages" + qs);
      paintMessages(json.data || []);
    } catch {
      console.error("Chat history failed.");
    }
  }

  async function sendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
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
      } catch (e) {
        alert(e.message || "Could not send message.");
      }
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
      clearSession();
      window.location.href = isRetailer ? "/retailer/login.html" : "/nav/login.html";
    });
  }

  connectSocket();
  loadInbox();
}
