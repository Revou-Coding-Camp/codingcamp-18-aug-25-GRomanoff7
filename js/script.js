(function () {
  const STORAGE_KEY = "todo_items_v1";
  const qs = (sel, el = document) => el.querySelector(sel);
  const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const state = {
    items: [],
    selection: "all", // today | upcoming | all | sort_oldest | sort_newest
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      state.items = Array.isArray(arr)
        ? arr.filter((v) => v && v.title && v.date)
        : [];
    } catch {
      state.items = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {}
  }

  function genId() {
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  function todayYMD() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function sortAsc(a, b) {
    return a.date > b.date ? 1 : a.date < b.date ? -1 : 0;
  }
  function sortDesc(a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  }

  function getList() {
    const ty = todayYMD();
    const items = [...state.items];
    switch (state.selection) {
      case "today":
        return items.filter((t) => t.date === ty).sort(sortDesc);
      case "upcoming":
        return items.filter((t) => t.date >= ty).sort(sortAsc);
      case "sort_oldest":
        return items.sort(sortAsc);
      case "sort_newest":
        return items.sort(sortDesc);
      case "all":
      default:
        return items.sort(sortDesc);
    }
  }

  function renderList() {
    const ul = qs("#todo-list");
    ul.innerHTML = "";
    const list = getList();
    if (list.length === 0) {
      const tpl = qs("#empty-template");
      ul.appendChild(tpl.content.cloneNode(true));
      return;
    }
    list.forEach((item) => {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `
        <div class="item-title" title="${item.title.replace(/"/g, "&quot;")}">${
        item.title
      }</div>
        <div class="item-actions">
          <span class="date-badge">${item.date}</span>
          <button class="delete" title="Delete" aria-label="Delete" data-id="${
            item.id
          }">
            <!-- replaced emoji with an inline SVG (uses currentColor) -->
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
              <path d="M3 6h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  function renderSelectionLabel() {
    const map = {
      today: "Today",
      upcoming: "Upcoming",
      all: "All",
      sort_oldest: "Sort by Oldest",
      sort_newest: "Sort by Newest",
    };
    // updated: change only the .label text so the SVG icon is preserved
    const btn = qs("#filter-btn");
    const labelEl = btn.querySelector(".label");
    if (labelEl) labelEl.textContent = map[state.selection];
    qsa("#filter-menu li").forEach((li) => {
      li.classList.toggle("active", li.dataset.value === state.selection);
    });
  }

  function setSelection(val) {
    state.selection = val;
    renderSelectionLabel();
    renderList();
  }

  function openMenu() {
    qs("#filter-menu").classList.add("open");
    qs("#filter-btn").setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    qs("#filter-menu").classList.remove("open");
    qs("#filter-btn").setAttribute("aria-expanded", "false");
  }

  function bindEvents() {
    // Toggle dropdown
    qs("#filter-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = qs("#filter-menu");
      menu.classList.contains("open") ? closeMenu() : openMenu();
    });
    document.addEventListener("click", () => closeMenu());

    // Menu selection
    qsa("#filter-menu li").forEach((li) => {
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelection(li.dataset.value);
        closeMenu();
      });
    });

    // Clear selection -> All
    qs("#clear-btn").addEventListener("click", () => setSelection("all"));

    // Add form
    qs("#todo-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = qs("#title").value.trim();
      const date = qs("#date").value;
      const errorEl = qs("#form-error");
      errorEl.textContent = "";
      if (!title) {
        errorEl.textContent = "Please enter a task.";
        return;
      }
      if (!date) {
        errorEl.textContent = "Please select a valid date.";
        return;
      }
      const item = { id: genId(), title, date };
      state.items.unshift(item);
      save();
      qs("#title").value = "";
      qs("#date").value = "";
      renderList();
    });

    // Delete
    qs("#todo-list").addEventListener("click", (e) => {
      const btn = e.target.closest(".delete");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      state.items = state.items.filter((t) => t.id !== id);
      save();
      renderList();
    });

    // Add calendar button behavior: focus + open picker, set to today if empty
    const dateBtn = qs("#date-btn");
    if (dateBtn) {
      dateBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const dateInput = qs("#date");
        if (!dateInput) return;
        if (!dateInput.value) {
          dateInput.value = todayYMD();
        }
        dateInput.focus();
        // try the modern showPicker() where supported
        try {
          if (typeof dateInput.showPicker === "function") {
            dateInput.showPicker();
          }
        } catch {}
      });
    }
  }

  function init() {
    load();
    bindEvents();
    renderSelectionLabel();
    renderList();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
