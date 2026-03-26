// LAKAW - Campus Path Finder (Interactive Version)
let graph = {}; // graph[u][v] = weight
let graphNodes = {}; // graphNodes[u] = { x, y }

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
  edgesLayer: document.getElementById("edgesLayer")
};

let draggedNode = null;
let offset = { x: 0, y: 0 };
let currentPathNodes = [];
let currentPathType = null; // 'short' or 'long'
let currentMode = 'short'; // 'short' or 'long'

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
    for (const v of Object.keys(graph[u])) {
      if (u.localeCompare(v) < 0) edges += 1;
    }
  }
  el.connectionsCount.textContent = String(edges);
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
  fillSelect(el.deleteSelect, "Select to delete...");
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

function renderMap() {
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
    g.setAttribute("class", "node");
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

    g.addEventListener("mousedown", (e) => {
      draggedNode = n;
      const p = getSVGPoint(e);
      offset.x = p.x - graphNodes[n].x;
      offset.y = p.y - graphNodes[n].y;
      e.stopPropagation();
    });
  }
}

function getSVGPoint(e) {
  const p = el.mapSvg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(el.mapSvg.getScreenCTM().inverse());
}

function addLocation() {
  const n = fixName(el.locationName.value);
  if (!n) return;
  if (graph[n]) return alert("Location already exists.");

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
}

function addConnection() {
  const a = el.fromSelect.value;
  const b = el.toSelect.value;
  const w = Math.max(1, Math.floor(Number(el.weightInput.value)));

  if (!a || !b || a === b) return;

  graph[a][b] = w;
  graph[b][a] = w;

  updateCounts();
  updateAdjList();
  renderMap();
  triggerAutoPath();
}

function deleteLocation() {
  const n = el.deleteSelect.value;
  if (!n) return;
  if (!confirm(`Delete "${n}" and all its connections?`)) return;

  delete graph[n];
  delete graphNodes[n];

  for (const u of Object.keys(graph)) {
    if (graph[u][n] !== undefined) {
      delete graph[u][n];
    }
  }

  updateSelectors();
  updateCounts();
  updateAdjList();
  renderMap();
  triggerAutoPath();
}

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

  const pq = [...nodes];
  while (pq.length) {
    pq.sort((a, b) => dist[a] - dist[b]);
    const u = pq.shift();
    if (u === d || dist[u] === Infinity) break;

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
  el.btnDeleteLocation.addEventListener("click", deleteLocation);
  
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
    if (confirm("Reset everything?")) {
      graph = {};
      graphNodes = {};
      updateSelectors();
      updateCounts();
      updateAdjList();
      resetOutputs();
    }
  });

  el.btnExit.addEventListener("click", () => {
    if (confirm("Exit and reset?")) {
      graph = {};
      graphNodes = {};
      location.reload();
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (draggedNode) {
      const p = getSVGPoint(e);
      graphNodes[draggedNode].x = p.x - offset.x;
      graphNodes[draggedNode].y = p.y - offset.y;
      renderMap();
    }
  });

  window.addEventListener("mouseup", () => {
    draggedNode = null;
  });

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

  updateSelectors();
  updateCounts();
  updateAdjList();
  renderMap();
}

init();