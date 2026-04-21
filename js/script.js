"use strict";

const sections = document.querySelectorAll("section");
const aboutUs = document.querySelector(".about_us");
const product = document.querySelector(".product");

sections.forEach((section) => {
  section.classList.add("section--hidden");
});

// for the observer

function sectionCallBack(entries, observe) {
  const [entry] = entries;
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    entry.target.classList.remove("section--hidden");
    sectionObserver.unobserve(entry.target);
    console.log(entry.target);
  });
}

const sectionObserver = new IntersectionObserver(sectionCallBack, {
  root: null,
  threshold: 0.15,
});

sections.forEach(function (section) {
  sectionObserver.observe(section);
});

aboutUs.addEventListener("click", function (e) {
  e.preventDefault();

  sections[0].scrollIntoView({
    behavior: "smooth",
  });
});

let count = 0;

let oneTime = setInterval(() => {
  count++;

  if (count === 4) {
    count = 0;
  } else if (count >= 3) {
    product.style.transform = `translateX(20rem)`;
  } else if (count <= 3) {
    product.style.transform = `translateX(-20rem)`;
  }
}, 1000);

product.addEventListener("mouseover", function () {
  clearInterval(oneTime);
});

product.addEventListener("mouseout", function () {
  oneTime = setInterval(() => {
    count++;

    if (count === 4) {
      count = 0;
    } else if (count >= 3) {
      product.style.transform = `translateX(20rem)`;
    } else if (count <= 3) {
      product.style.transform = `translateX(-20rem)`;
    }
  }, 1000);
});
