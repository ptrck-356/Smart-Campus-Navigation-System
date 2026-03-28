// LAKAW - Campus Path Finder (Interactive Version)
let graphNodes = {
  "Entrance Gate": { x: 500, y: 900 },
  "Central Plaza": { x: 500, y: 650 },
  "Administration Office": { x: 300, y: 800 },
  "Parking Area": { x: 750, y: 850 },
  "Library": { x: 500, y: 450 },
  "Science Building": { x: 250, y: 500 },
  "Computer Lab": { x: 200, y: 300 },
  "Auditorium": { x: 250, y: 700 },
  "Cafeteria": { x: 700, y: 600 },
  "Restroom": { x: 850, y: 700 },
  "Gymnasium": { x: 800, y: 400 },
  "Room A": { x: 400, y: 250 },
  "Room B": { x: 600, y: 250 },
  "Garden / Open Space": { x: 800, y: 200 }
};

let graph = {
  "Entrance Gate": { "Central Plaza": 250, "Administration Office": 224, "Parking Area": 255 },
  "Central Plaza": { "Entrance Gate": 250, "Administration Office": 250, "Auditorium": 255, "Library": 200, "Science Building": 292, "Cafeteria": 206 },
  "Administration Office": { "Entrance Gate": 224, "Central Plaza": 250, "Auditorium": 112 },
  "Parking Area": { "Entrance Gate": 255, "Restroom": 180 },
  "Library": { "Central Plaza": 200, "Science Building": 255, "Room A": 224, "Room B": 224, "Gymnasium": 304, "Cafeteria": 250 },
  "Science Building": { "Central Plaza": 292, "Library": 255, "Computer Lab": 206, "Auditorium": 200 },
  "Computer Lab": { "Science Building": 206, "Room A": 206 },
  "Auditorium": { "Administration Office": 112, "Central Plaza": 255, "Science Building": 200 },
  "Cafeteria": { "Central Plaza": 206, "Library": 250, "Restroom": 180, "Gymnasium": 224 },
  "Restroom": { "Parking Area": 180, "Cafeteria": 180 },
  "Gymnasium": { "Library": 304, "Cafeteria": 224, "Garden / Open Space": 200, "Room B": 250 },
  "Room A": { "Library": 224, "Computer Lab": 206, "Room B": 200 },
  "Room B": { "Library": 224, "Room A": 200, "Gymnasium": 250, "Garden / Open Space": 206 },
  "Garden / Open Space": { "Gymnasium": 200, "Room B": 206 }
};

const el = {
  locationName: document.getElementById("locationName"),
  btnAddLocation: document.getElementById("btnAddLocation"),
  fromSelect: document.getElementById("fromSelect"),
  toSelect: document.getElementById("toSelect"),
  weightInput: document.getElementById("weightInput"),
  btnAddConnection: document.getElementById("btnAddConnection"),

  locationsCount: document.getElementById("locationsCount"),
  connectionsCount: document.getElementById("connectionsCount"),
  adjacencyList: document.getElementById("adjacencyList"),
  
  deleteSelect: document.getElementById("deleteSelect"),
  btnDeleteLocation: document.getElementById("btnDeleteLocation"),

  startSelect: document.getElementById("startSelect"),
  destSelect: document.getElementById("destSelect"),
  connectivityOutput: document.getElementById("connectivityOutput"),
  shortOutput: document.getElementById("shortOutput"),
  longOutput: document.getElementById("longOutput"),
  btnClearResults: document.getElementById("btnClearResults"),
  btnResetGraph: document.getElementById("btnResetGraph"),
  btnExit: document.getElementById("btnExit"),

  mapSvg: document.getElementById("mapSvg"),
  nodesLayer: document.getElementById("nodesLayer"),
  edgesLayer: document.getElementById("edgesLayer"),

  autoWeightCheck: document.getElementById("autoWeightCheck"),

  customModal: document.getElementById("customModal"),
  modalMessage: document.getElementById("modalMessage"),
  modalBtnCancel: document.getElementById("modalBtnCancel"),
  modalBtnConfirm: document.getElementById("modalBtnConfirm"),
  toastContainer: document.getElementById("toastContainer"),

  floatingToolbar: document.getElementById("floatingToolbar"),
  btnFloatingDelete: document.getElementById("btnFloatingDelete")
};

