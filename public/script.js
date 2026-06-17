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

// Clears the current study results from the page
// without affecting saved history
async function loadHistory() {
  const historyList = document.querySelector("#historyList");
  const historyMessage = document.querySelector("#historyMessage");
  const clearHistoryButton = document.querySelector("#clearHistoryButton");
  const { showModal } = setupConfirmModal();

  if (!historyList || !historyMessage) return;

   // Handles deleting every saved study session
  if (clearHistoryButton) {
    clearHistoryButton.onclick = async () => {
      const confirmed = await showModal(
        "Delete all history",
        "This will permanently remove all saved study sessions. This can't be undone.",
        "Delete all"
      );
      if (!confirmed) return;

      // Retrieve saved study history from the backend API
      try {
        const response = await fetch("/api/history", { method: "DELETE" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not delete history.");
        }

        historyList.innerHTML = "";
        historyMessage.textContent = "All study history deleted.";
      } catch (error) {
        console.error(error);
        historyMessage.textContent = error.message;
      }
    };
  }

  try {
    const response = await fetch("/api/history");
    const sessions = await response.json();

    if (!response.ok) {
      throw new Error("Could not load history.");
    }

    historyList.innerHTML = "";

    if (!sessions.length) {
      historyMessage.textContent = "No saved study sessions yet.";
      return;
    }

    historyMessage.textContent = "";

    // Create a visual card for each saved study session
    sessions.forEach((session) => {
      const card = document.createElement("article");
      card.className = "history-card";

      const createdAt = session.createdAt ? new Date(session.createdAt) : null;
      const date = createdAt
        ? createdAt.toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
          })
        : "Saved session";

      const keyPointCount = session.keyPoints?.length || 0;
      const topic = getHistoryTopic(session.originalNotes);
      const importanceLevel = session.importanceLevel || (session.important ? "very" : "none");
      const importanceLabel =
        importanceLevel === "very"
          ? "Very Important"
          : importanceLevel === "less"
          ? "Less Important"
          : "";

      card.innerHTML = `
        <div class="history-top">
          ${importanceLabel ? `<span class="important-badge ${importanceLevel}">${importanceLabel}</span>` : "<span></span>"}
          <span class="date">${date}</span>
        </div>

        <h2>${topic}</h2>
        <p>${session.summary || "No summary available."}</p>

        <div class="tag-row">
          <span>${keyPointCount} key points</span>
          <span>5 questions</span>
        </div>

        <div class="history-card-actions">
          <button class="text-button details-button" type="button">View Details</button>
          <div class="history-menu">
            <button class="menu-dots" type="button" aria-label="History importance menu" aria-expanded="false">...</button>
            <div class="history-menu-panel hidden">
              <button type="button" data-importance="very" data-file-name="${session.fileName || ""}">Very Important</button>
              <button type="button" data-importance="less" data-file-name="${session.fileName || ""}">Less Important</button>
              <button type="button" data-importance="none" data-file-name="${session.fileName || ""}">Remove Pin</button>
            </div>
          </div>
          <button class="text-button delete-history-button" type="button" data-file-name="${session.fileName || ""}">
            Delete
          </button>
        </div>

        <div class="history-details hidden">
          <strong>Key Points</strong>
                <ul class="styled-list">
                  ${(Array.isArray(session.keyPoints) ? session.keyPoints : [])
                    .map((point) => `<li>${point}</li>`)
                    .join("")}
                </ul>
          <strong>Practice Questions</strong>
          <ol>
            ${session.questions
              .map((item) => {
                const q = typeof item === "string" ? item : (item.question ?? "Question unavailable");
                const a = typeof item === "string" ? "Answer not available." : (item.answer ?? "Answer unavailable");
                return `
                  <li>
                    <strong>Q:</strong> ${q}<br>
                    <strong>A:</strong> ${a}
                  </li>
                `;
              })
              .join("")}
          </ol>
        </div>
      `;

      historyList.appendChild(card);
    });

    // Toggle the visibility of detailed study information.
    historyList.querySelectorAll(".details-button").forEach((button) => {
      button.addEventListener("click", () => {
        const details = button.closest(".history-card").querySelector(".history-details");
        details.classList.toggle("hidden");
        button.textContent = details.classList.contains("hidden") ? "View Details" : "Hide Details";
      });
    });
   
    // Show or hide the importance menu for a history card
    historyList.querySelectorAll(".menu-dots").forEach((button) => {
      button.addEventListener("click", () => {
        const panel = button.nextElementSibling;
        const isOpen = !panel.classList.contains("hidden");

        historyList.querySelectorAll(".history-menu-panel").forEach((menu) => {
          menu.classList.add("hidden");
        });

        panel.classList.toggle("hidden", isOpen);
        button.setAttribute("aria-expanded", String(!isOpen));
      });
    });

    // Update the importance level (Very Important,
    // Less Important or Remove Pin) for a study session
    historyList.querySelectorAll(".history-menu-panel button").forEach((button) => {
      button.addEventListener("click", async () => {
        const fileName = button.dataset.fileName;
        const importanceLevel = button.dataset.importance;
        if (!fileName) return;

        try {
          const response = await fetch(`/api/history/${encodeURIComponent(fileName)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ importanceLevel })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Could not update study session.");
          }

          historyMessage.textContent = data.message;
          loadHistory();
        } catch (error) {
          console.error(error);
          historyMessage.textContent = error.message;
        }
      });
    });

    // Delete an individual study session after confirmation
    historyList.querySelectorAll(".delete-history-button").forEach((button) => {
      button.addEventListener("click", async () => {
        const fileName = button.dataset.fileName;
        if (!fileName) return;

        const confirmed = await showModal(
          "Delete study session",
          "This session will be permanently deleted.",
          "Delete"
        );
        if (!confirmed) return;

        try {
          const response = await fetch(`/api/history/${encodeURIComponent(fileName)}`, {
            method: "DELETE"
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Could not delete study session.");
          }

          button.closest(".history-card").remove();
          historyMessage.textContent = historyList.children.length
            ? "Study session deleted."
            : "No saved study sessions yet.";
        } catch (error) {
          // Display an error if history cannot be loaded.
          console.error(error);
          historyMessage.textContent = error.message;
        }
      });
    });
  } catch (error) {
    console.error(error);
    historyMessage.textContent = error.message;
  }
}

{/*Extracts a short title from the first non-empty line
 of the original study notes for display in history cards*/}
 
function getHistoryTopic(notes) {
  const firstLine = String(notes || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "Saved Topic";
  return firstLine.length > 58 ? `${firstLine.slice(0, 55)}...` : firstLine;
}
