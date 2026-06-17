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

{/*Initializes all functionality for the Study page, including generating 
  AI results, saving sessions and clearing the current study session*/}
function setupStudyPage() {
  const notes = document.querySelector("#studyNotes");
  if (!notes) return;

  const counter = document.querySelector("#characterCount");
  const generateButton = document.querySelector("#generateButton");
  const errorMessage = document.querySelector("#noteError");
  const loadingState = document.querySelector("#loadingState");
  const resultsSection = document.querySelector("#resultsSection");
  const saveButton = document.querySelector("#saveButton");
  const deleteButton = document.querySelector("#deleteButton");
  const saveMessage = document.querySelector("#saveMessage");

  const summaryOutput = document.querySelector("#summaryOutput");
  const keyPointsOutput = document.querySelector("#keyPointsOutput");
  const questionsOutput = document.querySelector("#questionsOutput");

  let latestStudyResult = null;

    // Update the live character counter as the user types
  notes.addEventListener("input", () => {
    counter.textContent = `${notes.value.length.toLocaleString()} / 10,000 characters`;
    if (notes.value.trim()) errorMessage.textContent = "";
  });

   // Sends study notes to the backend API and displays
  // the generated summary, key points and questions
  generateButton.addEventListener("click", async () => {
    const studyText = notes.value.trim();

    if (!studyText) {
      errorMessage.textContent = "Please enter some study notes before generating results.";
      notes.focus();
      resultsSection.classList.add("hidden");
      return;
    }

    errorMessage.textContent = "";
    resultsSection.classList.add("hidden");
    loadingState.classList.remove("hidden");
    generateButton.disabled = true;

    try {
      const response = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: studyText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI generation failed.");
      }

      latestStudyResult = {
        originalNotes: studyText,
        summary: data.summary,
        keyPoints: data.keyPoints,
        questions: data.questions
      };

      summaryOutput.textContent = data.summary;

      keyPointsOutput.innerHTML = "";
      data.keyPoints.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        keyPointsOutput.appendChild(li);
      });

      questionsOutput.innerHTML = "";
      data.questions.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong>Q:</strong> ${item.question}<br>
          <strong>A:</strong> ${item.answer}
        `;
        questionsOutput.appendChild(li);
      });

      resultsSection.classList.remove("hidden");
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error(error);
      errorMessage.textContent = "AI generation failed. Please check the backend and try again.";
    } finally {
      loadingState.classList.add("hidden");
      generateButton.disabled = false;
    }
  });

  // Saves the generated study session to the backend
  saveButton.addEventListener("click", async () => {
    if (!latestStudyResult) {
      saveMessage.textContent = "Generate study results first.";
      return;
    }

    try {
      const response = await fetch("/api/save-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(latestStudyResult)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Save failed.");
      }

      saveMessage.textContent = "Study session saved successfully.";
    } catch (error) {
      console.error(error);
      saveMessage.textContent = "Could not save study session.";
    }

    window.setTimeout(() => {
      saveMessage.textContent = "";
    }, 3500);
  });

  // Clears the current study results from the page
  // without affecting saved history
  deleteButton.addEventListener("click", () => {
    if (!latestStudyResult) {
      saveMessage.textContent = "No study session to delete.";
      window.setTimeout(() => {
        saveMessage.textContent = "";
      }, 3000);
      return;
    }

    latestStudyResult = null;
    summaryOutput.textContent = "";
    keyPointsOutput.innerHTML = "";
    questionsOutput.innerHTML = "";
    resultsSection.classList.add("hidden");
    saveMessage.textContent = "Study session deleted.";

    window.setTimeout(() => {
      saveMessage.textContent = "";
    }, 3000);
  });
}