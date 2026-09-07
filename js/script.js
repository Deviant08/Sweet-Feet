"use strict";

const sections = document.querySelectorAll("section");
const aboutUs = document.querySelector(".about_us");
const product = document.querySelector(".product");
const checkOut = document.querySelectorAll(".checkout");
const loginForm = document.querySelector(".form__container");
const exitContainer = document.querySelector(".exit");
const eachProduct = document.querySelectorAll(".pd");

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

function showSignUpForm(e) {
  e.preventDefault();

  loginForm.classList.remove("hidden");
  exitContainer.classList.remove("hidden");
}

function removeSignUpForm(e) {
  e.preventDefault();

  loginForm.classList.add("hidden");
  exitContainer.classList.add("hidden");
}

checkOut.forEach((bnt) => {
  bnt.addEventListener("click", showSignUpForm);
});

exitContainer.addEventListener("click", removeSignUpForm);

eachProduct.forEach((pd) => {
  pd.addEventListener("click", showSignUpForm);
});
