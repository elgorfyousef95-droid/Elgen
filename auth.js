
"use strict";

(() => {
  const ACCESS_URL = "https://iirrwfativrsrxluxmwp.supabase.co/functions/v1/student-phone-access";
  const PUBLIC_KEY = "sb_publishable_cDCIPxK6-2NgbLmnTy1Lw_pW84RMam";

  const SESSION_KEY = "elgen_student_session";
  const ACCOUNT_KEY = "elgen_student_account";

  const path = location.pathname.toLowerCase();
  const isLoginPage = path.endsWith("login.html");

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function getToken(value) {
    if (typeof value === "string") return value;
    if (value && typeof value.token === "string") return value.token;
    return "";
  }

  async function refreshSession() {
    const token = getToken(read(SESSION_KEY));
    const account = read(ACCOUNT_KEY);

    if (!token || !account) {
      if (!isLoginPage) location.replace("./login.html");
      return false;
    }

    try {
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

      if (
        !response.ok ||
        result.ok !== true ||
        !result.session?.token ||
        !result.user
      ) {
        throw new Error(result.error || "انتهت جلسة الدخول");
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(result.session)
      );

      localStorage.setItem(
        ACCOUNT_KEY,
        JSON.stringify(result.user)
      );

      window.dispatchEvent(
        new CustomEvent("elgen:session-ready", {
          detail: result.user
        })
      );

      if (isLoginPage) {
        location.replace("./platform.html");
      }

      return true;

    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(ACCOUNT_KEY);

      if (!isLoginPage) {
        location.replace("./login.html");
      }

      return false;
    }
  }

  window.ELGEN_AUTH = {
    refresh: refreshSession,
    getToken: () => getToken(read(SESSION_KEY)),
    getAccount: () => read(ACCOUNT_KEY)
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      refreshSession,
      { once: true }
    );
  } else {
    refreshSession();
  }
})();
