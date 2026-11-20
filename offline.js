
"use strict";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        console.log("Elgen Offline Ready", registration.scope);
      })
      .catch((error) => {
        console.error("Elgen Offline Error:", error);
      });
  });
}
