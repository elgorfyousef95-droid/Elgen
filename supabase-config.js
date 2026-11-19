
"use strict";

/* إعداد الاتصال المركزي بمنصة الجنايني */
(() => {
  const projectUrl = "https://iirrwfativrsrxluxmwp.supabase.co";
  const publishableKey = "sb_publishable_cDCIPKxT6-2NgbLmnTy1Lw_pW84RMam";

  window.ELGEN_SUPABASE = Object.freeze({
    projectUrl: projectUrl,
    publishableKey: publishableKey,
    functionUrl: projectUrl + "/functions/v1/student-phone-access"
  });
})();
