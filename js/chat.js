/*
 * ============================================================
 *  Sweet Feet v2 — js/chat.js
 *  Chat inbox for customers and retailers.
 *  Uses TypeScript backend via js/api.js (not PHP /API).
 * ============================================================
 */

import { api, getToken, clearSession } from "./api.js";

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
    return String(t).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
  }
  function initial(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  /** Build conversation list from flat messages */
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
    clearInterval(pollInterval);

    chatEmptyState?.classList.add("hidden");
    chatHeader?.classList.remove("hidden");
    chatMessages?.classList.remove("hidden");
    chatInputBar?.classList.remove("hidden");

    if (chatAvatarEl) chatAvatarEl.textContent = initial(partnerName);
    if (chatPartnerName) chatPartnerName.textContent = partnerName;
    if (chatPartnerSub) chatPartnerSub.textContent = isRetailer ? "Customer" : "Retailer · Sweet Feet";
    if (chatMessages) chatMessages.innerHTML = "";

    renderInbox(allConversations);
    await fetchMessages();
    pollInterval = setInterval(fetchMessages, 4000);
  }

  async function fetchMessages() {
    if (!activePartnerId) return;
    try {
      const qs = isCustomer
        ? `?retailerId=${encodeURIComponent(activePartnerId)}`
        : `?customerId=${encodeURIComponent(activePartnerId)}`;
      const json = await api("/messages" + qs);
      const msgs = json.data || [];
      if (!Array.isArray(msgs) || !msgs.length) return;

      const latest = msgs[msgs.length - 1];
      const lid = latest._id || latest.id;
      if (lid === lastMessageId) return;
      lastMessageId = lid;

      if (chatMessages) {
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
      loadInbox();
    } catch {
      console.error("Chat poll failed.");
    }
  }

  async function sendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text || !activePartnerId) return;

    chatInput.value = "";
    chatInput.disabled = true;

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

    chatInput.disabled = false;
    chatInput.focus();
  }

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
      clearInterval(pollInterval);
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        /* ignore */
      }
      clearSession();
      window.location.href = isRetailer ? "/retailer/login.html" : "/nav/login.html";
    });
  }

  loadInbox();
}
