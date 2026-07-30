const LOJANOVA_LANGUAGES = "es,en,zh-CN,ar,fr,de";

function setTranslateCookie(language) {
  const value = language === "es" ? "" : `/es/${language}`;
  const maxAge = language === "es" ? "Max-Age=0" : "Max-Age=31536000";
  document.cookie = `googtrans=${value}; Path=/; ${maxAge}; SameSite=Lax`;
  document.cookie = `googtrans=${value}; Path=/; Domain=.prefecturalojanova.com; ${maxAge}; SameSite=Lax`;
}

function getCurrentLanguage() {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/es\/([^;]+)/);
  return match?.[1] || "es";
}

function applyGoogleTranslate(language) {
  const combo = document.querySelector(".goog-te-combo");
  if (!combo || language === "es") return;
  combo.value = language;
  combo.dispatchEvent(new Event("change"));
}

function setupLanguageSelector() {
  const selector = document.getElementById("languageSelect");
  if (!selector) return;

  selector.value = getCurrentLanguage();
  selector.addEventListener("change", () => {
    setTranslateCookie(selector.value);
    window.location.reload();
  });
}

window.googleTranslateElementInit = function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: "es",
    includedLanguages: LOJANOVA_LANGUAGES,
    autoDisplay: false
  }, "google_translate_element");

  setTimeout(() => applyGoogleTranslate(getCurrentLanguage()), 800);
};

window.lojanovaRefreshTranslation = function lojanovaRefreshTranslation() {
  setTimeout(() => applyGoogleTranslate(getCurrentLanguage()), 500);
};

setupLanguageSelector();
