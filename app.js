
"use strict";

/* =========================================
   ELGEN PLATFORM
   Main Application
   ========================================= */

const $ = (id) => document.getElementById(id);

const PAGE_TITLES = {
  home: "الرئيسية",
  courses: "الكورسات والدروس",
  exams: "الاختبارات",
  lectures: "المحاضرات",
  progress: "تقدمي الدراسي",
  announcements: "الإعلانات والتنبيهات",
  profile: "ملفي الشخصي",
  help: "المساعدة والدعم"
};

let currentPage = "home";
const pageHistory = [];
let toastTimer = null;

/* =========================================
   STORAGE
   ========================================= */

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function getStudentAccount() {
  const account = readStorage("elgen_student_account");

  if (!account || typeof account !== "object") {
    return null;
  }

  return account.user && typeof account.user === "object"
    ? account.user
    : account;
}

/* =========================================
   TOAST NOTIFICATIONS
   ========================================= */

function showToast(message) {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/* =========================================
   NAVIGATION
   ========================================= */

function updateNavigation(page) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.view === page
    );
  });
}

function showView(page, options = {}) {
  const remember = options.remember !== false;
  const updateAddress = options.updateAddress !== false;

  if (!PAGE_TITLES[page]) {
    page = "home";
  }

  if (remember && page !== currentPage) {
    pageHistory.push(currentPage);
  }

  currentPage = page;

  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle(
      "active",
      section.id === "view-" + page
    );
  });

  updateNavigation(page);

  const heading = $("pageTitle");

  if (heading) {
    heading.textContent = PAGE_TITLES[page];
  }

  closeMenu();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (updateAddress) {
    history.replaceState(
      { page },
      "",
      "#" + page
    );
  }
}

function goBack() {
  const previousPage = pageHistory.pop();

  showView(previousPage || "home", {
    remember: false
  });
}

/* =========================================
   SIDE MENU
   ========================================= */

function openMenu() {
  document.body.classList.add("menu-open");
}

function closeMenu() {
  document.body.classList.remove("menu-open");
}

function toggleMenu() {
  document.body.classList.toggle("menu-open");
}

/* =========================================
   STUDENT INFORMATION
   ========================================= */

function getValue(account, keys) {
  for (const key of keys) {
    const value = account?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return "—";
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function setStudentPhoto(id, photo) {
  const image = $(id);

  if (!image || !photo) return;

  if (!/^(https?:\/\/|data:image\/)/i.test(photo)) {
    return;
  }

  image.onerror = () => {
    image.onerror = null;
    image.src = "./85.jpg";
  };

  image.src = photo;
}

function loadStudentAccount() {
  const account = getStudentAccount();

  if (!account) {
    setText("sideName", "حساب الطالب");
    setText("sideCode", "الملف الشخصي");
    setText("topName", "حسابي");
    return;
  }

  const name = getValue(account, [
    "full_name",
    "name",
    "student_name"
  ]);

  const code = getValue(account, [
    "user_code",
    "student_code",
    "code"
  ]);

  const phone = getValue(account, [
    "phone",
    "phone_number"
  ]);

  const education = getValue(account, [
    "education_type",
    "education_stage"
  ]);

  const grade = getValue(account, [
    "school_grade",
    "grade_name",
    "grade"
  ]);

  const governorate = getValue(account, [
    "governorate"
  ]);

  const center = getValue(account, [
    "education_center",
    "center"
  ]);

  const village = getValue(account, [
    "village"
  ]);

  setText("sideName", name);
  setText("sideCode", code);
  setText("topName", name);

  setText("profileName", name);
  setText("profileCode", "كود الطالب: " + code);
  setText("profilePhone", phone);
  setText("profileEducation", education);
  setText("profileGrade", grade);
  setText("profileGovernorate", governorate);
  setText("profileCenter", center);
  setText("profileVillage", village);

  if (name !== "—") {
    setText(
      "welcomeText",
      "أهلاً يا " + name + "، نتمنى لك رحلة تعليمية ناجحة."
    );
  }

  const photo = getValue(account, [
    "avatar_url",
    "photo_url",
    "profile_image",
    "image_url",
    "photo_base64"
  ]);

  if (photo !== "—") {
    [
      "sideAvatar",
      "topAvatar",
      "profileAvatar"
    ].forEach((id) => {
      setStudentPhoto(id, photo);
    });
  }
}

/* =========================================
   BUTTON EVENTS
   ========================================= */

function connectButtons() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.open);
    });
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", goBack);
  });

  const homeButton = $("homeBtn");

  if (homeButton) {
    homeButton.addEventListener("click", () => {
      showView("home");
    });
  }

  const menuButton = $("menuBtn");

  if (menuButton) {
    menuButton.addEventListener("click", toggleMenu);
  }

  const overlay = $("overlay");

  if (overlay) {
    overlay.addEventListener("click", closeMenu);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

/* =========================================
   DATE
   ========================================= */

function updateYear() {
  document.querySelectorAll(".year").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
}

/* =========================================
   BROWSER HISTORY
   ========================================= */

function connectBrowserHistory() {
  window.addEventListener("popstate", () => {
    const page = location.hash.replace("#", "");

    showView(
      PAGE_TITLES[page] ? page : "home",
      {
        remember: false,
        updateAddress: false
      }
    );
  });
}

/* =========================================
   ACCOUNT UPDATES
   ========================================= */

function connectAccountUpdates() {
  window.addEventListener("storage", (event) => {
    if (
      event.key === "elgen_student_account" ||
      event.key === null
    ) {
      loadStudentAccount();
    }
  });

  window.addEventListener("focus", () => {
    loadStudentAccount();
  });
}

/* =========================================
   START APPLICATION
   ========================================= */

function initializePlatform() {
  connectButtons();
  connectBrowserHistory();
  connectAccountUpdates();

  updateYear();
  loadStudentAccount();

  const requestedPage = location.hash.replace("#", "");

  showView(
    PAGE_TITLES[requestedPage] ? requestedPage : "home",
    {
      remember: false,
      updateAddress: false
    }
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializePlatform,
    { once: true }
  );
} else {
  initializePlatform();
}
