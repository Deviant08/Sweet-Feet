/* Mobile menu for admin and retailer dashboards. Built from the existing sidebar. */
(function () {
  const sidebar = document.querySelector(".sidebar_nav");
  const main = document.querySelector(".main_content");
  if (!sidebar || !main || document.querySelector(".dash_bar")) return;

  const logo = sidebar.querySelector(".sidebar_logo");
  const bar = document.createElement("div");
  bar.className = "dash_bar";
  const logoHref = logo ? logo.getAttribute("href") || "/index.html" : "/index.html";
  bar.innerHTML =
    '<a class="sidebar_logo" href="' +
    logoHref +
    '">' +
    (logo ? logo.innerHTML : "<span>Sweet Feet</span>") +
    "</a>" +
    '<button type="button" class="dash_menu_btn" aria-label="Open menu" aria-expanded="false">' +
    '<svg class="hi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>' +
    "</button>";

  const backdrop = document.createElement("div");
  backdrop.className = "dash_backdrop";
  backdrop.hidden = true;

  const drawer = document.createElement("nav");
  drawer.className = "dash_drawer";
  drawer.setAttribute("aria-label", "Menu");
  drawer.hidden = true;

  sidebar.querySelectorAll(".sidebar_label, .sidebar_divider, a.sidebar_link").forEach(function (el) {
    if (el.classList.contains("sidebar_divider")) {
      const line = document.createElement("div");
      line.className = "sidebar_divider";
      drawer.appendChild(line);
      return;
    }
    if (el.classList.contains("sidebar_label")) {
      const label = document.createElement("span");
      label.className = "sidebar_label";
      label.textContent = (el.textContent || "").trim();
      drawer.appendChild(label);
      return;
    }
    const link = document.createElement("a");
    link.className = "sidebar_link" + (el.classList.contains("active") ? " active" : "");
    link.href = el.getAttribute("href") || "#";
    if (el.getAttribute("target")) link.target = el.getAttribute("target");
    if (el.getAttribute("rel")) link.rel = el.getAttribute("rel");
    link.textContent = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (el.id === "logoutBtn") {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        el.click();
      });
    }
    drawer.appendChild(link);
  });

  const btn = bar.querySelector(".dash_menu_btn");
  function setOpen(open) {
    drawer.hidden = !open;
    backdrop.hidden = !open;
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.style.overflow = open ? "hidden" : "";
  }

  btn.addEventListener("click", function () {
    setOpen(!drawer.classList.contains("open"));
  });
  backdrop.addEventListener("click", function () {
    setOpen(false);
  });

  main.prepend(backdrop);
  main.prepend(drawer);
  main.prepend(bar);
})();
