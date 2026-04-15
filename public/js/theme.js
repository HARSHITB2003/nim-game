function applyTheme() {
  const saved = localStorage.getItem("nim-theme");
  const validThemes = ["dark", "green", "amber"];
  const theme = validThemes.includes(saved) ? saved : "dark";

  // remove existing theme-* classes
  document.body.className = document.body.className
    .replace(/theme-\w+/g, "")
    .trim();
  document.body.classList.add("theme-" + theme);
}

function setTheme(theme) {
  if (!["dark", "green", "amber"].includes(theme)) return;

  document.body.className = document.body.className
    .replace(/theme-\w+/g, "")
    .trim();
  document.body.classList.add("theme-" + theme);
  localStorage.setItem("nim-theme", theme);
}

// export as globals so your menu.js / inline scripts can call them
window.applyTheme = applyTheme;
window.setTheme = setTheme;

// run on page load
applyTheme();
