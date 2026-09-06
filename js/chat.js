/*
 * ============================================================
 *  Sweet Feet v2 — js/chat.js
 *  Chat inbox logic for both sides of the conversation.
 *
 *  Handles:
 *    - Customer chat inbox (nav/chat.html)
 *    - Retailer chat inbox (retailer/chat.html)
 *
 *  How it works:
 *    - On page load, fetches the inbox summary (all conversations)
 *    - When a conversation is selected, fetches all messages
 *    - Polls the server every 4 seconds for new messages
 *    - Marks messages as read automatically when viewed
 *    - Send button and Enter key both submit new messages
 *    - Supports opening a pre-selected conversation from a URL
 *      query string (e.g. clicking "Chat" on a product card)
 *
 *  Guard: exits if neither #inboxList nor #chatPanel exist.
 *  Exports: initChat() — called by main.js
 * ============================================================
 */

export function initChat() {

  const inboxList  = document.getElementById("inboxList");
  const chatPanel  = document.getElementById("chatPanel");

  // Guard — only run on chat pages
  if (!inboxList || !chatPanel) return;

  // ── Determine which side we are on ───────────────────────
  // customer: logged in via sf_user_id in localStorage
  // retailer: logged in via sf_retailer_id in localStorage
  const isRetailer = !!localStorage.getItem("sf_retailer_id");
  const isCustomer = !!localStorage.getItem("sf_user_id");

  // Redirect if not logged in at all
  if (!isRetailer && !isCustomer) {
    window.location.href = "/sweetfeet/nav/login.html?next=" +
      encodeURIComponent(window.location.pathname + window.location.search);
    return;
  }

  // ── State ─────────────────────────────────────────────────
  let activePartnerId   = null; // retailer_id (for customer) or customer_id (for retailer)
  let activePartnerName = "";
  let lastMessageId     = null;
  let pollInterval      = null;
  let allConversations  = [];

  // ── URL params — pre-open a conversation ─────────────────
  // Used when customer clicks "Chat" on a product card
  const urlParams       = new URLSearchParams(window.location.search);
  const preRetailerId   = parseInt(urlParams.get("retailer_id"))   || null;
  const preRetailerName = urlParams.get("retailer_name")           || "";
  const preProductId    = parseInt(urlParams.get("product_id"))    || null;
  const preCustomerId   = parseInt(urlParams.get("customer_id"))   || null;
  const preCustomerName = urlParams.get("customer_name")           || "";

  // ── DOM refs ──────────────────────────────────────────────
  const inboxItemsEl    = document.getElementById("inboxItems");
  const inboxSearchEl   = document.getElementById("inboxSearch");
  const chatEmptyState  = document.getElementById("chatEmptyState");
  const chatHeader      = document.getElementById("chatHeader");
  const chatMessages    = document.getElementById("chatMessages");
  const chatInputBar    = document.getElementById("chatInputBar");
  const chatAvatarEl    = document.getElementById("chatAvatar");
  const chatPartnerName = document.getElementById("chatPartnerName");
  const chatPartnerSub  = document.getElementById("chatPartnerSub");
  const chatInput       = document.getElementById("chatInput");
  const chatSendBtn     = document.getElementById("chatSendBtn");

  // ── Helpers ───────────────────────────────────────────────
  function fmtTime(d) {
    return new Date(d).toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit"
    });
  }

  function escHtml(t) {
    return t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function initial(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  // ── Load inbox summary ────────────────────────────────────
  async function loadInbox() {
    try {
      const res = await fetch("/sweetfeet/api/messages?inbox=1");
      allConversations = await res.json();
      renderInbox(allConversations);

      // Auto-open pre-selected conversation from URL
      if (!activePartnerId) {
        if (!isRetailer && preRetailerId) {
          openConversation(preRetailerId, preRetailerName || "Retailer");
        } else if (isRetailer && preCustomerId) {
          openConversation(preCustomerId, preCustomerName || "Customer");
        }
      }
    } catch {
      if (inboxItemsEl) {
        inboxItemsEl.innerHTML = `
          <div style="padding:2rem;text-align:center;color:var(--clr-muted)">
            Could not load conversations.
          </div>`;
      }
    }
  }

  // ── Render inbox list ─────────────────────────────────────
  function renderInbox(convs) {
    if (!inboxItemsEl) return;

    if (!convs.length) {
      inboxItemsEl.innerHTML = isRetailer
        ? `<div style="padding:2rem;text-align:center;color:var(--clr-muted);font-size:1.3rem">
             No messages yet.
           </div>`
        : `<div style="padding:2rem;text-align:center;color:var(--clr-muted);font-size:1.3rem">
             No conversations yet.<br><br>
             <a href="/sweetfeet/nav/products.html"
               style="color:var(--clr-accent);font-weight:700">
               Browse the shop →
             </a>
           </div>`;
      return;
    }

    inboxItemsEl.innerHTML = convs.map(c => {
      // Partner info differs based on which side we are on
      const partnerId   = isRetailer ? c.customer_id  : c.retailer_id;
      const partnerName = isRetailer
        ? (c.customer_name || "Customer")
        : (c.retailer_name || "Retailer");
      const unread = parseInt(c.unread_count) || 0;
      const isActive = activePartnerId === partnerId;

      return `
        <div class="inbox_item ${isActive ? "active" : ""}"
          data-id="${partnerId}"
          data-name="${partnerName}">
          <div class="inbox_avatar">${initial(partnerName)}</div>
          <div class="inbox_info">
            <div class="inbox_name">${partnerName}</div>
            <div class="inbox_preview">${c.last_message || ""}</div>
          </div>
          ${unread > 0
            ? `<span class="inbox_unread">${unread}</span>`
            : ""}
        </div>`;
    }).join("");

    // Click handler for each inbox item
    inboxItemsEl.querySelectorAll(".inbox_item").forEach(item => {
      item.addEventListener("click", () => {
        openConversation(
          parseInt(item.dataset.id),
          item.dataset.name
        );
      });
    });
  }

  // ── Search/filter inbox ───────────────────────────────────
  if (inboxSearchEl) {
    inboxSearchEl.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = allConversations.filter(c => {
        const name = isRetailer
          ? (c.customer_name || "")
          : (c.retailer_name || "");
        return name.toLowerCase().includes(q);
      });
      renderInbox(filtered);
    });
  }

  // ── Open a conversation ───────────────────────────────────
  async function openConversation(partnerId, partnerName) {
    activePartnerId   = partnerId;
    activePartnerName = partnerName;
    lastMessageId     = null;

    // Stop any existing poll
    clearInterval(pollInterval);

    // Show the conversation panel
    if (chatEmptyState) chatEmptyState.classList.add("hidden");
    if (chatHeader)     chatHeader.classList.remove("hidden");
    if (chatMessages)   chatMessages.classList.remove("hidden");
    if (chatInputBar)   chatInputBar.classList.remove("hidden");

    // Update header
    if (chatAvatarEl)    chatAvatarEl.textContent    = initial(partnerName);
    if (chatPartnerName) chatPartnerName.textContent = partnerName;
    if (chatPartnerSub)  chatPartnerSub.textContent  = isRetailer
      ? "Customer"
      : "Retailer · Sweet Feet";

    // Clear old messages
    if (chatMessages) chatMessages.innerHTML = "";

    // Re-render inbox to show active state
    renderInbox(allConversations);

    // Load messages and start polling
    await fetchMessages();
    pollInterval = setInterval(fetchMessages, 4000);
  }

  // ── Fetch messages for active conversation ────────────────
  async function fetchMessages() {
    if (!activePartnerId) return;

    try {
      // Build URL based on which side we are on
      let url;
      if (isCustomer) {
        url = `/sweetfeet/api/messages?retailer_id=${activePartnerId}`;
        // Include product_id on the first load if we came from a product card
        if (preProductId && lastMessageId === null) {
          url += `&product_id=${preProductId}`;
        }
      } else {
        url = `/sweetfeet/api/messages?customer_id=${activePartnerId}`;
      }

      const res  = await fetch(url);
      const msgs = await res.json();

      if (!Array.isArray(msgs) || !msgs.length) return;

      // Only re-render if there are new messages
      const latest = msgs[msgs.length - 1];
      if (latest.id === lastMessageId) return;
      lastMessageId = latest.id;

      if (chatMessages) {
        chatMessages.innerHTML = msgs.map(m => {
          // "mine" = sent by the currently logged-in side
          const isMine = isRetailer
            ? m.sender_type === "retailer"
            : m.sender_type === "customer";

          return `
            <div class="msg_row ${isMine ? "msg_mine" : "msg_theirs"}">
              <div class="msg_bubble">${escHtml(m.message)}</div>
              <div class="msg_time">${fmtTime(m.created_at)}</div>
            </div>`;
        }).join("");

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      // Refresh inbox to update unread counts
      loadInbox();

    } catch {
      // Poll silently — don't interrupt the user
      console.error("Chat poll failed.");
    }
  }

  // ── Send a message ────────────────────────────────────────
  async function sendMessage() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text || !activePartnerId) return;

    chatInput.value    = "";
    chatInput.disabled = true;

    const payload = { message: text };

    if (isCustomer) {
      payload.retailer_id = activePartnerId;
      // Include product_id on the first message if from product card
      if (preProductId && lastMessageId === null) {
        payload.product_id = preProductId;
      }
    } else {
      payload.customer_id = activePartnerId;
    }

    try {
      const res  = await fetch("/sweetfeet/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        await fetchMessages(); // immediately show the sent message
      } else {
        alert(data.error || "Could not send message.");
      }
    } catch {
      alert("Network error. Please check your connection.");
    }

    chatInput.disabled = false;
    chatInput.focus();
  }

  // ── Send button and Enter key ─────────────────────────────
  if (chatSendBtn) {
    chatSendBtn.addEventListener("click", sendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ── Retailer logout (on retailer/chat.html) ───────────────
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      clearInterval(pollInterval);
      await fetch("/sweetfeet/api/auth/retailer/logout", { method: "POST" });
      localStorage.removeItem("sf_retailer_id");
      localStorage.removeItem("sf_retailer_name");
      window.location.href = "/sweetfeet/retailer/login.html";
    });
  }

  // ── Init ──────────────────────────────────────────────────
  loadInbox();
}
