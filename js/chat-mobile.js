/* Mobile chat: list <-> full-screen thread */
(function () {
  function layout() {
    return document.querySelector(".chat_layout");
  }
  function openThread() {
    layout()?.classList.add("thread-open");
  }
  function closeThread() {
    layout()?.classList.remove("thread-open");
  }
  document.addEventListener("click", function (e) {
    const item = e.target.closest(".inbox_item");
    if (item) {
      setTimeout(openThread, 0);
    }
    if (e.target.closest("#chatBackBtn, .chat_back")) {
      e.preventDefault();
      e.stopPropagation();
      closeThread();
      document.getElementById("chatHeader")?.classList.add("hidden");
      document.getElementById("chatMessages")?.classList.add("hidden");
      document.getElementById("chatInputBar")?.classList.add("hidden");
      document.getElementById("chatEmptyState")?.classList.remove("hidden");
      const form = document.getElementById("composeForm");
      if (form) form.style.display = "none";
    }
  }, true);
})();
