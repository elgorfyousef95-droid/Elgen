
"use strict";

(() => {
  const ACCESS_URL =
    "https://iirrwfativrsrxluxmwp.supabase.co/functions/v1/student-phone-access";

  const PUBLIC_KEY =
    "sb_publishable_cDCIPxK6-2NgbLmnTy1Lw_pW84RMam";

  const SESSION_KEY = "elgen_student_session";
  const ACCOUNT_KEY = "elgen_student_account";

  const path = location.pathname.toLowerCase();

  const isLoginPage = path.endsWith("/login.html") ||
                      path.endsWith("login.html");

  let refreshPromise = null;

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
    if (typeof value === "string") {
      return value.trim();
    }

    if (value && typeof value.token === "string") {
      return value.token.trim();
    }

    return "";
  }

  function getAccount() {
    const account = read(ACCOUNT_KEY);

    if (!account || typeof account !== "object") {
      return null;
    }

    return account;
  }

  function saveSession(session) {
    if (!session || !session.token) {
      throw new Error("بيانات الجلسة غير مكتملة.");
    }

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(session)
    );
  }

  function saveAccount(account) {
    if (!account || typeof account !== "object") {
      throw new Error("بيانات الحساب غير مكتملة.");
    }

    localStorage.setItem(
      ACCOUNT_KEY,
      JSON.stringify(account)
    );
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  }

  function dispatch(name, detail = {}) {
    window.dispatchEvent(
      new CustomEvent(name, { detail })
    );
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

    /*
      حذف الجلسة مسموح فقط عندما يؤكد السيرفر
      أن الجلسة غير صالحة أو أن الحساب موقوف.
    */

    if (response.status === 401) {
      const error = new Error(
        result.error || "انتهت جلسة الدخول أو تم إيقاف الحساب."
      );

      error.authInvalid = true;

      throw error;
    }

    /*
      أخطاء السيرفر الأخرى لا تعني أن الحساب انتهى.
    */

    if (!response.ok) {
      throw new Error(
        result.error || "الخدمة غير متاحة مؤقتًا."
      );
    }

    if (
      result.ok !== true ||
      !result.session ||
      !result.session.token ||
      !result.user
    ) {
      throw new Error(
        "تعذر التأكد من الجلسة حاليًا."
      );
    }

    return result;
  }

  async function refreshSession() {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const storedSession = read(SESSION_KEY);
      const token = getToken(storedSession);
      const account = getAccount();

      /*
        في صفحة تسجيل الدخول:
        لا نحول الطالب للمنصة إلا لو عنده
        جلسة صالحة وحساب تم تأكيده بالفعل.
      */

      if (!token || !account) {
        if (!isLoginPage) {
          location.replace("./login.html");
        }

        return false;
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

        /*
          لا نمسح البيانات عند انقطاع الإنترنت
          أو أخطاء السيرفر المؤقتة.
        */

        if (error.authInvalid === true) {
          clearSession();

          dispatch("elgen:session-expired", {
            message: error.message
          });

          if (!isLoginPage) {
            location.replace("./login.html");
          }

          return false;
        }

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

    getToken: () => {
      return getToken(read(SESSION_KEY));
    },

    getAccount,

    isLoggedIn: () => {
      return Boolean(
        getToken(read(SESSION_KEY)) && getAccount()
      );
    },

    logout: () => {
      clearSession();

      dispatch("elgen:logged-out");

      location.replace("./login.html");
    }
  };

  /*
    تشغيل التحقق عند تحميل الصفحة.
  */

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
