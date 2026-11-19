
"use strict";

(() => {
  const ACCESS_URL =
    "https://iirrwfativrsrxluxmwp.supabase.co/functions/v1/student-phone-access";

  const PUBLIC_KEY =
    "sb_publishable_cDCIPKx6-2NgbLmnTy1Lw_pW84RMam";

  const SESSION_KEY = "elgen_student_session";
  const ACCOUNT_KEY = "elgen_student_account";

  const path = location.pathname.toLowerCase();
  const isLoginPage =
    path.endsWith("/login.html") || path.endsWith("login.html");

  let refreshPromise = null;
  let splashElement = null;

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  }

  function getToken(value) {
    if (typeof value === "string") return value.trim();
    if (value && typeof value.token === "string") {
      return value.token.trim();
    }
    return "";
  }

  function getAccount() {
    const account = read(ACCOUNT_KEY);
    return account && typeof account === "object" ? account : null;
  }

  function saveSession(session) {
    if (!session || !session.token) {
      throw new Error("بيانات الجلسة غير مكتملة.");
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function saveAccount(account) {
    if (!account || typeof account !== "object") {
      throw new Error("بيانات الحساب غير مكتملة.");
    }
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }

  function dispatch(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // شاشة تحميل خفيفة تظهر فقط للحسابات التي سبق تأكيدها.
  function showAccountSplash() {
    if (!isLoginPage || splashElement) return;

    const page = document.querySelector(".page");
    if (page) page.style.display = "none";

    const style = document.createElement("style");
    style.id = "elgen-splash-style";
    style.textContent = `
      #elgen-account-splash {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background:
          radial-gradient(ellipse at 50% 20%, rgba(119,101,255,.20), transparent 48%),
          linear-gradient(145deg, #10172e, #090d1b 70%);
        font-family: Cairo, sans-serif;
        direction: rtl;
        color: #fff;
      }
      #elgen-account-splash .splash-card {
        width: min(100%, 270px);
        padding: 27px 20px;
        text-align: center;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 23px;
        background: rgba(255,255,255,.055);
        box-shadow: 0 18px 55px rgba(0,0,0,.25);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }
      #elgen-account-splash .splash-icon {
        width: 52px;
        height: 52px;
        margin: 0 auto 13px;
        display: grid;
        place-items: center;
        border-radius: 17px;
        color: #c1b8ff;
        background: linear-gradient(145deg,rgba(139,124,255,.25),rgba(87,216,232,.12));
        border: 1px solid rgba(255,255,255,.16);
      }
      #elgen-account-splash .splash-icon svg {
        width: 27px;
        height: 27px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      #elgen-account-splash .splash-title {
        font-size: 15px;
        font-weight: 900;
        margin-bottom: 5px;
      }
      #elgen-account-splash .splash-subtitle {
        font-size: 10px;
        color: #b9c3dc;
      }
      #elgen-account-splash .splash-spinner {
        width: 23px;
        height: 23px;
        margin: 17px auto 0;
        border: 2px solid rgba(255,255,255,.15);
        border-top-color: #9d91ff;
        border-left-color: #57d8e8;
        border-radius: 50%;
        animation: elgenSpin .8s linear infinite;
      }
      @keyframes elgenSpin {
        to { transform: rotate(360deg); }
      }
      @media(prefers-reduced-motion:reduce) {
        #elgen-account-splash .splash-spinner {
          animation-duration: 2s;
        }
      }
    `;
    document.head.appendChild(style);

    splashElement = document.createElement("div");
    splashElement.id = "elgen-account-splash";
    splashElement.innerHTML = `
      <div class="splash-card">
        <div class="splash-icon">
          <svg viewBox="0 0 24 24">
            <path d="M3 9l9-5 9 5-9 5-9-5z"/>
            <path d="M7 11.5V16c3.3 2.5 6.7 2.5 10 0v-4.5"/>
            <path d="M21 9v6"/>
          </svg>
        </div>
        <div class="splash-title">أهلًا بعودتك</div>
        <div class="splash-subtitle">جاري تجهيز حسابك وفتح منصتك...</div>
        <div class="splash-spinner"></div>
      </div>
    `;
    document.body.appendChild(splashElement);
  }

  function hideAccountSplash() {
    if (splashElement) {
      splashElement.remove();
      splashElement = null;
    }

    const style = document.getElementById("elgen-splash-style");
    if (style) style.remove();

    const page = document.querySelector(".page");
    if (page) page.style.display = "";
  }

  async function requestRefresh(token) {
    const response = await fetch(ACCESS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": PUBLIC_KEY
      },
      body: JSON.stringify({
        action: "refresh",
        session_token: token
      })
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      const error = new Error(
        result.error || "انتهت جلسة الدخول أو تم إيقاف الحساب."
      );
      error.authInvalid = true;
      throw error;
    }

    if (!response.ok) {
      throw new Error(result.error || "الخدمة غير متاحة مؤقتًا.");
    }

    if (
      result.ok !== true ||
      !result.session ||
      !result.session.token ||
      !result.user
    ) {
      throw new Error("تعذر التأكد من الجلسة حاليًا.");
    }

    return result;
  }

  async function refreshSession() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      const storedSession = read(SESSION_KEY);
      const token = getToken(storedSession);
      const account = getAccount();

      if (!token || !account) {
        hideAccountSplash();

        if (!isLoginPage) {
          location.replace("./login.html");
        }
        return false;
      }

      if (isLoginPage) {
        showAccountSplash();
      }

      dispatch("elgen:session-checking");

      try {
        const result = await requestRefresh(token);

        saveSession(result.session);
        saveAccount(result.user);

        dispatch("elgen:session-ready", result.user);

        if (isLoginPage) {
          location.replace("./platform.html");
        }

        return true;

      } catch (error) {
        if (error.authInvalid === true) {
          clearSession();
          hideAccountSplash();

          dispatch("elgen:session-expired", {
            message: error.message
          });

          if (!isLoginPage) {
            location.replace("./login.html");
          }

          return false;
        }

        // عند انقطاع الإنترنت لا نحذف بيانات الجلسة.
        hideAccountSplash();

        dispatch("elgen:session-offline", {
          message: error.message || "تعذر الاتصال بالخدمة."
        });

        return false;

      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  window.ELGEN_AUTH = {
    refresh: refreshSession,

    getToken: () => getToken(read(SESSION_KEY)),

    getAccount,

    isLoggedIn: () => Boolean(
      getToken(read(SESSION_KEY)) && getAccount()
    ),

    logout: () => {
      clearSession();
      dispatch("elgen:logged-out");
      location.replace("./login.html");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refreshSession, {
      once: true
    });
  } else {
    refreshSession();
  }
})();
