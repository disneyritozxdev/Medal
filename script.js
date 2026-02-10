(function () {
  if (typeof lucide !== "undefined") lucide.createIcons();

  const API_BASE = "";

  function getLines() {
    const raw = document.getElementById("links").value || "";
    return raw.split(/\n/).map((s) => s.trim()).filter(Boolean);
  }

  function configureURL(url) {
    if (!url) return false;
    if (!url.toLowerCase().includes("medal")) {
      if (!url.includes("/")) return "https://medal.tv/?contentId=" + url.trim();
      return false;
    }
    if (url.toLowerCase().indexOf("https://") !== url.toLowerCase().lastIndexOf("https://"))
      return false;
    if (!url.toLowerCase().includes("https://")) url = "https://" + url;
    url = url.replace("?theater=true", "");
    return url.trim();
  }

  function checkURL(url) {
    try {
      if (!url) return false;
      return new URL(url).hostname.toLowerCase().includes("medal");
    } catch {
      return false;
    }
  }

  function extractClipID(url) {
    const clipIdMatch = url.match(/\/clips\/([^\/?&]+)/);
    const contentIdMatch = url.match(/[?&]contentId=([^&]+)/);
    if (clipIdMatch) return clipIdMatch[1];
    if (contentIdMatch) return contentIdMatch[1];
    return null;
  }

  function normalizeInput(line) {
    const url = configureURL(line);
    if (!url || !checkURL(url)) return null;
    const id = extractClipID(url);
    return id ? { url, id } : null;
  }

  async function fetchClip(urlOrId) {
    const s = String(urlOrId);
    const isId = !s.includes("/") && !s.toLowerCase().includes("medal");
    const param = isId ? "id" : "url";
    const q = encodeURIComponent(urlOrId);
    const res = await fetch(API_BASE + "/api/clip?" + param + "=" + q);
    return res.json();
  }

  function setStatus(text) {
    const el = document.getElementById("status");
    if (el) el.textContent = text;
  }

  function iconSvg(name) {
    const icons = {
      loader: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>',
      check: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
      x: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
    };
    return icons[name] || "";
  }

  const listSection = document.getElementById("list-section");
  const clipList = document.getElementById("clip-list");
  const selectAllCheckbox = document.getElementById("select-all");
  const loadBtn = document.getElementById("load");
  const downloadBtn = document.getElementById("download-selected");

  let clips = [];

  function randomName() {
    return "clip_" + Math.random().toString(36).slice(2, 10);
  }

  async function doDownload() {
    const selected = clips.filter((c) => c.valid && c.checked !== false && c.src);
    if (selected.length === 0) return;
    if (selected.length === 1) {
      setStatus("downloading...");
      const res = await fetch(selected[0].src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = randomName() + ".mp4";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("downloaded 1 clip.");
    } else {
      setStatus("preparing zip...");
      const zip = new JSZip();
      for (const c of selected) {
        const res = await fetch(c.src);
        const blob = await res.blob();
        zip.file(randomName() + ".mp4", blob);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = randomName() + ".zip";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("downloaded " + selected.length + " clips as zip.");
    }
  }

  function renderList() {
    if (!clipList) return;
    clipList.innerHTML = "";
    clips.forEach((c, i) => {
      const li = document.createElement("li");
      li.className = "clip-item";
      li.style.animationDelay = (i * 0.04) + "s";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = c.checked !== false && c.valid;
      cb.disabled = !c.valid;
      cb.id = "clip-cb-" + i;
      cb.addEventListener("change", () => {
        clips[i].checked = cb.checked;
        updateSelectAll();
      });

      const wrap = document.createElement("span");
      wrap.className = "checkbox-wrap";
      const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      check.setAttribute("viewBox", "0 0 12 12");
      check.setAttribute("fill", "none");
      check.setAttribute("stroke", "currentColor");
      check.setAttribute("stroke-width", "2");
      check.setAttribute("stroke-linecap", "round");
      check.classList.add("check");
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("points", "2,6 5,9 10,3");
      check.appendChild(poly);
      wrap.appendChild(check);
      wrap.style.cursor = c.valid ? "pointer" : "default";
      wrap.addEventListener("click", () => {
        if (c.valid && !cb.disabled) {
          cb.checked = !cb.checked;
          clips[i].checked = cb.checked;
          updateSelectAll();
        }
      });

      const label = document.createElement("span");
      label.className = "label" + (c.valid ? "" : " failed");
      label.textContent = c.valid ? c.id : c.raw || "invalid";

      let openLink = null;
      if (c.valid && c.src) {
        openLink = document.createElement("a");
        openLink.href = c.src;
        openLink.target = "_blank";
        openLink.rel = "noopener";
        openLink.className = "open-link";
        openLink.title = "open video";
        openLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
      }

      const flag = document.createElement("span");
      flag.className = "state-flag";
      if (c.loading) {
        flag.classList.add("loading");
        flag.innerHTML = iconSvg("loader") + " loading";
      } else if (c.valid) {
        flag.classList.add("ok");
        flag.innerHTML = iconSvg("check") + " ok";
      } else {
        flag.classList.add("failed");
        flag.innerHTML = iconSvg("x") + " failed";
      }

      li.appendChild(cb);
      li.appendChild(wrap);
      li.appendChild(label);
      if (openLink) li.appendChild(openLink);
      li.appendChild(flag);
      clipList.appendChild(li);
    });
  }

  function updateSelectAll() {
    if (!selectAllCheckbox) return;
    const all = clips.filter((c) => c.valid);
    const checked = all.filter((c) => c.checked !== false);
    selectAllCheckbox.checked = all.length > 0 && checked.length === all.length;
    selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < all.length;
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      const checked = selectAllCheckbox.checked;
      clips.forEach((c) => { if (c.valid) c.checked = checked; });
      renderList();
      updateSelectAll();
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", async () => {
      const lines = getLines();
      const seen = new Set();
      const normalized = [];
      for (const line of lines) {
        const n = normalizeInput(line);
        if (n && !seen.has(n.id)) {
          seen.add(n.id);
          normalized.push({ ...n, raw: line });
        } else if (!n && line) {
          normalized.push({ url: null, id: null, raw: line, valid: false });
        }
      }

      if (normalized.length === 0) {
        setStatus("paste at least one medal link or clip id (one per line).");
        return;
      }

      loadBtn.disabled = true;
      setStatus("loading " + normalized.length + " clip(s)...");
      if (listSection) listSection.hidden = false;
      clips = normalized.map((n) => ({
        ...n,
        loading: true,
        valid: false,
        src: null,
        checked: true,
      }));
      renderList();

      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        if (!c.url) {
          c.loading = false;
          c.valid = false;
          renderList();
          continue;
        }
        try {
          const data = await fetchClip(c.url);
          clips[i].valid = data && data.valid === true;
          clips[i].src = clips[i].valid ? data.src : null;
        } catch {
          clips[i].valid = false;
          clips[i].src = null;
        }
        clips[i].loading = false;
        renderList();
      }

      updateSelectAll();
      loadBtn.disabled = false;
      const ok = clips.filter((c) => c.valid).length;
      setStatus(ok + " clip(s) ready.");

      if (ok > 0) {
        try {
          await doDownload();
        } catch (e) {
          setStatus("auto download failed. try manual.");
        }
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
      const selected = clips.filter((c) => c.valid && c.checked !== false && c.src);
      if (selected.length === 0) {
        setStatus("select at least one clip.");
        return;
      }
      downloadBtn.disabled = true;
      try {
        await doDownload();
      } catch (e) {
        setStatus("download failed. try again.");
      }
      downloadBtn.disabled = false;
    });
  }
})();
