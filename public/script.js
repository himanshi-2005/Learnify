document.addEventListener("DOMContentLoaded", () => {
  setActiveNavigation();
  setupMobileNavigation();
  setupStudyPage();
  loadHistory();
});

// Creates and controls the confirmation modal
// used for deleting study sessions or history items.
function setupConfirmModal() {
  const modal = document.getElementById("confirmModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmBtn = document.getElementById("modalConfirmBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");
  const overlay = document.getElementById("modalOverlay");

  let resolveFn = null;

  function showModal(title, message, confirmLabel = "Delete") {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = confirmLabel;
    modal.classList.remove("hidden");
    overlay.classList.remove("hidden");
    cancelBtn.focus();

    return new Promise((resolve) => {
      resolveFn = resolve;
    });
  }

  confirmBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    resolveFn?.(true);
  });

  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    resolveFn?.(false);
  });

  overlay.addEventListener("click", () => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    resolveFn?.(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
      overlay.classList.add("hidden");
      resolveFn?.(false);
    }
  });

  return { showModal };
}

// Highlights the current page in the navigation menu
function setActiveNavigation() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

// Handles opening and closing the mobile navigation menu
function setupMobileNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".main-nav");
  if (!toggle || !navigation) return;

  toggle.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Close" : "Menu";
  });
}