let draggedNode = null;
let offset = { x: 0, y: 0 };
let currentPathNodes = [];
let currentPathType = null; // 'short' or 'long'
let currentMode = 'short'; // 'short' or 'long'
let selectedElement = null;

let isPanning = false;
let startPan = { x: 0, y: 0 };
let currentPan = { vx: 0, vy: 0, vw: 1000, vh: 1000 };

function getEventPoint(e) {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
}

function showToast(msg, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  el.toastContainer.appendChild(t);
  
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

function showConfirm(msg, onConfirm) {
  el.modalMessage.textContent = msg;
  el.customModal.classList.add("active");
  
  const handleConfirm = () => {
    cleanup();
    onConfirm();
  };
  const handleCancel = () => cleanup();
  
  const cleanup = () => {
    el.customModal.classList.remove("active");
    el.modalBtnConfirm.removeEventListener("click", handleConfirm);
    el.modalBtnCancel.removeEventListener("click", handleCancel);
  };
  
  el.modalBtnConfirm.addEventListener("click", handleConfirm);
  el.modalBtnCancel.addEventListener("click", handleCancel);
}

function saveData() {
  localStorage.setItem("lakaw_graph", JSON.stringify(graph));
  localStorage.setItem("lakaw_nodes", JSON.stringify(graphNodes));
}

function loadData() {
  try {
    const g = localStorage.getItem("lakaw_graph");
    const gn = localStorage.getItem("lakaw_nodes");
    if (g && gn) {
      const parsedG = JSON.parse(g);
      const parsedGn = JSON.parse(gn);
      if (Object.keys(parsedG).length > 0) {
        graph = parsedG;
        graphNodes = parsedGn;
      }
    }
  } catch(e) {
    console.error("Local storage error:", e);
  }
}

function selectElement(element, e) {
  selectedElement = element;
  renderMap();
  
  el.floatingToolbar.classList.add("active");
}

function deselectElement() {
  if (selectedElement) {
    selectedElement = null;
    el.floatingToolbar.classList.remove("active");
    renderMap();
  }
}

function deleteAction() {
  if (!selectedElement) return;
  
  if (selectedElement.type === 'node') {
    const n = selectedElement.id;
    showConfirm(`Delete "${n}" and all its connections?`, () => {
      delete graph[n];
      delete graphNodes[n];
      for (const u of Object.keys(graph)) {
        if (graph[u][n] !== undefined) delete graph[u][n];
      }
      deselectElement();
      updateSelectors();
      updateCounts();
      updateAdjList();
      renderMap();
      triggerAutoPath();
      saveData();
      showToast("Location deleted.");
    });
  }
}

function fixName(x) {
  return String(x || "").trim();
}

function getNodes() {
  return Object.keys(graph).sort((a, b) => a.localeCompare(b));
}

function resetOutputs() {
  el.connectivityOutput.textContent = "-";
  el.shortOutput.textContent = "-";
  el.longOutput.textContent = "-";
  currentPathNodes = [];
  currentPathType = null;
  renderMap();
}

function updateCounts() {
  const ns = getNodes();
  el.locationsCount.textContent = String(ns.length);

  let edges = 0;
  for (const u of ns) {
    edges += Object.keys(graph[u] || {}).length;
  }
  el.connectionsCount.textContent = String(edges / 2);
}

function updateAdjList() {
  const ns = getNodes();
  if (ns.length === 0) {
    el.adjacencyList.textContent = "No locations yet.";
    return;
  }

  const lines = [];
  for (const u of ns) {
    const nbrs = Object.keys(graph[u]).sort((a, b) => a.localeCompare(b));
    if (nbrs.length === 0) {
      lines.push(`${u} -> (no connections)`);
      continue;
    }
    const parts = nbrs.map((v) => `${v} (w=${graph[u][v]})`);
    lines.push(`${u} -> ${parts.join(", ")}`);
  }
  el.adjacencyList.textContent = lines.join("\n");
}

function fillSelect(selectEl, placeholder) {
  if (!selectEl) return;
  const ns = getNodes();
  const currentVal = selectEl.value;
  selectEl.innerHTML = "";

  const emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.textContent = placeholder;
  selectEl.appendChild(emptyOpt);

  if (ns.length === 0) {
    selectEl.disabled = true;
    return;
  }

  selectEl.disabled = false;
  for (const n of ns) {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    selectEl.appendChild(opt);
  }
  
  if (ns.includes(currentVal)) {
    selectEl.value = currentVal;
  }
}

function updateSelectors() {
  fillSelect(el.fromSelect, "From...");
  fillSelect(el.toSelect, "To...");
  fillSelect(el.startSelect, "Start...");
  fillSelect(el.destSelect, "Dest...");
}

function triggerAutoPath() {
  const s = el.startSelect.value;
  const d = el.destSelect.value;
  
  if (!s || !d) {
    resetOutputs();
    return;
  }

  const ok = bfsConnected(s, d);
  el.connectivityOutput.textContent = ok ? "✓ Path exists" : "✗ No path found";
  
  if (!ok) {
    el.shortOutput.textContent = "-";
    el.longOutput.textContent = "-";
    currentPathNodes = [];
    renderMap();
    return;
  }

  if (currentMode === 'short') {
    const res = dijkstra(s, d);
    if (res) {
      el.shortOutput.textContent = `Shortest: ${res.path.join("→")} (w: ${res.weight})`;
      el.longOutput.textContent = "-";
      currentPathNodes = res.path;
      currentPathType = 'short';
    }
  } else {
    const res = dfsLong(s, d);
    if (res) {
      el.longOutput.textContent = `Longest: ${res.path.join("→")} (w: ${res.weight})`;
      el.shortOutput.textContent = "-";
      currentPathNodes = res.path;
      currentPathType = 'long';
    }
  }
  renderMap();
}

let renderPending = false;
function renderMap() {
  if (!renderPending) {
    renderPending = true;
    requestAnimationFrame(() => {
      renderMapImmediate();
      renderPending = false;
    });
  }
}

function renderMapImmediate() {
  el.nodesLayer.innerHTML = "";
  el.edgesLayer.innerHTML = "";

  const ns = getNodes();
  
  // Render Edges
  const processedEdges = new Set();
  for (const u of ns) {
    for (const v of Object.keys(graph[u])) {
      const edgeKey = [u, v].sort().join("-");
      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);

      const p1 = graphNodes[u];
      const p2 = graphNodes[v];
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", p1.x);
      line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x);
      line.setAttribute("y2", p2.y);
      line.setAttribute("class", "edge");

      if (currentPathNodes.length > 0) {
        let isPart = false;
        for (let i = 0; i < currentPathNodes.length - 1; i++) {
          if ((currentPathNodes[i] === u && currentPathNodes[i+1] === v) || 
              (currentPathNodes[i] === v && currentPathNodes[i+1] === u)) {
            isPart = true;
            break;
          }
        }
        if (isPart) {
          line.classList.add(currentPathType === 'short' ? 'active' : 'active-long');
        }
      }
      el.edgesLayer.appendChild(line);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY - 5);
      text.setAttribute("class", "edge-label");
      text.textContent = graph[u][v];
      el.edgesLayer.appendChild(text);
    }
  }

  // Render Nodes
  for (const n of ns) {
    const { x, y } = graphNodes[n];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const isNodeSelected = selectedElement && selectedElement.type === 'node' && selectedElement.id === n;
    g.setAttribute("class", "node" + (isNodeSelected ? " selected" : ""));
    g.dataset.name = n;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", 8);
    
    if (n === el.startSelect.value) circle.style.stroke = "var(--brand)";
    if (n === el.destSelect.value) circle.style.stroke = "var(--brand2)";

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y - 15);
    text.setAttribute("text-anchor", "middle");
    text.textContent = n;

    g.appendChild(circle);
    g.appendChild(text);
    el.nodesLayer.appendChild(g);

    const startDrag = (e) => {
      draggedNode = n;
      selectElement({ type: 'node', id: n }, e);
      const p = getSVGPoint(e);
      offset.x = p.x - graphNodes[n].x;
      offset.y = p.y - graphNodes[n].y;
      e.stopPropagation();
      if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
    };

    g.addEventListener("mousedown", startDrag);
    g.addEventListener("touchstart", startDrag, { passive: false });
  }
}

