"use strict";

const sections = document.querySelectorAll("section");

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

const slides = document.querySelectorAll(`.slide`);
let curSlide = 0;
const maxSlide = slides.length - 1;

slides.forEach((slide, i) => {
  slide.style.transform = `transformX(${100 * i}%)`;
});

document.addEventListener("keydown", function (e) {
  if (e.key == "RightArrow") {
    curSlide++;
    slides.forEach((slide, i) => {
      slide.style.transform = `translateX(${100 * (i - curSlide)}%)`;
    });
  }
});
