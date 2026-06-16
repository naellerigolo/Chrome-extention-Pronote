"use strict";
(function () {
  const STABILITY_MS = 900;
  const MAX_WAIT_MS = 25000;
  const EXTRA_SETTLE_MS = 300;
  const defaultStudyDurations = {
    homework: { easy: 25, medium: 45, hard: 75 },
    test: { easy: 30, medium: 60, hard: 90 }
  };
  const MAX_STORED_ITEMS = 1200;

  const navEventName = "pronote-locationchange";
  (function patchHistory() {
    const fire = () => window.dispatchEvent(new Event(navEventName));
    const p = history.pushState, r = history.replaceState;
    history.pushState = function () { const x = p.apply(this, arguments); fire(); return x; };
    history.replaceState = function () { const x = r.apply(this, arguments); fire(); return x; };
    window.addEventListener("popstate", fire);
  })();

  let allowAutoCapture = true; // Auto-capture on load by default
  let skipDownloads = false;

  // Auto-run on initial load
  runAutoCapture();
  window.addEventListener(navEventName, () => { if (allowAutoCapture) runAutoCapture(); });

  // Simple in-page toast
  function toast(msg) {
    try {
      const d = document;
      const host = (d.body || d.documentElement || d);
      const el = d.createElement('div');
      el.textContent = String(msg || '');
      el.style.cssText = 'position:fixed;right:12px;bottom:12px;max-width:60vw;background:rgba(0,0,0,0.85);color:#fff;padding:10px 14px;border-radius:10px;font:13px system-ui, -apple-system, Segoe UI, Roboto;z-index:2147483647;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;';
      host.appendChild(el);
      setTimeout(() => { try { el.remove(); } catch { } }, 3000);
    } catch { }
  }

  // Allow background to force a capture after a short delay
  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'PRONOTE_SET_REPLACE_MODE') {
        try { window.__PRONOTE_REPLACE_MODE = true; toast('Replace mode armed'); } catch { }
        sendResponse({ ok: true });
        return true;
      }
      if (msg.type === 'PRONOTE_FORCE_CAPTURE') {
        // Arm capture for a short window and run after a brief delay
        skipDownloads = !!msg.skipDownloads;
        try { window.__PRONOTE_FORCE_SCAN = true; } catch { }
        allowAutoCapture = true;
        setTimeout(() => { allowAutoCapture = false; }, 60000);
        toast('Capturing…');
        try { console.info('[PRONOTE planner] Force capture received; arming...'); } catch { }
        setTimeout(() => {
          try { console.info('[PRONOTE planner] Running auto-capture...'); } catch { }
          try { runAutoCapture(); } catch { }
          // Fallback: if finalize was already prepared inside a previous run
          try { if (typeof window.__PRONOTE_finalize === 'function') window.__PRONOTE_finalize(); } catch { }
        }, 1500);
        sendResponse({ ok: true });
        return true;
      }
    });
  } catch { }

  function runAutoCapture() {
    try { console.info('[PRONOTE planner] runAutoCapture entry; allowed=', allowAutoCapture); } catch { }
    const forceScan = !!window.__PRONOTE_FORCE_SCAN;
    try { window.__PRONOTE_FORCE_SCAN = false; } catch { }
    // If we're on the login screen, wait for homework content to appear before scanning.
    try {
      const bodyText = (document.body && document.body.innerText ? document.body.innerText : '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();
      const hasPasswordField = !!document.querySelector('input[type="password"], input[name*="pass" i]');
      const hasLoginText = /connexion|login|se connecter|mot de passe|identifiant/.test(bodyText);
      const hasHomework = /travail a faire|cahier de textes|homework|devoirs|pour aujourd|pour demain|non fait|j'ai termine|jai termine/.test(bodyText);
      const looksLikeLogin = hasPasswordField && hasLoginText;
      if (!forceScan && looksLikeLogin && !hasHomework) {
        if (!window.__PRONOTE_WAITING_FOR_HOMEWORK) {
          window.__PRONOTE_WAITING_FOR_HOMEWORK = true;
          const obs = new MutationObserver(() => {
            const text = (document.body && document.body.innerText ? document.body.innerText : '')
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
            const ready = /travail a faire|cahier de textes|homework|devoirs|pour aujourd|pour demain|non fait|j'ai termine|jai termine/.test(text);
            if (ready) {
              try { obs.disconnect(); } catch { }
              window.__PRONOTE_WAITING_FOR_HOMEWORK = false;
              setTimeout(() => { try { runAutoCapture(); } catch { } }, 500);
            }
          });
          try { obs.observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch { }
          setTimeout(() => { try { obs.disconnect(); } catch { } window.__PRONOTE_WAITING_FOR_HOMEWORK = false; }, 300000);
        }
        return;
      }
    } catch { }
    // If we got here via explicit trigger, run even if the guard is false
    if (!allowAutoCapture) { try { console.info('[PRONOTE planner] forcing capture even though allowAutoCapture=false'); } catch { } }

    let resolved = false;
    let stableTimer = null;
    let maxTimer = null;

    const iframeSeen = new Set();
    const pendingIframes = new Set();
    const crossOriginIframes = new Set();

    window.addEventListener("beforeunload", () => { if (!resolved) finalize(); }, { once: true });

    const mo = new MutationObserver(() => { scanIframes(); scheduleStableCheck(); });
    mo.observe(document, { childList: true, subtree: true });

    scanIframes();
    scheduleStableCheck();
    maxTimer = setTimeout(finalize, MAX_WAIT_MS);

    function scheduleStableCheck() {
      if (stableTimer) clearTimeout(stableTimer);
      stableTimer = setTimeout(() => {
        if (pendingIframes.size > 0) scheduleStableCheck();
        else setTimeout(finalize, EXTRA_SETTLE_MS);
      }, STABILITY_MS);
    }

    function isSameOrigin(frame) {
      try { void frame.contentWindow.location.href; return true; } catch { return false; }
    }

    function scanIframes() {
      const frames = Array.from(document.querySelectorAll("iframe"));
      for (const f of frames) {
        if (iframeSeen.has(f)) continue;
        iframeSeen.add(f);
        if (isSameOrigin(f)) {
          if (!f.contentDocument || f.contentDocument.readyState !== "complete") {
            pendingIframes.add(f);
            f.addEventListener("load", () => { pendingIframes.delete(f); scheduleStableCheck(); }, { once: true });
          }
        } else {
          let url = f.src || "";
          if (!url && f.getAttribute("srcdoc")) url = "about:srcdoc";
          if (!url) url = "about:blank";
          crossOriginIframes.add(url);
        }
      }
    }

    function collectAllRoots(doc) {
      const roots = [doc.documentElement], stack = [doc.documentElement];
      while (stack.length) {
        const cur = stack.pop();
        const els = cur.querySelectorAll("*");
        for (const el of els) if (el.shadowRoot) { roots.push(el.shadowRoot); stack.push(el.shadowRoot); }
      }
      return roots;
    }

    function isVisibleElement(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity || "1") === 0) return false;
      return true;
    }

    function visibleLinesFromNode(root) {
      const out = [];
      const doc = root.ownerDocument || document;
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => {
          if (!n.parentElement) return NodeFilter.FILTER_REJECT;
          if (!isVisibleElement(n.parentElement)) return NodeFilter.FILTER_REJECT;
          const s = n.nodeValue.replace(/\s+/g, " ").trim();
          if (!s) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      let node;
      while ((node = walker.nextNode())) {
        let text = node.nodeValue.replace(/\s+/g, " ").trim();
        if (!text) continue;
        try {
          const anchor = node.parentElement?.closest("a");
          if (anchor && anchor.href) text += ` (${anchor.href})`;
        } catch { }
        out.push(text);
      }
      return out;
    }

    function visibleLinesFromDoc(doc) {
      const out = [];
      for (const r of collectAllRoots(doc)) out.push(...visibleLinesFromNode(r));
      return out;
    }

    function sameOriginIframeDocs() {
      const docs = [];
      for (const f of document.querySelectorAll("iframe")) {
        if (!isSameOrigin(f)) continue;
        try { if (f.contentDocument) docs.push(f.contentDocument); } catch { }
      }
      return docs;
    }

    function norm(s) {
      return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
    }

    const START_LONG = "travail a faire pour les prochains jours";
    const START_SHORT = "travail a faire";
    const END_PHRASES = [
      "dernieres ressources pedagogiques",
      "carnet de correspondance",
      "dernieres notes",
      "agenda",
      "cdi / library",
      "informations & sondages",
      "mentions legales",
      "page de l'etablissement"
    ].map(norm);
    const NOISE_PREFIXES = [
      "acceder au menu", "acceder au contenu", "declaration d'accessibilite", "plan du site", "lycee francais de new york",
      "espace eleves", "accueil", "mes donnees", "compte", "cahier de textes", "contenu et ressources", "travail a faire",
      "notes", "mes notes", "releve", "competences", "evaluations", "bilan par domaine", "evaluations par competence",
      "niveaux de maitrise par matiere", "vie scolaire", "vie", "scolaire", "emploi du temps", "carnet", "communication",
      "informations & sondages", "agenda", "aucune notification", "page d'accueil", "precedente connexion", "tout voir",
      "j'ai termine", "non fait", "fait"
    ].map(norm);

    function looksLikeHomeworkBlock(lines, idx) {
      const w = lines.slice(idx + 1, idx + 6).map(norm);
      return w.some(l => l === "tout voir" || l.startsWith("pour") || l === "pour");
    }

    function isLikelyDueHeading(n) {
      let t = String(n || "").replace(/[.!:]+$/, "").trim();
      if (t.startsWith("pour ")) t = t.slice(5).trim();
      if (!t) return false;
      if (t === "aujourdhui" || t === "demain" || t === "apres demain" || t === "apres-demain") return true;
      return /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(t);
    }

    function findHomeworkSlice(allLines) {
      const raw = allLines.map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
      const lower = raw.map(norm);
      let start = lower.indexOf(START_LONG);
      if (start === -1) {
        const cands = [];
        for (let i = 0; i < lower.length; i++) if (lower[i] === START_SHORT && looksLikeHomeworkBlock(raw, i)) cands.push(i);
        start = cands.length ? cands[0] : -1;
      }
      // Some PRONOTE layouts start directly with "Pour aujourd'hui" without the "Travail à faire" header.
      if (start === -1) {
        start = lower.findIndex((n) => isLikelyDueHeading(n));
      }
      if (start === -1) return [];
      let end = raw.length;
      for (let i = start + 1; i < lower.length; i++) if (END_PHRASES.some(t => lower[i].startsWith(t))) { end = i; break; }
      const slice = raw.slice(start, end);
      const cleaned = [];
      let lastN = null;
      for (const line of slice) {
        const n = norm(line);
        if (!n) continue;
        if (NOISE_PREFIXES.some(p => n === p || n.startsWith(p))) continue;
        // Deduplicate only consecutive identical lines to avoid dropping repeated subjects across days
        if (n === lastN) continue;
        cleaned.push(line);
        lastN = n;
      }
      return cleaned;
    }

    function homeworkOnlyText(cross) {
      let chunk = findHomeworkSlice(visibleLinesFromDoc(document));
      if (chunk.length < 3) {
        for (const d of sameOriginIframeDocs()) {
          const sliced = findHomeworkSlice(visibleLinesFromDoc(d));
          if (sliced.length >= 3) { chunk = sliced; break; }
        }
      }

      // Helpers for formatting text output in groups
      const nrmTxt = (s) => (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
      const isDueHeading = (line) => {
        const n = nrmTxt(line).replace(/[.!:]+$/, "");
        if (!n) return false;
        if (n === "aujourdhui" || n === "demain" || n === "apres demain" || n === "apres-demain") return true;
        if (/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(n)) return true;
        return false;
      };
      const isSubjectLike = (line) => {
        const t = (line || "").trim(); if (!t) return false;
        if (/https?:\/\//i.test(t)) return false;
        if (isKnownSubjectName(t)) return true;
        // Known subject cues
        if (/^(SPE|SPÉ|FRANCAIS|FRANÇAIS|ANGLAIS|EPS|HISTOIRE|GEOGRAPHIE|GÉOGRAPHIE|ESPAGNOL|ARABE|NSI|PHYSIQUE|CHIMIE|LV\d)/i.test(t)) return true;
        // Uppercase ratio heuristic
        const letters = (t.match(/[\p{L}]/gu) || []).length;
        const upp = (t.match(/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/g) || []).length;
        const ratio = letters ? (upp / letters) : 0;
        if (ratio >= 0.5 && t.length <= 70) return true;
        // Trailing colon typical header
        if (/^[\p{L}\s\-]+:$/u.test(t)) return true;
        return false;
      };

      function formatChunk(lines) {
        const out = [];
        let i = 0;
        let seenAnyInSection = false;
        while (i < lines.length) {
          const raw = (lines[i] || "").trim();
          const n = nrmTxt(raw);
          if (!raw) { i++; continue; }
          // Drop standalone 'Pour' markers in text output
          if (n === "pour") { i++; continue; }
          if (isDueHeading(raw)) {
            if (out.length && out[out.length - 1] !== "") out.push("");
            out.push(raw);
            out.push(""); // blank line after date heading
            seenAnyInSection = false;
            i++; continue;
          }
          if (isSubjectLike(raw)) {
            if (seenAnyInSection) out.push(""); // blank line between subjects
            out.push(raw);
            i++;
            // Append following note lines until next subject/due
            while (i < lines.length) {
              const nxt = (lines[i] || "").trim();
              const nn = nrmTxt(nxt);
              if (!nxt) { i++; continue; }
              if (nn === "pour" || isDueHeading(nxt) || isSubjectLike(nxt)) break;
              out.push(nxt);
              i++;
            }
            seenAnyInSection = true;
            continue;
          }
          // Fallback: just append
          out.push(raw);
          i++;
        }
        // Trim trailing blanks
        while (out.length && out[out.length - 1] === "") out.pop();
        return out;
      }

      const formatted = chunk.length ? formatChunk(chunk) : [];
      const x = Array.from(cross);
      const header = [
        `Source: ${location.href}`,
        `Collected: ${new Date().toISOString()}`,
        x.length ? `Cross-Origin Iframes: ${x.join(" | ")}` : `Cross-Origin Iframes: none`,
        ""
      ].join("\n");
      return header + (formatted.length ? formatted.join("\n") : "[Aucun bloc 'Travail à faire' détecté]");
    }

    function parseHomeworkJSON(lines) {
      const months = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12 };
      const monthsAbbrev = { janv: 1, fevr: 2, fev: 2, mar: 3, avr: 4, mai: 5, juin: 6, juil: 7, aout: 8, sept: 9, oct: 10, nov: 11, dec: 12, octo: 10 };
      const days = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 };
      const testWords = ["controle", "évaluation", "evaluation", "interrogation", "ds", "test", "quiz", "examen", "epreuve", "épreuve"];
      const todayY = (new Date()).getFullYear();
      const nrm = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

      function toISO(y, m, d) {
        const yy = y < 100 ? 2000 + y : y;
        return `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      function nextWeekday(target) {
        const d = new Date();
        let diff = target - d.getDay();
        if (diff <= 0) diff += 7;
        d.setDate(d.getDate() + diff);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      function resolveDueDate(raw) {
        let t = nrm(raw).replace(/\./g, "");
        if (t.startsWith("pour ")) t = t.slice(5).trim();
        // explicit date forms first
        const dmy = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
        if (dmy) { const d = parseInt(dmy[1], 10), m = parseInt(dmy[2], 10), y = dmy[3] ? parseInt(dmy[3], 10) : todayY; return toISO(y < 100 ? 2000 + y : y, m, d); }
        const dm = t.match(/\b(\d{1,2})\s+([a-z]+)\b/);
        if (dm) { const d = parseInt(dm[1], 10); let key = dm[2].replace(/[^a-z]/g, ""); const m = months[key] || monthsAbbrev[key]; if (m) return toISO(todayY, m, d); }
        // relative keywords
        if (/\baujourdhui\b/.test(t)) { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        if (/\bdemain\b/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        if (/\bapres demain\b/.test(t) || /\bapres-demain\b/.test(t)) { const d = new Date(); d.setDate(d.getDate() + 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        const day = t.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/); if (day) return nextWeekday(days[day[1]]);
        return "";
      }

      function isLikelySubjectHeader(line) {
        const trimmed = line.trim(); if (!trimmed) return false;
        const without = trimmed.replace(/[^\p{L}\p{N}\s\-:/]/gu, "");
        const letters = [...without].filter(ch => /\p{L}/u.test(ch));
        const upp = [...without].filter(ch => /[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/.test(ch));
        const upperRatio = letters.length ? (upp.length / letters.length) : 0;
        if (upperRatio >= 0.6 && trimmed.length <= 60) return true;
        if (/^(SPE|SPÉ|ARABE|FRANCAIS|FRANÇAIS|MATHS|MATHEMATIQUES|HISTOIRE|GEOGRAPHIE|PHYSIQUE|CHIMIE|NSI|ANGLAIS|ESPAGNOL|CHECK IN|SUPPORT)/i.test(trimmed)) return true;
        if (/\bLV[1-3]\b/i.test(trimmed)) return true;
        if (/^[\p{L}\s\-]+:/u.test(trimmed)) return true;
        return false;
      }

      const merged = [];
      for (let i = 0; i < lines.length; i++) {
        const L = (lines[i] || "").trim(); if (!L) continue;
        if (nrm(L) === "pour" && i + 1 < lines.length) { merged.push(`Pour ${String(lines[i + 1] || "").trim()}`); i++; }
        else { merged.push(L); }
      }

      const itemsA = [];
      let currentDue = ""; let curSubject = ""; let curNotes = [];
      const flushA = () => {
        if (!currentDue) { curSubject = ""; curNotes = []; return; }
        if (!curSubject && curNotes.length === 0) return;
        const text = curNotes.join(" ").trim();
        const isTest = testWords.some(w => nrm(text).includes(nrm(w)));
        itemsA.push({ subject: (curSubject || "").trim(), dueDate: currentDue, type: isTest ? "test" : "homework", notes: text });
        curSubject = ""; curNotes = [];
      };

      for (let i = 0; i < merged.length; i++) {
        const raw = merged[i].trim(); if (!raw) continue;
        const n = nrm(raw);
        if (n.startsWith("pour ")) { flushA(); currentDue = resolveDueDate(raw) || currentDue; continue; }
        if (!currentDue) continue;
        if (isLikelySubjectHeader(raw)) { flushA(); curSubject = raw; continue; }
        if (n === "jai termine" || n === "j'ai termine" || n === "non fait" || n === "fait") continue;
        if (!curSubject) curSubject = raw; else curNotes.push(raw);
      }
      flushA();

      if (itemsA.length > 0) {
        console.info("[PRONOTE planner] Pass A items:", itemsA.length);
        return itemsA;
      }

      const itemsB = [];
      let curDue = ""; let bucket = [];
      const pushParagraphItems = () => {
        if (!curDue) { bucket = []; return; }
        const paras = [];
        let acc = [];
        for (const line of bucket) {
          if (nrm(line) === "") { if (acc.length) { paras.push(acc); acc = []; } }
          else acc.push(line);
        }
        if (acc.length) paras.push(acc);

        for (const para of paras) {
          if (!para.length) continue;
          const subject = para[0].trim();
          const notes = para.slice(1).join(" ").trim();
          const text = (subject + (notes ? " " + notes : "")).trim();
          const isTest = testWords.some(w => nrm(text).includes(nrm(w)));
          itemsB.push({
            subject: normalizeSubjectName(subject.length > 60 ? subject.slice(0, 60) : subject),
            dueDate: curDue,
            type: isTest ? "test" : "homework",
            notes
          });
        }
        bucket = [];
      };

      for (let i = 0; i < merged.length; i++) {
        const raw = merged[i].trim(); if (!raw) continue;
        const n = nrm(raw);
        if (n.startsWith("pour ")) { pushParagraphItems(); curDue = resolveDueDate(raw) || curDue; continue; }
        if (!curDue) continue;
        if (n === "jai termine" || n === "j'ai termine" || n === "non fait" || n === "fait") continue;
        bucket.push(raw);
      }
      pushParagraphItems();

      console.info("[PRONOTE planner] Pass B items:", itemsB.length);
      return itemsB;
    }

    // New: parse items based on the same heading/subject grouping used for TXT formatting.
    function parseHomeworkFromChunk(lines) {
      const items = [];
      // Local helpers and dictionaries
      const months = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12 };
      const monthsAbbrev = { janv: 1, fevr: 2, fev: 2, mar: 3, avr: 4, mai: 5, juin: 6, juil: 7, aout: 8, sept: 9, oct: 10, nov: 11, dec: 12, octo: 10 };
      const days = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 };
      const testWords = ["controle", "évaluation", "evaluation", "interrogation", "ds", "test", "quiz", "examen", "epreuve", "épreuve"];
      const isDueHeading = (line) => {
        let n = norm((line || "").replace(/[\s]+/g, ' ').trim()).replace(/[.!:]+$/, "");
        if (n.startsWith("pour ")) n = n.slice(5).trim();
        if (!n) return false;
        if (n === "aujourdhui" || n === "demain" || n === "apres demain" || n === "apres-demain") return true;
        if (/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/.test(n)) return true;
        return false;
      };
      function resolveHeadingDate(raw) {
        let t = norm((raw || "").replace(/[.!:]+$/, ""));
        if (t.startsWith("pour ")) t = t.slice(5).trim();
        if (!t) return "";
        // explicit dates first
        const dm = t.match(/\b(\d{1,2})\s+([a-z]+)\b/);
        const dmy = t.match(/\b(\d{1,2})[\\/-](\d{1,2})(?:[\\/-](\d{2,4}))?\b/);
        function toISO(y, m, d) { const yy = y < 100 ? 2000 + y : y; return `${yy}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
        // When no year is written, pick the year that keeps the due date in the future
        // (PRONOTE homework is always upcoming); otherwise a "5 janvier" captured in
        // December would resolve to the current — already past — year.
        const now = new Date();
        const nowISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const resolveYear = (m, d) => { const cur = now.getFullYear(); return toISO(cur, m, d) < nowISO ? cur + 1 : cur; };
        if (dmy) { const d = parseInt(dmy[1], 10), m = parseInt(dmy[2], 10); if (dmy[3]) { const y = parseInt(dmy[3], 10); return toISO(y < 100 ? 2000 + y : y, m, d); } return toISO(resolveYear(m, d), m, d); }
        if (dm) { const d = parseInt(dm[1], 10); let key = dm[2].replace(/[^a-z]/g, ""); const m = months[key] || monthsAbbrev[key]; if (m) return toISO(resolveYear(m, d), m, d); }
        if (t === "aujourdhui") { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        if (t === "demain") { const d = new Date(); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        if (t === "apres demain" || t === "apres-demain") { const d = new Date(); d.setDate(d.getDate() + 2); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        // weekday alone => next occurrence
        function nextWeekday(target) { const d = new Date(); let diff = target - d.getDay(); if (diff <= 0) diff += 7; d.setDate(d.getDate() + diff); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
        const wd = t.match(/\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/); if (wd && !/\b\d{1,2}\b/.test(t)) return nextWeekday(days[wd[1]]);
        // forms like 'jeudi 30 oct.' or '30 oct.' handled above
        return "";
      }
      const isSubjectLike = (line) => {
        const t = (line || "").trim(); if (!t) return false;
        if (/https?:\/\//i.test(t)) return false;
        if (isKnownSubjectName(t)) return true;
        // Exclude generic action/assignment lines that can be all-caps (e.g., AND ANNOTATE, READ, HOMEWORK)
        const stop = /^(and\s+annotate|annotate|read|homework|quiz|test|evaluation|évaluation|controle|contrôle|ds|examen|epreuve|épreuve|pages?\b)/i;
        if (stop.test(t)) return false;
        // Known subjects and patterns
        if (/^(SPE|SPÉ|FRANCAIS|FRANÇAIS|ANGLAIS|EPS|HISTOIRE|GEOGRAPHIE|GÉOGRAPHIE|ESPAGNOL|ARABE|NSI|PHYSIQUE|CHIMIE|LV\d)/i.test(t)) return true;
        // Headers ending with colon
        if (/^[\p{L}\s\-]+:$/u.test(t)) return true;
        // All-caps heuristic only if it looks like a subject (multiple words, not starting with a number or bullet)
        if (!/^([\d•]|-)/.test(t)) {
          const words = t.split(/\s+/).filter(Boolean);
          const letters = (t.match(/[\p{L}]/gu) || []).length;
          const upp = (t.match(/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ]/g) || []).length;
          const ratio = letters ? (upp / letters) : 0;
          if (words.length >= 2 && ratio >= 0.7 && t.length <= 70) return true;
        }
        return false;
      };

      let i = 0; let curDue = "";
      let pendingActions = [];
      let pendingCheckinNotes = [];
      const isCheckIn = (s) => { const t = norm((s || '').trim()); if (!t) return { is: false }; return { is: /^check\s*in\b/.test(t), advisory: /^check\s*in\b.*\badvisory\b/.test(t) }; };
      while (i < lines.length) {
        let raw = (lines[i] || "").trim();
        const n = norm(raw);
        if (!raw) { i++; continue; }
        if (n === "pour") { i++; continue; }
        if (isDueHeading(raw)) {
          // Flush any accumulated check-in notes for previous date
          if (pendingCheckinNotes.length && curDue) {
            const text = pendingCheckinNotes.join(' ').trim();
            if (text) items.push({ subject: 'Advisory Check-in', dueDate: curDue, type: 'homework', notes: text });
          }
          pendingCheckinNotes = [];
          pendingActions = [];
          curDue = resolveHeadingDate(raw) || curDue; i++; continue;
        }

        // Check-in lines handling
        const ci = isCheckIn(raw);
        if (ci.is && !ci.advisory) {
          if (curDue) pendingCheckinNotes.push(raw);
          i++; continue;
        }
        // Action-only lines (e.g., AND ANNOTATE, READ) – attach to next subject
        if (isActionOnlySubjectName(raw)) { if (curDue) pendingActions.push(raw); i++; continue; }
        if (isSubjectLike(raw) && curDue) {
          let subject = raw.replace(/:\s*$/, '');
          const ciSub = isCheckIn(subject);
          let usePendingCheckin = false;
          if (ciSub.is && ciSub.advisory) {
            subject = 'Advisory Check-in';
            usePendingCheckin = true;
          }
          const buf = []; i++;
          while (i < lines.length) {
            const r = (lines[i] || "").trim(); const nn = norm(r);
            if (!r) { i++; continue; }
            if (nn === "pour" || isDueHeading(r) || isSubjectLike(r)) break;
            buf.push(r); i++;
          }
          // Prepend any earlier check-in notes if this is an advisory subject
          if (usePendingCheckin && pendingCheckinNotes.length) {
            buf.unshift(pendingCheckinNotes.join(' '));
            pendingCheckinNotes = [];
          }
          // Prepend pending action-only lines captured before the subject
          if (pendingActions.length) { buf.unshift(pendingActions.join(' • ')); pendingActions = []; }
          const text = buf.join(" ").trim();
          const isTest = testWords.some(w => norm(text).includes(norm(w)) || norm(subject).includes(norm(w)));
          items.push({ subject: normalizeSubjectName(subject), dueDate: curDue, type: isTest ? "test" : "homework", notes: text });
          continue;
        }
        i++;
      }
      // Flush any remaining pending check-in at end of slice
      if (pendingCheckinNotes.length && curDue) {
        const text = pendingCheckinNotes.join(' ').trim();
        if (text) items.push({ subject: 'Advisory Check-in', dueDate: curDue, type: 'homework', notes: text });
      }
      return items;
    }

    function pad(n) { return String(n).padStart(2, "0"); }
    function dateFromISO(iso) { const [y, m, d] = iso.split("-").map(v => parseInt(v, 10)); return new Date(y, m - 1, d); }
    function isoFromDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

    function makeStudyPlan(items, studyDurations) {
      // Build simple study sessions leading up to each due date
      const sessions = [];
      const today = new Date(); const todayISO = isoFromDate(today);
      const buildDatesFromOffsets = (due, dueISO, offsets) => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const seen = new Set();
        const out = [];
        for (const off of (offsets || [])) {
          const d = new Date(due); d.setDate(d.getDate() - off);
          if (isoFromDate(d) < todayISO) d.setTime(start.getTime());
          const iso = isoFromDate(d);
          if (iso >= dueISO) continue;
          if (seen.has(iso)) continue;
          seen.add(iso);
          out.push(iso);
        }
        return out.sort();
      };
      const clampSessionCount = (it) => {
        const raw = parseInt(it?.sessionCount, 10);
        if (!Number.isFinite(raw) || raw <= 0) return null;
        return Math.min(6, Math.max(1, raw));
      };
      const resolveDifficulty = (value) => {
        const text = String(value || '').toLowerCase();
        return text === 'easy' || text === 'hard' ? text : 'medium';
      };
      const getMinutes = (it) => {
        const type = (it.type === 'test' || it.type === 'both') ? 'test' : 'homework';
        const diff = resolveDifficulty(it.difficulty);
        const source = studyDurations && studyDurations[type] ? studyDurations[type] : defaultStudyDurations[type];
        const fallback = defaultStudyDurations[type][diff] || defaultStudyDurations[type].medium;
        if (source && typeof source[diff] === 'number' && source[diff] > 0) return source[diff];
        return fallback;
      };

      for (const it of (items || [])) {
        if (!it || !it.dueDate) continue;
        const due = dateFromISO(it.dueDate);
        const dueISO = isoFromDate(due);
        const notesLen = (it.notes || "").length;
        const kind = (it.type === 'both') ? 'test' : it.type;
        const manual = parseInt(it.manualMinutes, 10);
        const minutes = Number.isFinite(manual) && manual > 0 ? manual : getMinutes(it);
        const sessionCount = clampSessionCount(it);
        const prefix = 'Study';

        if (kind === "test") {
          const count = sessionCount || 4;
          const offsets = Array.from({ length: count }, (_, i) => count - i);
          const dates = buildDatesFromOffsets(due, dueISO, offsets);
          for (let idx = 0; idx < dates.length; idx++) {
            sessions.push({
              date: dates[idx],
              minutes,
              kind: 'test',
              title: `${prefix} ${it.subject || ""} (${idx + 1}/${dates.length})`.trim(),
              notes: `Prep ${it.subject || ""} for ${dueISO}. ${(it.notes || '').slice(0, 160)}`
            });
          }
        } else {
          let offsets;
          if (sessionCount) offsets = Array.from({ length: sessionCount }, (_, i) => sessionCount - i);
          else if (notesLen > 140) offsets = [3, 2, 1];
          else if (notesLen > 80) offsets = [2, 1];
          else offsets = [1];
          const dates = buildDatesFromOffsets(due, dueISO, offsets);
          for (let idx = 0; idx < dates.length; idx++) {
            sessions.push({
              date: dates[idx],
              minutes,
              kind: 'homework',
              title: `${prefix} ${it.subject || ""} (${idx + 1}/${dates.length})`.trim(),
              notes: `Finish ${it.subject || ""} for ${dueISO}. ${(it.notes || '').slice(0, 160)}`
            });
          }
        }
      }
      sessions.sort((a, b) => a.date.localeCompare(b.date) || (a.title || '').localeCompare(b.title || ''));
      return sessions;
    }

    function toCSV(rows) {
      const esc = s => `"${String(s || "").replace(/"/g, '""')}"`;
      const out = [["Date", "Title", "Minutes", "Notes"]]
        .concat(rows.map(r => [r.date, r.title, r.minutes, r.notes]))
          .map(r => r.map(esc).join(","))
          .join("\n");
        return out;
      }

      function toICS(rows, studyWindows) {
        // Create non-overlapping events by stacking sessions per day
        const pad = (n) => String(n).padStart(2, '0');
        const dtStamp = new Date();
        const dtStampStr = `${dtStamp.getUTCFullYear()}${pad(dtStamp.getUTCMonth() + 1)}${pad(dtStamp.getUTCDate())}T${pad(dtStamp.getUTCHours())}${pad(dtStamp.getUTCMinutes())}${pad(dtStamp.getUTCSeconds())}Z`;
        const escText = (s) => String(s || "").replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
        const lines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//PRONOTE Auto Study Plan//EN'
        ];
        const dayStartHour = 18; // fallback start when no windows
        const gapMinutes = 5;    // small gap between sessions
        const byDate = new Map();
        for (const r of rows) {
          if (!r || !r.date) continue;
          if (!byDate.has(r.date)) byDate.set(r.date, []);
          byDate.get(r.date).push(r);
        }

        const fmtLocal = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
        const priority = (s) => (s && s.kind === 'test') ? 0 : 1; // tests first
        const parseHM = (t) => { const [H, M] = String(t || '').split(':').map(x => parseInt(x, 10) || 0); return H * 60 + M; };
        const minutesToDate = (y, m, d, total) => new Date(y, m - 1, d, Math.floor(total / 60), total % 60, 0);

        let uidCounter = 0;
        const sortedDates = Array.from(byDate.keys()).sort();
        for (const date of sortedDates) {
          const sessions = byDate.get(date).slice().sort((a, b) => priority(a) - priority(b) || (a.title || '').localeCompare(b.title || ''));
          const [y, m, d] = date.split('-').map(x => parseInt(x, 10));
          const weekday = (new Date(y, m - 1, d)).getDay();
          const wins = (studyWindows && studyWindows[String(weekday)] || []).map(w => ({ start: parseHM(w.start), end: parseHM(w.end) })).sort((a, b) => a.start - b.start);
          let winIdx = 0;
          let cursorMin = wins.length ? wins[0].start : dayStartHour * 60;

          for (const s of sessions) {
            const mins = parseInt(s.minutes, 10) || 0;
            if (wins.length) {
              while (winIdx < wins.length && cursorMin > wins[winIdx].end) winIdx++;
              if (winIdx >= wins.length) {
                // No more windows today: place sequentially after last window
                cursorMin = wins[wins.length - 1].end + gapMinutes;
              } else if (cursorMin < wins[winIdx].start) {
                cursorMin = wins[winIdx].start;
              }
              while (winIdx < wins.length && (cursorMin + mins) > wins[winIdx].end) {
                winIdx++;
                if (winIdx < wins.length) cursorMin = Math.max(cursorMin, wins[winIdx].start);
              }
              if (winIdx >= wins.length) {
                cursorMin = wins[wins.length - 1].end + gapMinutes;
              }
            }
            const start = minutesToDate(y, m, d, cursorMin);
            const end = minutesToDate(y, m, d, cursorMin + mins);
            cursorMin += mins + gapMinutes;
            const uid = `${y}${pad(m)}${pad(d)}-${uidCounter++}-${simpleHash(String(s.title || ''))}@pronote-studyplan`;
            lines.push('BEGIN:VEVENT');
            lines.push(`DTSTAMP:${dtStampStr}`);
            lines.push(`DTSTART:${fmtLocal(start)}`);
            lines.push(`DTEND:${fmtLocal(end)}`);
            lines.push(`SUMMARY:${escText(s.title)}`);
            lines.push(`DESCRIPTION:${escText(s.notes || '')}`);
            lines.push(`UID:${uid}`);
            lines.push('END:VEVENT');
          }
        }
        lines.push('END:VCALENDAR');
        return lines.join('\n');
      }

      function parseICSHomework(text) {
        try {
          const lines = String(text || '').split(/\r?\n/);
          const items = [];
          let ev = null;
          const push = () => {
            if (!ev) return;
            const dateStr = (ev.DTSTART || '').replace(/[^0-9T]/g, '');
            let ymd = '';
            if (/^\d{8}T?/.test(dateStr)) {
              const y = dateStr.slice(0, 4), m = dateStr.slice(4, 6), d = dateStr.slice(6, 8);
              ymd = `${y}-${m}-${d}`;
            }
            let summary = (ev.SUMMARY || '').trim();
            const desc = (ev.DESCRIPTION || '').replace(/\\n/g, '\n').trim();
            if (!ymd || !summary) { ev = null; return; }
            const tWords = ["controle", "évaluation", "evaluation", "interrogation", "ds", "test", "quiz", "examen", "epreuve", "épreuve"];
            const isTest = tWords.some(w => norm(summary).includes(norm(w)) || norm(desc).includes(norm(w)));
            // Normalize CHECK IN subjects into Advisory Check-in with original summary as notes
            if (/^check\s*in\b/i.test(summary)) {
              const n = String(desc || '').trim();
              const mergedNotes = (summary + (n ? (' ' + n) : ''));
              items.push({ subject: 'Advisory Check-in', dueDate: ymd, type: isTest ? 'test' : 'homework', notes: mergedNotes });
            } else {
              items.push({ subject: normalizeSubjectName(summary), dueDate: ymd, type: isTest ? 'test' : 'homework', notes: desc });
            }
            ev = null;
          };
          for (let raw of lines) {
            if (raw === 'BEGIN:VEVENT') { ev = {}; continue; }
            if (raw === 'END:VEVENT') { push(); continue; }
            if (!ev) continue;
            // Handle folded lines per RFC5545 (lines starting with space): join to previous
            if (/^[ \t]/.test(raw)) {
              const k = ev._lastKey; if (k) ev[k] = (ev[k] || '') + raw.replace(/^\s+/, '');
              continue;
            }
            const m = raw.match(/^([A-Z;-]+):(.+)$/);
            if (!m) continue;
            const key = m[1].split(';')[0];
            ev[key] = m[2];
            ev._lastKey = key;
          }
          return items;
        } catch { return []; }
      }

      function isKnownSubjectName(t) {
        const raw = String(t || '').trim();
        if (!raw) return false;
        const n = norm(raw);
        if (SUBJECT_MAP.has(n)) return true;
        return SUBJECT_PREFIXES.some((s) => n.startsWith(s));
      }
      function isActionOnlySubjectName(t) {
        const x = String(t || '').trim().replace(/^[^A-Za-zÀ-ÿ]+/, '');
        return /^(and\s+annotate|annotate|read|homework|quiz|test|evaluation|évaluation|controle|contrôle|ds|examen|epreuve|épreuve|pages?\b)/i.test(x);
      }

      const SUBJECT_CATALOG = [
        "ADVISORY",
        "ALLEMAND",
        "ALLEMAND LV2",
        "ALLEMAND LV3",
        "Alumni Panel",
        "ANGLAIS",
        "ANGLAIS ACCELERATED",
        "Anglais BFA",
        "ANGLAIS BFI ACL",
        "ANGLAIS BFI AP LANG",
        "ANGLAIS BFI AP LIT",
        "Anglais ELL",
        "ANGLAIS Honors",
        "ANGLAIS Level 1",
        "ANGLAIS Level 2",
        "ANGLAIS LVA",
        "ANGLAIS OIB",
        "ANGLAIS STANDARD",
        "Honors",
        "Level 1",
        "Level 2",
        "Level 2/3",
        "AP BIOLOGY",
        "AP CALCULUS BC",
        "AP ECONOMICS",
        "AP ENGLISH",
        "AP EUROPEAN HISTORY",
        "AP HUMAN GEOGRAPHY",
        "AP US HISTORY",
        "ARABE",
        "ARABE LV2",
        "ARABE LV3",
        "Artiste en résidence",
        "ARTS PLASTIQUES",
        "ASSEMBLY",
        "CAFETERIA",
        "CDE",
        "CONNAISSANCE DU MONDE",
        "CDM TEAM MEETING",
        "CHECK IN ADVISORY",
        "CINEMA -AUDIO",
        "CINEMA-AUDIOVISUEL",
        "COLLABORATION",
        "COLLEGE COUNSELING CLASS",
        "College PREP MATH",
        "COMPUTER SCIENCE",
        "Concours d'éloquence",
        "CONFERENCE",
        "DEPARTMENT COORDINATORS",
        "DEJEUNER AU LYCÉE",
        "DGEM",
        "DIALOGUE",
        "DIGITAL LEARNING",
        "DPT MEETING",
        "DROIT",
        "ECONOMIE APPROFONDIE",
        "ENSEIGNEMENT MORAL ET CIVIQUE",
        "ENGINEERING & DESIGN",
        "ENS SCIENTIFIQUE",
        "ENSEIGNEMENT SCIENTIFIQUE",
        "ENSEIGNEMENT SCIENTIFIQUE (MATHS)",
        "Enseignement Scientifique",
        "EPS",
        "ESPAGNOL LV3",
        "ESPAGNOL",
        "ESPAGNOL Gr. Honors",
        "ESPAGNOL Honors",
        "ESPAGNOL Intermediate",
        "ESPAGNOL LV2",
        "ETUDE",
        "EVENEMENT EXCEPTIONNEL",
        "EXPRESSION ECRITE",
        "FACULTY CHOIR",
        "FRANCAIS",
        "FRANCAIS Soutien",
        "FRANCAIS-FLS",
        "FRANÇAIS - RENFORCEMENT",
        "FRANÇAIS Honors",
        "Français Renforcement",
        "Groupe Honors",
        "Groupe Intermédiaire",
        "Intermédiaire",
        "GEOGRAPHIE (ANGLAIS)",
        "GEO BFI",
        "GEO OIB",
        "GEOGRAPHIE BFI",
        "GREC",
        "GREC MODERNE",
        "HEBREW LV2",
        "HEBREW LV3",
        "HISTOIRE GEOGRAPHIE",
        "HISTOIRE GEOGRAPHIE (ANGLAIS)",
        "HISTOIRE GEOGRAPHIE (BFI)",
        "HISTOIRE-GEOGRAPHIE",
        "HISTOIRE-GÉOGRAPHIE",
        "HISTOIRE (ANGLAIS)",
        "HISTOIRE BFI",
        "HISTOIRE OIB",
        "HISTOIRE US",
        "HISTOIRE",
        "HISTOIRE DES ARTS",
        "SPE HUMANITES, LITTERATURE ET PHILOSOPHIE",
        "IDD",
        "INFO - PPP",
        "INFORMATIQUE",
        "Introduction to Economics",
        "IQUEST",
        "SPE ISN",
        "ITALIEN",
        "ITALIEN LV2",
        "Italien LV3",
        "JAPONAIS LV2",
        "JAPONAIS LV3",
        "LATIN",
        "LELE ALLEMAND",
        "LELE ANGLAIS",
        "LELE ESPAGNOL",
        "LELE ITALIEN",
        "LELE MANDARIN",
        "LETTRES",
        "Lunch 1eres",
        "LV2",
        "LV3",
        "LVA  ANGLAIS",
        "LVA ANGLAIS",
        "MANDARIN",
        "MANDARIN LV2",
        "MANDARIN Honors",
        "MANDARIN Intermediate",
        "MANDARIN LV3",
        "MATH COLLEGE PREP",
        "MATHEMATIQUES - ENRICHMENT",
        "MATHEMATIQUES - RENFORCEMENT",
        "Groupe 1",
        "Groupe 2",
        "Groupe 3",
        "Groupe 4",
        "Groupe Advanced",
        "Groupe Honors",
        "Groupe Intermediate",
        "MATHEMATIQUES",
        "MATHÉMATIQUES",
        "MATHÉMATIQUES HON.",
        "MATHS",
        "MATHS COMP",
        "MATHS COMP ACC.",
        "MATHS EXP",
        "MATHS EXP HON",
        "MATHS EXPERTES HON.",
        "MATHS Foundation",
        "MATHS Honors",
        "MATHS Intermediate",
        "MATHS Soutien",
        "Matière non désignée",
        "MODULE FITNESS",
        "MUSIQUE",
        "OFFICE HOUR",
        "OPTIONS",
        "PARCOURS",
        "ÉTUDE SURVEILLÉE",
        "PHILOSOPHIE",
        "Portugais LV2",
        "PORTUGAIS LV3",
        "PREP SAT",
        "PUBLIC SPEAKING / WELLNESS LAB",
        "PUBLIC SPEAKING",
        "QUEST",
        "QUEST MEETING",
        "REMEDIATION MATHS",
        "HEURE DE RENCONTRE",
        "RENFORCEMENT FRANCAIS-MATHS",
        "Réservation de salle",
        "RUSSE LV2",
        "RUSSE LV3",
        "Sc. PHYSIQUE",
        "SCIENCES SOCIALES-POLITIQUES",
        "SCIENCES EXPERIMENTALES (SCIENCES)",
        "Séance sur l'IA",
        "SERVICE COMMUNAUTAIRE",
        "SES",
        "SES - AP ECONOMICS",
        "Shakespeare competition",
        "SORTIE / FIELD TRIP",
        "Soutenance de Stage",
        "SPE ALLEMAND",
        "SPE ANGLAIS",
        "SPE AP BIOLOGY",
        "SPE AP ECONOMICS",
        "SPE AP ENGLISH",
        "Spé AP Macro Economics",
        "SPE AP MACROECON",
        "Spé AP Micro Economics",
        "SPE AP MICROECON",
        "SPE ESPAGNOL",
        "SPE HG - SPE HG, GEOPOLITIQUE",
        "SPE HG, GEOPOLITIQUE",
        "SPE HLP - SPE HUMANITES, LITTERATURE ET PHILOSOPHIE",
        "SPE HUMANITES, LITTERATURE ET PHILOSOPHIE",
        "SPE ITAL",
        "SPE L DROIT",
        "SPE LLCER",
        "SPE MA - SPE MATHS HON",
        "SPE MATHS",
        "SPE MATHS ACC",
        "SPE MATHS ACC.",
        "SPE MATHS HON",
        "SPE NS - SPE NSI",
        "SPE NSI",
        "SPE PH - SPE PHYSIQUE-CHIMIE",
        "SPE PHYSIQUE",
        "SPE SE - SPE SES",
        "SPE SES",
        "SPE SV - SPE SVT",
        "SPE SVT",
        "SPE TES-L",
        "Spécialités",
        "Spécialités de 1ère",
        "Spécialités de Tle",
        "STAFF LANGUAGE CLASS",
        "STAGE",
        "Stage de fin de Seconde",
        "START UP DAY",
        "SUPPORT",
        "SVT",
        "TEAM MEETING",
        "TECHNOLOGIE",
        "TEST",
        "THEATRE",
        "Townhall 1e/Tle",
        "TPE 1er SEMESTRE",
        "Vie scolaire",
        "WELLNESS LAB"
      ];
      const SUBJECT_MAP = new Map();
      const SUBJECT_PREFIXES = [];
      SUBJECT_CATALOG.forEach((s) => {
        const key = norm(s);
        if (!SUBJECT_MAP.has(key)) SUBJECT_MAP.set(key, s);
      });
      SUBJECT_CATALOG
        .map((s) => ({ raw: s, key: norm(s) }))
        .sort((a, b) => b.key.length - a.key.length)
        .forEach((entry) => SUBJECT_PREFIXES.push(entry.key));

      function normalizeSubjectName(raw) {
        const cleaned = String(raw || '').trim().replace(/[:\s]+$/, '');
        const n = norm(cleaned);
        if (SUBJECT_MAP.has(n)) return SUBJECT_MAP.get(n);
        const nNoParen = n.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
        if (SUBJECT_MAP.has(nNoParen)) return SUBJECT_MAP.get(nNoParen);
        const match = SUBJECT_PREFIXES.find((p) => n.startsWith(p));
        if (match && SUBJECT_MAP.has(match)) return SUBJECT_MAP.get(match);
        return cleaned;
      }

      function simpleHash(text) {
        const src = String(text || '');
        let h = 0;
        for (let i = 0; i < src.length; i++) h = Math.imul(31, h) + src.charCodeAt(i) | 0;
        return Math.abs(h);
      }

      function ts() {
        const p = (n) => String(n).padStart(2, "0");
        const d = new Date();
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
      }

      function baseName() {
        const host = location.hostname.replace(/[^a-zA-Z0-9.-]/g, "_");
        return `pronote_${host}_${ts()}`;
      }

      async function finalize() {
        if (resolved) return;
        resolved = true;
        clearTimeout(stableTimer);
        clearTimeout(maxTimer);
        try { window.__PRONOTE_finalize = undefined; } catch { }
        try { console.info('[PRONOTE planner] Finalizing...'); } catch { }
        try { window.__PRONOTE_finalize = undefined; } catch { }

        const textHw = homeworkOnlyText(crossOriginIframes);
        // Parse items directly from the same chunk we used to build TXT
        let chunk = findHomeworkSlice(visibleLinesFromDoc(document));
        if (chunk.length < 3) {
          for (const d of sameOriginIframeDocs()) {
            const sliced = findHomeworkSlice(visibleLinesFromDoc(d));
            if (sliced.length >= 3) { chunk = sliced; break; }
          }
        }
        let items = parseHomeworkFromChunk(chunk);

        // Sort homework items by due date (soonest first)
        if (items && items.length) {
          items.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
        }

        // If nothing found (e.g., still on login), retry shortly if armed
        if (!items || items.length === 0) {
          try { console.info('[PRONOTE planner] No items found; will retry if armed'); } catch { }
          if (allowAutoCapture) {
            setTimeout(() => { try { runAutoCapture(); } catch { } }, 1500);
          }
          return;
        }

        // Consolidate multiple entries for the same subject on the same day
        function consolidateItems(list) {
          if (!Array.isArray(list) || !list.length) return [];
          const byKey = new Map();
          const normSubj = (s) => (s || "").replace(/:\s*$/, '').trim();
          const nkey = (s) => norm(normSubj(s));
          const contains = (big, small) => {
            const B = norm(big || "");
            const S = norm(small || "");
            return B && S && B.includes(S);
          };
          for (const it of list) {
            if (!it || !it.dueDate) continue;
            const key = `${nkey(it.subject)}|${it.dueDate}`;
            const existing = byKey.get(key);
            if (!existing) {
              byKey.set(key, { subject: normSubj(it.subject), dueDate: it.dueDate, type: it.type || "homework", notes: (it.notes || "").trim() });
            } else {
              // Merge type: if both homework and test exist, mark as 'both'
              const cur = existing.type || 'homework';
              const incoming = it.type || 'homework';
              if (cur !== incoming) {
                existing.type = 'both';
              } // else keep as is
              // Merge notes: avoid duplicates
              const a = existing.notes || ""; const b = (it.notes || "").trim();
              if (!a) existing.notes = b;
              else if (!b) { /* keep a */ }
              else if (contains(a, b)) { /* keep a */ }
              else if (contains(b, a)) { existing.notes = b; }
              else { existing.notes = `${a} ${b}`.trim(); }
            }
          }
          return Array.from(byKey.values());
        }

        // Fold action-only subjects into a known subject per date
        function unifyActionOnlySubjects(list) {
          if (!Array.isArray(list) || !list.length) return list;
          const byDate = new Map();
          for (const it of list) { if (!byDate.has(it.dueDate)) byDate.set(it.dueDate, []); byDate.get(it.dueDate).push(it); }
          const out = [];
          for (const [date, arr] of byDate) {
            const targets = arr.filter(x => isKnownSubjectName(x.subject));
            const actions = arr.filter(x => !isKnownSubjectName(x.subject) && isActionOnlySubjectName(x.subject));
            if (targets.length && actions.length) {
              let preferred = targets.find(t => /^ANGLAIS(\s|$)/i.test(String(t.subject || ''))) || targets[0];
              for (const a of actions) {
                const note = ((a.subject || '') + (a.notes ? (' • ' + a.notes) : '')).trim();
                preferred.notes = preferred.notes ? (preferred.notes + ' • ' + note) : note;
              }
              // keep targets and non-action others; drop actions
              const others = arr.filter(x => !actions.includes(x));
              out.push(...others);
            } else {
              out.push(...arr);
            }
          }
          return out;
        }

        // Optionally import homework from ICS feed (Pronote) and merge (skip in replace mode)
        try {
          const cfg = await new Promise((resolve) => {
            try { chrome.storage.sync.get({ icsEnabled: false, icsUrl: '' }, resolve); } catch { resolve({ icsEnabled: false, icsUrl: '' }); }
          });
          if (!window.__PRONOTE_REPLACE_MODE && cfg && cfg.icsEnabled && cfg.icsUrl) {
            const res = await new Promise((resolve) => {
              try { chrome.runtime.sendMessage({ type: 'PRONOTE_FETCH_ICS', url: cfg.icsUrl }, resolve); } catch { resolve(null); }
            });
            const icsText = res && res.ok ? res.text : null;
            if (icsText) {
              let icsItems = parseICSHomework(icsText);
              // Fold action-only ICS subjects (e.g., AND ANNOTATE, READ) into known subject for same date
              if (icsItems && icsItems.length) {
                const byDate = new Map();
                for (const it of icsItems) { if (!byDate.has(it.dueDate)) byDate.set(it.dueDate, []); byDate.get(it.dueDate).push(it); }
                const folded = [];
                for (const [date, arr] of byDate) {
                  const targets = arr.filter(x => isKnownSubjectName(x.subject));
                  const actions = arr.filter(x => !isKnownSubjectName(x.subject) && isActionOnlySubjectName(x.subject));
                  const others = arr.filter(x => !targets.includes(x) && !actions.includes(x));
                  if (targets.length && actions.length) {
                    // Prefer ANGLAIS variants if present; otherwise first known subject
                    let preferred = targets.find(t => /^ANGLAIS(\s|$)/i.test(t.subject)) || targets[0];
                    for (const a of actions) {
                      const note = ((a.subject || '') + (a.notes ? (' • ' + a.notes) : '')).trim();
                      preferred.notes = preferred.notes ? (preferred.notes + ' • ' + note) : note;
                    }
                    folded.push(...targets, ...others);
                  } else {
                    folded.push(...arr);
                  }
                }
                icsItems = folded;
                items.push(...icsItems);
              }
            }
          }
        } catch { }

        // Fold stray action-only subjects into a known subject per date (page + ICS combined)
        items = unifyActionOnlySubjects(items || []);

        // Consolidate after folding
        items = consolidateItems(items || []);

        // Hard replace mode: overwrite storage with current page-only items
        if (window.__PRONOTE_REPLACE_MODE) {
          const bounded = (items || []).slice(-MAX_STORED_ITEMS);
          try { await new Promise(res => chrome.storage.local.set({ pronoteItems: bounded }, res)); } catch { }
          // If page has no items, treat as clear and stop here with a toast + status
          if (!items || items.length === 0) {
            try { chrome.runtime.sendMessage({ type: 'PRONOTE_CAPTURE_STATUS', changed: true }); } catch { }
            toast('Homework cleared');
            allowAutoCapture = false;
            window.__PRONOTE_REPLACE_MODE = false;
            return;
          }
        }

        // Merge with previously stored items and only proceed if there are new ones (or replace mode)
        const normKey = (it) => `${norm((it.subject || '').trim())}|${it.dueDate || ''}|${it.type || ''}`;
        const mergeAndProceed = (stored) => {
          const existing = new Map();
          if (!window.__PRONOTE_REPLACE_MODE) {
            for (const s of (stored || [])) existing.set(normKey(s), s);
          }
          let added = 0;
          for (const it of (items || [])) {
            const k = normKey(it);
            if (!existing.has(k)) { existing.set(k, it); added++; }
          }
          const merged = Array.from(existing.values()).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '') || (a.subject || '').localeCompare(b.subject || ''));
          // Detect changes vs stored (e.g., cleanup of action-only subjects)
          const storedKeys = new Set((stored || []).map(normKey));
          const mergedKeys = new Set(merged.map(normKey));
          let changed = false;
          if (window.__PRONOTE_REPLACE_MODE || (stored || []).length !== merged.length) changed = true;
          if (!changed) {
            for (const k of mergedKeys) { if (!storedKeys.has(k)) { changed = true; break; } }
            if (!changed) { for (const k of storedKeys) { if (!mergedKeys.has(k)) { changed = true; break; } } }
          }
          if (added > 0 || changed) {
            try { chrome.storage.local.set({ pronoteItems: merged.slice(-MAX_STORED_ITEMS) }); } catch { }
          }
          return { merged, added, changed };
        };

        let mergedItems = null; let addedCount = 0; let changedFlag = false;
        try {
          const res = await new Promise((resolve) => {
            try { chrome.storage.local.get({ pronoteItems: [] }, resolve); } catch { resolve({ pronoteItems: [] }); }
          });
          // Drop any previously stored action-only pseudo-subjects (e.g., AND ANNOTATE, READ)
          const storedClean = (res && res.pronoteItems || []).filter(it => !isActionOnlySubjectName(it && it.subject));
          const out = mergeAndProceed(storedClean);
          mergedItems = out && out.merged || [];
          addedCount = out && out.added || 0;
          changedFlag = out && out.changed || false;
        } catch { mergedItems = items; addedCount = (items || []).length; }

        if (!mergedItems || mergedItems.length === 0 || (addedCount === 0 && !changedFlag && !window.__PRONOTE_REPLACE_MODE)) {
          try { chrome.runtime.sendMessage({ type: 'PRONOTE_CAPTURE_STATUS', changed: false }); } catch { }
          toast('No new homework');
          return; // nothing new
        }
        if (window.__PRONOTE_REPLACE_MODE) toast('Homework replaced');
        else if (addedCount > 0) toast(`Added ${addedCount} new homework`);
        const homeworkJson = JSON.stringify({ source: location.href, collectedAt: new Date().toISOString(), items: mergedItems }, null, 2);
        const base = baseName();
        const stableBaseName = `pronote_${location.hostname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
          chrome.storage.sync.get({ studyWindows: null, studyDurations: defaultStudyDurations }, (res) => {
            const durations = (res && res.studyDurations) || defaultStudyDurations;
            const plan = makeStudyPlan(mergedItems, durations);
            const studyPlanCsv = toCSV(plan);
            const studyPlanIcs = toICS(plan, res && res.studyWindows);
            try {
              chrome.runtime.sendMessage({
                type: "PRONOTE_SNAPSHOT_READY",
                skipDownloads,
                textHw,
                homeworkJson,
                studyPlanCsv,
                studyPlanIcs,
                baseName: base,
                stableBaseName
              }, () => { });
              skipDownloads = false;
            } catch { }
            allowAutoCapture = false;
            window.__PRONOTE_REPLACE_MODE = false;
          });
        } catch {
          const plan = makeStudyPlan(mergedItems, defaultStudyDurations);
          const studyPlanCsv = toCSV(plan);
          const studyPlanIcs = toICS(plan, null);
          try {
            chrome.runtime.sendMessage({
              type: "PRONOTE_SNAPSHOT_READY",
              skipDownloads,
              textHw,
              homeworkJson,
              studyPlanCsv,
              studyPlanIcs,
              baseName: base,
              stableBaseName
            }, () => { });
            skipDownloads = false;
          } catch { }
          allowAutoCapture = false;
          window.__PRONOTE_REPLACE_MODE = false;
        }
      }
      try { window.__PRONOTE_finalize = finalize; } catch { }
    }
})();