function getSVGPoint(e) {
  const p = el.mapSvg.createSVGPoint();
  const ep = getEventPoint(e);
  p.x = ep.clientX;
  p.y = ep.clientY;
  return p.matrixTransform(el.mapSvg.getScreenCTM().inverse());
}

function addLocation() {
  const n = fixName(el.locationName.value);
  if (!n) return;
  if (graph[n]) return showToast("Location already exists.", "error");

  graph[n] = {};
  graphNodes[n] = {
    x: 200 + Math.random() * 600,
    y: 200 + Math.random() * 600
  };
  
  el.locationName.value = "";
  updateSelectors();
  updateCounts();
  updateAdjList();
  renderMap();
  triggerAutoPath();
  saveData();
}

function addConnection() {
  const a = el.fromSelect.value;
  const b = el.toSelect.value;
  let w;

  if (el.autoWeightCheck.checked) {
    const p1 = graphNodes[a];
    const p2 = graphNodes[b];
    if (p1 && p2) {
      w = Math.max(1, Math.floor(Math.hypot(p2.x - p1.x, p2.y - p1.y)));
    } else {
      w = 1;
    }
  } else {
    w = Math.max(1, Math.floor(Number(el.weightInput.value)));
  }

  if (!a || !b || a === b) return;

  graph[a][b] = w;
  graph[b][a] = w;

  updateCounts();
  updateAdjList();
  renderMap();
  triggerAutoPath();
  saveData();
}

