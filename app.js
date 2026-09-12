(function () {
  "use strict";

  const data = window.FAMILY_DATA;
  const peopleById = new Map(data.people.map((person) => [person.id, person]));
  const childrenByParent = new Map();
  data.people.forEach((person) => {
    const key = person.parentId || "__roots__";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(person);
  });
  childrenByParent.forEach((children) => children.sort((a, b) => a.sortOrder - b.sortOrder));

  const FAMILY_ROOT = "family-root";
  const state = {
    expanded: new Set([FAMILY_ROOT]),
    selectedId: null,
    highlightedId: null,
    scale: 1,
    x: 0,
    y: 24,
    pointers: new Map(),
    dragging: false,
    lastPoint: null,
    pinchDistance: null,
  };

  const els = {
    total: document.getElementById("totalCount"),
    living: document.getElementById("livingCount"),
    deceased: document.getElementById("deceasedCount"),
    search: document.getElementById("familySearch"),
    clearSearch: document.getElementById("clearSearch"),
    results: document.getElementById("searchResults"),
    breadcrumb: document.getElementById("breadcrumb"),
    tree: document.getElementById("familyTree"),
    canvas: document.getElementById("treeCanvas"),
    transform: document.getElementById("treeTransform"),
    viewport: document.getElementById("treeViewport"),
    connectors: document.getElementById("connectors"),
    validation: document.getElementById("validationStatus"),
  };

  function calculateFamilyStats(people = data.people) {
    const uniquePeople = new Map(people.map((person) => [person.id, person]));
    const total = uniquePeople.size;
    const deceased = [...uniquePeople.values()].filter((person) => person.deceased).length;
    return { total, living: total - deceased, deceased };
  }
  window.calculateFamilyStats = calculateFamilyStats;

  function renderStats() {
    const stats = calculateFamilyStats();
    els.total.textContent = stats.total.toLocaleString("ar-SA");
    els.living.textContent = stats.living.toLocaleString("ar-SA");
    els.deceased.textContent = stats.deceased.toLocaleString("ar-SA");
  }

  function getChildren(id) {
    if (id === FAMILY_ROOT) return data.rootIds.map((id) => peopleById.get(id));
    return childrenByParent.get(id) || [];
  }

  function getDisplayName(person) {
    return person.fullName && person.fullName !== person.name ? person.fullName : person.name;
  }

  function createNode(id) {
    const isFamilyRoot = id === FAMILY_ROOT;
    const person = isFamilyRoot ? { id, name: data.familyName, fullName: data.familyName, deceased: false } : peopleById.get(id);
    const children = getChildren(id);
    const node = document.createElement("div");
    node.className = `person-node${isFamilyRoot ? " family-root-node" : ""}${person.deceased ? " is-deceased" : ""}`;
    node.dataset.id = id;
    if (state.selectedId === id) node.classList.add("is-selected");
    if (state.highlightedId === id) node.classList.add("is-highlighted");

    const select = document.createElement("button");
    select.type = "button";
    select.className = "person-select";
    select.setAttribute("aria-label", isFamilyRoot ? data.familyName : `اختيار ${getDisplayName(person)}`);
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = getDisplayName(person);
    select.appendChild(name);

    if (person.deceased) {
      const badge = document.createElement("span");
      badge.className = "deceased-badge";
      badge.textContent = "متوفى";
      select.appendChild(badge);
    }

    select.addEventListener("click", () => selectPerson(id));
    node.appendChild(select);

    if (children.length) {
      const toggle = document.createElement("button");
      const open = state.expanded.has(id);
      toggle.type = "button";
      toggle.className = "expand-button";
      toggle.textContent = open ? "−" : "+";
      toggle.setAttribute("aria-label", `${open ? "إغلاق" : "فتح"} أبناء ${getDisplayName(person)}`);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.addEventListener("click", (event) => {
        event.stopPropagation();
        if (open) state.expanded.delete(id); else state.expanded.add(id);
        renderTree();
      });
      node.appendChild(toggle);
    }
    return node;
  }

  function createBranch(id) {
    const branch = document.createElement("div");
    branch.className = "branch";
    branch.dataset.branchId = id;
    branch.appendChild(createNode(id));
    const children = getChildren(id);
    if (children.length && state.expanded.has(id)) {
      const childrenWrap = document.createElement("div");
      childrenWrap.className = "children";
      childrenWrap.dataset.parentId = id;
      children.forEach((child) => childrenWrap.appendChild(createBranch(child.id)));
      branch.appendChild(childrenWrap);
    }
    return branch;
  }

  function renderTree() {
    els.tree.replaceChildren(createBranch(FAMILY_ROOT));
    requestAnimationFrame(() => {
      drawConnectors();
      applyTransform();
    });
  }

  function canvasPoint(element, edge) {
    const rect = element.getBoundingClientRect();
    const canvasRect = els.canvas.getBoundingClientRect();
    return {
      x: (rect.left - canvasRect.left + rect.width / 2) / state.scale,
      y: (edge === "bottom" ? rect.bottom - canvasRect.top : rect.top - canvasRect.top) / state.scale,
    };
  }

  function drawConnectors() {
    const width = Math.max(els.tree.scrollWidth, els.tree.offsetWidth);
    const height = Math.max(els.tree.scrollHeight, els.tree.offsetHeight);
    els.connectors.setAttribute("width", width);
    els.connectors.setAttribute("height", height);
    els.connectors.setAttribute("viewBox", `0 0 ${width} ${height}`);
    els.connectors.replaceChildren();

    els.tree.querySelectorAll(".children[data-parent-id]").forEach((group) => {
      const parentId = group.dataset.parentId;
      const parentNode = els.tree.querySelector(`.person-node[data-id="${parentId}"]`);
      if (!parentNode) return;
      const start = canvasPoint(parentNode, "bottom");
      [...group.children].forEach((branch) => {
        const childNode = branch.firstElementChild;
        const end = canvasPoint(childNode, "top");
        const middle = start.y + Math.max(18, (end.y - start.y) / 2);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${start.x} ${start.y} V ${middle} H ${end.x} V ${end.y}`);
        els.connectors.appendChild(path);
      });
    });
  }

  function getPath(id) {
    if (id === FAMILY_ROOT) return [];
    const path = [];
    const seen = new Set();
    let current = peopleById.get(id);
    while (current && !seen.has(current.id)) {
      path.unshift(current);
      seen.add(current.id);
      current = current.parentId ? peopleById.get(current.parentId) : null;
    }
    return path;
  }

  function selectPerson(id, shouldCenter = false) {
    state.selectedId = id;
    state.highlightedId = id === FAMILY_ROOT ? null : id;
    renderBreadcrumb(id);
    renderTree();
    if (shouldCenter) requestAnimationFrame(() => centerNode(id));
  }

  function renderBreadcrumb(id) {
    if (!id || id === FAMILY_ROOT) {
      els.breadcrumb.innerHTML = `<span>${id === FAMILY_ROOT ? data.familyName : "اختر شخصًا لعرض مساره"}</span>`;
      return;
    }
    const items = [{ id: FAMILY_ROOT, label: data.familyName }, ...getPath(id).map((person) => ({ id: person.id, label: getDisplayName(person) }))];
    els.breadcrumb.replaceChildren();
    items.forEach((item, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("click", () => selectPerson(item.id, true));
      els.breadcrumb.appendChild(button);
      if (index < items.length - 1) {
        const separator = document.createElement("span");
        separator.className = "breadcrumb-separator";
        separator.textContent = "←";
        separator.setAttribute("aria-hidden", "true");
        els.breadcrumb.appendChild(separator);
      }
    });
  }

  function normalizeArabic(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ـ/g, "");
  }

  function searchPeople(query) {
    const normalized = normalizeArabic(query);
    if (!normalized) return [];
    return data.people.filter((person) => normalizeArabic(`${person.name} ${person.fullName}`).includes(normalized));
  }

  function resultContext(person) {
    const path = getPath(person.id);
    return [data.familyName, ...path.map((item) => getDisplayName(item))].join(" ← ");
  }

  function showSearchResults() {
    const query = els.search.value;
    els.clearSearch.hidden = !query;
    const results = searchPeople(query);
    els.results.replaceChildren();
    if (!query.trim()) {
      els.results.hidden = true;
      return;
    }
    els.results.hidden = false;
    if (!results.length) {
      const empty = document.createElement("p");
      empty.className = "no-results";
      empty.textContent = "لا توجد نتائج مطابقة";
      els.results.appendChild(empty);
      return;
    }
    results.forEach((person) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.setAttribute("role", "option");
      button.innerHTML = `<strong>${getDisplayName(person)}</strong><span>${resultContext(person)}</span>`;
      button.addEventListener("click", () => activateSearchResult(person.id));
      els.results.appendChild(button);
    });
    const exact = results.filter((person) => normalizeArabic(person.name) === normalizeArabic(query) || normalizeArabic(person.fullName) === normalizeArabic(query));
    if (exact.length === 1 && results.length === 1) activateSearchResult(exact[0].id, false);
  }

  function activateSearchResult(id, closeResults = true) {
    getPath(id).slice(0, -1).forEach((person) => state.expanded.add(person.id));
    state.expanded.add(FAMILY_ROOT);
    state.selectedId = id;
    state.highlightedId = id;
    renderBreadcrumb(id);
    renderTree();
    if (closeResults) els.results.hidden = true;
    requestAnimationFrame(() => centerNode(id));
  }

  function applyTransform() {
    els.transform.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    document.documentElement.style.setProperty("--zoom", state.scale);
  }

  function setScale(nextScale, originX = els.viewport.clientWidth / 2, originY = els.viewport.clientHeight / 2) {
    const previous = state.scale;
    state.scale = Math.min(2, Math.max(0.42, nextScale));
    const ratio = state.scale / previous;
    state.x = originX - (originX - state.x) * ratio;
    state.y = originY - (originY - state.y) * ratio;
    applyTransform();
    requestAnimationFrame(drawConnectors);
  }

  function resetView() {
    const contentWidth = Math.max(els.tree.scrollWidth, els.tree.offsetWidth, 1);
    const fitScale = Math.min(1, (els.viewport.clientWidth - 36) / contentWidth);
    state.scale = Math.max(0.42, fitScale);
    state.x = Math.max(18, (els.viewport.clientWidth - contentWidth * state.scale) / 2);
    state.y = 26;
    applyTransform();
  }

  function centerNode(id) {
    const node = els.tree.querySelector(`.person-node[data-id="${id}"]`);
    if (!node) return;
    const nodeRect = node.getBoundingClientRect();
    const viewRect = els.viewport.getBoundingClientRect();
    state.x += viewRect.left + viewRect.width / 2 - (nodeRect.left + nodeRect.width / 2);
    state.y += viewRect.top + Math.min(viewRect.height / 2, 270) - (nodeRect.top + nodeRect.height / 2);
    applyTransform();
    node.querySelector("button")?.focus({ preventScroll: true });
  }

  function validateFamilyData() {
    const issues = [];
    const ids = data.people.map((person) => person.id);
    if (new Set(ids).size !== ids.length) issues.push("توجد معرّفات مكررة");
    data.people.forEach((person) => {
      if (person.parentId && !peopleById.has(person.parentId)) issues.push(`الأب غير موجود: ${person.id}`);
    });
    if (childrenByParent.get("__roots__")?.length !== 5) issues.push("عدد الجذور لا يساوي خمسة");
    const rootNames = data.rootIds.map((id) => peopleById.get(id)?.name);
    if (rootNames.join("|") !== ["معيض", "جويعد", "خليوي", "عايض", "قعيد"].join("|")) issues.push("ترتيب الجذور غير صحيح");

    const requiredChildOrders = [
      [data.rootIds[0], ["عيد", "سمران", "فهد", "فهيد", "متعب", "ماجد"]],
      [data.rootIds[1], ["عوض", "سويلم", "مشعل"]],
      [data.rootIds[2], ["مطلق", "سعود", "سعد", "سالم"]],
      [data.rootIds[3], ["معيض", "عواض", "عبدالله"]],
      [data.rootIds[4], ["سالم", "مطلق", "عبدالرحمن", "عبدالله", "عبدالمجيد", "فواز"]],
    ];
    requiredChildOrders.forEach(([rootId, expected]) => {
      const actual = getChildren(rootId).slice(0, expected.length).map((person) => person.name);
      if (actual.join("|") !== expected.join("|")) issues.push(`ترتيب أبناء ${peopleById.get(rootId).name} غير صحيح`);
    });

    const stats = calculateFamilyStats();
    if (stats.total !== 142 || stats.living !== 139 || stats.deceased !== 3) issues.push(`الإحصاءات غير متوقعة: ${stats.total}/${stats.living}/${stats.deceased}`);
    const deceased = data.people.filter((person) => person.deceased).map((person) => person.fullName).sort();
    if (deceased.join("|") !== ["سمران معيض", "عيد معيض", "غانم"].sort().join("|")) issues.push("تصنيف المتوفين غير صحيح");

    // كشف الحلقات في علاقات النسب.
    data.people.forEach((person) => {
      const visited = new Set([person.id]);
      let current = person;
      while (current.parentId) {
        if (visited.has(current.parentId)) { issues.push(`علاقة دائرية عند ${person.id}`); break; }
        visited.add(current.parentId);
        current = peopleById.get(current.parentId);
        if (!current) break;
      }
    });

    els.validation.textContent = issues.length ? "تعذر اجتياز التحقق الكامل" : `تم التحقق من ${stats.total.toLocaleString("ar-SA")} شخصًا`;
    els.validation.classList.toggle("validation-error", issues.length > 0);
    if (issues.length) console.error("Family data validation:", issues);
    return issues;
  }

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    try {
      void Promise.resolve(context.registerTool({
        name: "navigate_to_family_member",
        title: "الانتقال إلى فرد في الشجرة",
        description: "يبحث عن فرد بالاسم. إذا كانت النتيجة وحيدة يفتح مساره ويحدده، وإذا تكرر الاسم يعيد جميع النتائج مع مساراتها.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string", minLength: 1 } },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input.query !== "string" || !input.query.trim()) throw new Error("query must be a non-empty string");
          const matches = searchPeople(input.query);
          if (matches.length === 1) activateSearchResult(matches[0].id);
          return {
            count: matches.length,
            selectedId: matches.length === 1 ? matches[0].id : null,
            results: matches.map((person) => ({ id: person.id, name: getDisplayName(person), path: resultContext(person) })),
          };
        },
      })).catch(() => {});
    } catch (_) {
      // الواجهة تعمل بالكامل حتى في المتصفحات التي لا تدعم WebMCP.
    }
  }

  document.getElementById("expandAll").addEventListener("click", () => {
    state.expanded = new Set([FAMILY_ROOT, ...data.people.filter((person) => getChildren(person.id).length).map((person) => person.id)]);
    renderTree();
    requestAnimationFrame(resetView);
  });
  document.getElementById("collapseAll").addEventListener("click", () => {
    state.expanded = new Set([FAMILY_ROOT]);
    state.highlightedId = null;
    renderTree();
    requestAnimationFrame(resetView);
  });
  document.getElementById("zoomIn").addEventListener("click", () => setScale(state.scale + 0.15));
  document.getElementById("zoomOut").addEventListener("click", () => setScale(state.scale - 0.15));
  document.getElementById("resetView").addEventListener("click", resetView);
  els.search.addEventListener("input", showSearchResults);
  els.clearSearch.addEventListener("click", () => {
    els.search.value = "";
    els.clearSearch.hidden = true;
    els.results.hidden = true;
    els.search.focus();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-wrap")) els.results.hidden = true;
  });

  els.viewport.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
    event.preventDefault();
    const rect = els.viewport.getBoundingClientRect();
    setScale(state.scale * (event.deltaY < 0 ? 1.09 : 0.91), event.clientX - rect.left, event.clientY - rect.top);
  }, { passive: false });

  els.viewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button, input")) return;
    els.viewport.setPointerCapture(event.pointerId);
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    state.dragging = true;
    state.lastPoint = { x: event.clientX, y: event.clientY };
    els.viewport.classList.add("is-dragging");
  });
  els.viewport.addEventListener("pointermove", (event) => {
    if (!state.pointers.has(event.pointerId)) return;
    state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...state.pointers.values()];
    if (points.length === 2) {
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (state.pinchDistance) {
        const rect = els.viewport.getBoundingClientRect();
        const centerX = (points[0].x + points[1].x) / 2 - rect.left;
        const centerY = (points[0].y + points[1].y) / 2 - rect.top;
        setScale(state.scale * (distance / state.pinchDistance), centerX, centerY);
      }
      state.pinchDistance = distance;
    } else if (state.dragging && state.lastPoint) {
      state.x += event.clientX - state.lastPoint.x;
      state.y += event.clientY - state.lastPoint.y;
      state.lastPoint = { x: event.clientX, y: event.clientY };
      applyTransform();
    }
  });
  function endPointer(event) {
    state.pointers.delete(event.pointerId);
    state.pinchDistance = null;
    if (!state.pointers.size) {
      state.dragging = false;
      state.lastPoint = null;
      els.viewport.classList.remove("is-dragging");
    }
  }
  els.viewport.addEventListener("pointerup", endPointer);
  els.viewport.addEventListener("pointercancel", endPointer);
  els.viewport.addEventListener("keydown", (event) => {
    const amount = event.shiftKey ? 80 : 28;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft") state.x -= amount;
    if (event.key === "ArrowRight") state.x += amount;
    if (event.key === "ArrowUp") state.y -= amount;
    if (event.key === "ArrowDown") state.y += amount;
    applyTransform();
  });
  window.addEventListener("resize", () => requestAnimationFrame(drawConnectors));

  renderStats();
  renderTree();
  renderBreadcrumb(null);
  validateFamilyData();
  registerWebMcpTools();
  requestAnimationFrame(resetView);
})();