// Delete Location / Connection functions removed, replaced by deleteAction

function bfsConnected(s, d) {
  const q = [s];
  const seen = { [s]: true };
  while (q.length) {
    const u = q.shift();
    if (u === d) return true;
    for (const v of Object.keys(graph[u] || {})) {
      if (!seen[v]) {
        seen[v] = true;
        q.push(v);
      }
    }
  }
  return false;
}

function dijkstra(s, d) {
  const dist = {};
  const prev = {};
  const nodes = getNodes();
  nodes.forEach(n => dist[n] = Infinity);
  dist[s] = 0;

  const unvisited = new Set(nodes);
  while (unvisited.size) {
    let u = null;
    for (const n of unvisited) {
      if (u === null || dist[n] < dist[u]) u = n;
    }
    if (u === null || u === d || dist[u] === Infinity) break;
    unvisited.delete(u);

    for (const v of Object.keys(graph[u] || {})) {
      const alt = dist[u] + graph[u][v];
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  const path = [];
  let curr = d;
  while (curr) {
    path.push(curr);
    curr = prev[curr];
  }
  path.reverse();
  return path[0] === s ? { path, weight: dist[d] } : null;
}

function dfsLong(s, d) {
  let bestPath = null;
  let maxWeight = -1;

  function find(u, path, weight, visited) {
    if (u === d) {
      if (weight > maxWeight) {
        maxWeight = weight;
        bestPath = [...path];
      }
      return;
    }
    for (const v of Object.keys(graph[u] || {})) {
      if (!visited.has(v)) {
        visited.add(v);
        path.push(v);
        find(v, path, weight + graph[u][v], visited);
        path.pop();
        visited.delete(v);
      }
    }
  }

  find(s, [s], 0, new Set([s]));
  return bestPath ? { path: bestPath, weight: maxWeight } : null;
}

function init() {
  el.btnAddLocation.addEventListener("click", addLocation);
  el.btnAddConnection.addEventListener("click", addConnection);

  el.btnFloatingDelete.addEventListener('click', deleteAction);
  el.floatingToolbar.addEventListener('mousedown', (e) => e.stopPropagation());
  el.floatingToolbar.addEventListener('touchstart', (e) => e.stopPropagation());

  el.autoWeightCheck.addEventListener("change", (e) => {
    el.weightInput.disabled = e.target.checked;
  });
  
  const btnPathMode = document.getElementById("btnPathMode");
  if (btnPathMode) {
    btnPathMode.addEventListener("click", () => {
      currentMode = currentMode === 'short' ? 'long' : 'short';
      btnPathMode.classList.toggle("long", currentMode === 'long');
      btnPathMode.querySelector("span").textContent = currentMode === 'short' ? "Short Path" : "Long Path";
      btnPathMode.querySelector("i").className = currentMode === 'short' ? "fa-solid fa-bolt" : "fa-solid fa-treasure-chest";
      triggerAutoPath();
    });
  }

  el.btnClearResults.addEventListener("click", resetOutputs);
  el.btnResetGraph.addEventListener("click", () => {
    showConfirm("Reset to default campus layout?", () => {
      localStorage.removeItem("lakaw_graph");
      localStorage.removeItem("lakaw_nodes");
      location.reload();
    });
  });

  el.btnExit.addEventListener("click", () => {
    showConfirm("Exit and reset?", () => {
      localStorage.removeItem("lakaw_graph");
      localStorage.removeItem("lakaw_nodes");
      location.reload();
    });
  });

  el.mapSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 : -1;
    
    let vb = el.mapSvg.getAttribute('viewBox');
    if (!vb) vb = "0 0 1000 1000";
    let [vx, vy, vw, vh] = vb.split(' ').map(Number);

    const p = getSVGPoint(e);
    const w = direction > 0 ? vw * zoomFactor : vw / zoomFactor;
    const h = direction > 0 ? vh * zoomFactor : vh / zoomFactor;

    const relX = (p.x - vx) / vw;
    const relY = (p.y - vy) / vh;
    const newVx = p.x - relX * w;
    const newVy = p.y - relY * h;

    if (w > 100 && w < 10000) {
      el.mapSvg.setAttribute('viewBox', `${newVx} ${newVy} ${w} ${h}`);
    }
  }, { passive: false });

  const startPanHandler = (e) => {
    if (e.target === el.mapSvg || e.target.id === 'nodesLayer' || e.target.id === 'edgesLayer') {
      deselectElement();
      isPanning = true;
      const ep = getEventPoint(e);
      startPan = { x: ep.clientX, y: ep.clientY };
      
      let vb = el.mapSvg.getAttribute('viewBox');
      if (!vb) vb = "0 0 1000 1000";
      let [vx, vy, vw, vh] = vb.split(' ').map(Number);
      currentPan = { vx, vy, vw, vh };
      
      el.mapSvg.style.cursor = 'grabbing';
      if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
    }
  };

  el.mapSvg.addEventListener('mousedown', startPanHandler);
  el.mapSvg.addEventListener('touchstart', startPanHandler, { passive: false });

  const moveHandler = (e) => {
    if (draggedNode) {
      if (e.type === 'touchmove' && e.cancelable) e.preventDefault();
      const p = getSVGPoint(e);
      graphNodes[draggedNode].x = p.x - offset.x;
      graphNodes[draggedNode].y = p.y - offset.y;
      renderMap();
      return;
    }
    
    if (isPanning) {
      if (e.type === 'touchmove' && e.cancelable) e.preventDefault();
      const ep = getEventPoint(e);
      const dx = ep.clientX - startPan.x;
      const dy = ep.clientY - startPan.y;

      const svgRect = el.mapSvg.getBoundingClientRect();
      const svgDx = (dx / svgRect.width) * currentPan.vw;
      const svgDy = (dy / svgRect.height) * currentPan.vh;

      const newVx = currentPan.vx - svgDx;
      const newVy = currentPan.vy - svgDy;
      el.mapSvg.setAttribute('viewBox', `${newVx} ${newVy} ${currentPan.vw} ${currentPan.vh}`);
    }
  };

  window.addEventListener('mousemove', moveHandler);
  window.addEventListener('touchmove', moveHandler, { passive: false });

  const endHandler = () => {
    if (draggedNode) {
      saveData();
      draggedNode = null;
    }
    if (isPanning) {
      isPanning = false;
      el.mapSvg.style.cursor = 'grab';
    }
  };

  window.addEventListener('mouseup', endHandler);
  window.addEventListener('touchend', endHandler);

  el.startSelect.addEventListener("change", triggerAutoPath);
  el.destSelect.addEventListener("change", triggerAutoPath);

  // Tab Navigation
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.dataset.target;
      navItems.forEach(btn => btn.classList.remove("active"));
      item.classList.add("active");
      tabContents.forEach(content => {
        content.classList.remove("active");
        if (content.id === target) content.classList.add("active");
      });
    });
  });

  loadData();
  updateSelectors();
  updateCounts();
  updateAdjList();
  renderMap();
}

init();