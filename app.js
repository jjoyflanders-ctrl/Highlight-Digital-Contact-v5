/* Highlight Contact Card — app.js (clean) */

const CSV_URL = "./employees.csv";

// Fallback data (so the demo still works if employees.csv fails to load)
const FALLBACK_PEOPLE = [
  {
    first_name: "Taryn",
    last_name: "Swayze",
    title: "Packaging Engineer",
    organization: "Highlight Industries, Inc.",
    phone: "616-531-2464 x242",
    email: "tarynm@highlightindustries.com",
    website: "https://www.highlightindustries.com",
    slug: "taryn-swayze",
  },
  {
    first_name: "Jessica",
    last_name: "Flanders",
    title: "E-commerce & Inventory Administrator",
    organization: "Highlight Industries, Inc.",
    phone: "616-531-2464 x000",
    email: "jessica.flanders@highlightindustries.com",
    website: "https://www.highlightindustries.com",
    slug: "jessica-flanders",
  },
];

function qs(id) {
  return document.getElementById(id);
}
function getParam(name) {
  return new URL(window.location.href).searchParams.get(name);
}
function slugify(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const nx = text[i + 1];

    if (ch === '"' && inQ && nx === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === "," && !inQ) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQ) {
      if (cur.length || row.length) {
        row.push(cur);
        cur = "";
        rows.push(row);
        row = [];
      }
      continue;
    }
    cur += ch;
  }

  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }

  const header = (rows.shift() || []).map((h) =>
    slugify(h).replace(/-/g, "_")
  );

  return rows
    .filter((r) => r.some((v) => String(v || "").trim() !== ""))
    .map((r) => {
      const o = {};
      header.forEach((h, idx) => (o[h] = (r[idx] ?? "").trim()));
      return o;
    });
}

function initials(first, last) {
  const f = (first || "").trim()[0] || "";
  const l = (last || "").trim()[0] || "";
  return ((f + l).toUpperCase()) || "H";
}

function normalizeTelHref(tel) {
  const raw = (tel || "").trim();
  if (!raw) return "";

  const m = raw.match(/(.*?)(?:\s*(?:x|ext\.?)\s*(\d+))$/i);
  const main = (m ? m[1] : raw).replace(/[^\d+]/g, "");
  const ext = m ? m[2] : "";
  return ext ? `tel:${main};ext=${ext}` : `tel:${main}`;
}

function buildVCard(p, pageUrl) {
  const first = p.first_name || "";
  const last = p.last_name || "";
  const full = `${first} ${last}`.trim();

  const org = p.organization || "Highlight Industries, Inc.";
  const title = p.title || "";
  const email = p.email || "";
  const phone = p.phone || "";
  const website = p.website || "https://www.highlightindustries.com";

  const L = [];
  L.push("BEGIN:VCARD", "VERSION:3.0");
  L.push(`N:${last};${first};;;`);
  L.push(`FN:${full}`);
  L.push(`ORG:${org}`);
  if (title) L.push(`TITLE:${title}`);

  if (phone) {
    const digits = phone.replace(/[^\d+]/g, "");
    if (digits) L.push(`TEL;TYPE=WORK,VOICE:${digits}`);
  }
  if (email) L.push(`EMAIL;TYPE=INTERNET,WORK:${email}`);
  if (website) L.push(`URL:${website}`);
  if (pageUrl) L.push(`NOTE:Contact card: ${pageUrl}`);

  L.push("END:VCARD");
  return L.join("\r\n") + "\r\n";
}

function downloadText(filename, text, mime = "text/vcard") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (_) {}
    ta.remove();
    return ok;
  }
}

/**
 * QR rendering — FIXED:
 * - clears container
 * - generates QR
 * - removes any extra generated nodes (prevents "double edge" / duplicates)
 */
function renderQr(el, url, size) {
  if (!el) return;

  const s = size || 200;

  // If already rendered, don't re-render (prevents flashes)
  if (el.querySelector("img")) return;

  el.innerHTML = "";
  const img = document.createElement("img");
  img.alt = "QR Code";
  img.width = s;
  img.height = s;
  img.loading = "lazy";
  img.referrerPolicy = "no-referrer";
  img.src = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=${s}`;
  el.appendChild(img);
}

function openShareModal(url, p) {
  const modal = qs("shareModal");
  const hint = qs("shareHint");

  const close = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  qs("shareBackdrop").onclick = close;
  qs("shareClose").onclick = close;

  qs("shareLinkInput").value = url;

  qs("copyLinkBtn").onclick = async () => {
    const ok = await copyToClipboard(url);
    hint.textContent = ok
      ? "Link copied."
      : "Couldn't copy automatically—select and copy.";
    setTimeout(() => (hint.textContent = ""), 2200);
  };

  const fullName = `${p.first_name || ""} ${p.last_name || ""}`.trim();
  qs("smsShare").href = `sms:&body=${encodeURIComponent(`Save my contact: ${url}`)}`;
  qs("emailShare").href =
    `mailto:?subject=${encodeURIComponent(`Contact: ${fullName} (Highlight)`)}&body=` +
    encodeURIComponent(`Here’s my contact card:\n${url}\n\n— ${fullName}`);

  const u = encodeURIComponent(url);
  qs("linkedinShare").href = `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
  qs("facebookShare").href = `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  qs("xShare").href = `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent("Save my contact")}`;

  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      window.removeEventListener("keydown", onKey);
    }
  };
  window.addEventListener("keydown", onKey);
}

function normalizePerson(p) {
  const first = p.first_name || p.first || "";
  const last = p.last_name || p.last || "";
  p.first_name = first;
  p.last_name = last;
  p.slug = p.slug || slugify(`${first}-${last}`);
  p.organization = p.organization || p.company || "Highlight Industries, Inc.";
  p.website = p.website || "https://www.highlightindustries.com";
  return p;
}


function fullName(p){
  return `${(p.first_name||"").trim()} ${(p.last_name||"").trim()}`.trim();
}
function openPersonSlug(slug){
  if(!slug) return;
  const u = new URL(window.location.href);
  u.searchParams.set("u", slug);
  window.location.href = u.toString();
}
function buildEmployeeDatalist(people){
  const dl = qs("employeeList");
  if(!dl) return;
  dl.innerHTML = "";
  people.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = fullName(p);
    opt.dataset.slug = p.slug || "";
    dl.appendChild(opt);
  });
}
function matchSlugFromInput(val, people){
  const v = String(val||"").trim().toLowerCase();
  if(!v) return "";
  // exact match on full name
  const exact = people.find(p=>fullName(p).toLowerCase()===v);
  if(exact) return exact.slug;
  // substring match
  const sub = people.find(p=>fullName(p).toLowerCase().includes(v));
  return sub ? sub.slug : "";
}


function renderPerson(p) {
  const person = normalizePerson(p);

  const pageUrl = new URL(window.location.href);
  pageUrl.searchParams.set("u", person.slug);
  const url = pageUrl.toString();

  // Desktop fields
  qs("initials").textContent = initials(person.first_name, person.last_name);
  qs("name").textContent = `${person.first_name} ${person.last_name}`.trim();
  qs("title").textContent = person.title || "";
  qs("company").textContent = person.organization || "";

  qs("phoneText").textContent = person.phone || "";
  qs("emailText").textContent = person.email || "";
  qs("webText").textContent =
    (person.website || "").replace(/^https?:\/\//, "") || "www.highlightindustries.com";

  qs("phoneRow").href = normalizeTelHref(person.phone || "");
  qs("emailRow").href = person.email ? `mailto:${person.email}` : "#";
  qs("webRow").href = person.website || "https://www.highlightindustries.com";

  // Mobile fields
  qs("mName").textContent = `${person.first_name} ${person.last_name}`.trim();
  qs("mTitle").textContent = person.title || "";
  qs("mCompany").textContent = person.organization || "";

  qs("mPhoneText").textContent = person.phone || "";
  qs("mEmailText").textContent = person.email || "";
  qs("mWebText").textContent =
    (person.website || "").replace(/^https?:\/\//, "") || "www.highlightindustries.com";

  qs("mPhoneRow").href = normalizeTelHref(person.phone || "");
  qs("mEmailRow").href = person.email ? `mailto:${person.email}` : "#";
  qs("mWebRow").href = person.website || "https://www.highlightindustries.com";

  // QR codes (desktop + mobile)
  renderQr(qs("qrDesktop"), url, 220);
  renderQr(qs("qrMobile"), url, 210);

  // Save vCard
  const save = () =>
    downloadText(`${person.slug}.vcf`, buildVCard(person, url), "text/vcard");

  qs("saveBtnDesktop").onclick = save;
  qs("saveBtnMobile").onclick = save;


  // Desktop: "Send to Phone" (copy link on desktop; share sheet on mobile)
  const sendBtn = qs("sendToPhoneDesktop");
  if(sendBtn){
    sendBtn.onclick = async () => {
      const title = "Highlight contact card";
      const text = `Save my contact: ${url}`;

      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (e) {}
      }

      const ok = await copyToClipboard(url);
      alert(ok ? "Link copied! Paste it into a text/email to send to a phone." : "Couldn't copy automatically—select and copy the URL from Share.");
    };
  }


  // Share
  qs("shareBtn").onclick = async () => {
    const title = "Highlight contact card";
    const text = `Save my contact: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        // fall through to modal
      }
    }
    openShareModal(url, person);
  };
}

async function main() {
  const slug = getParam("u") || "taryn-swayze";

  let people = [];
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const csvText = await res.text();
    people = parseCSV(csvText).map(normalizePerson);
    if (!people.length) throw new Error("No rows parsed from employees.csv");
  } catch (err) {
    const msg =
      "Could not load employees.csv (" +
      (err && err.message ? err.message : "unknown error") +
      "). Using fallback demo data.";
    console.warn(msg, err);
    if (qs("name")) qs("name").textContent = msg;
    if (qs("mName")) qs("mName").textContent = msg;
    people = FALLBACK_PEOPLE.map(normalizePerson);
  }


  // Build datalist for search (desktop + modal)
  buildEmployeeDatalist(people);

  // Desktop search
  const sIn = qs("employeeSearch");
  const sGo = qs("employeeGo");
  if(sIn && sGo){
    sGo.onclick = () => {
      const slug2 = matchSlugFromInput(sIn.value, people);
      if(slug2) openPersonSlug(slug2);
    };
    sIn.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        e.preventDefault();
        sGo.click();
      }
    });
  }

  // Mobile "Find" modal
  const openSearch = () => {
    const modal = qs("searchModal");
    if(!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    const inp = qs("searchInput");
    if(inp) { inp.value=""; inp.focus(); }
  };
  const closeSearch = () => {
    const modal = qs("searchModal");
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  };

  const fBtn = qs("findBtnMobile");
  if(fBtn) fBtn.onclick = openSearch;
  const b = qs("searchBackdrop"); if(b) b.onclick = closeSearch;
  const c = qs("searchClose"); if(c) c.onclick = closeSearch;

  const sg = qs("searchGoBtn");
  const si = qs("searchInput");
  if(sg && si){
    sg.onclick = () => {
      const slug2 = matchSlugFromInput(si.value, people);
      if(slug2) { closeSearch(); openPersonSlug(slug2); }
      else { const h = qs("searchHint"); if(h) h.textContent = "No match — try first/last name."; }
    };
    si.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){ e.preventDefault(); sg.click(); }
    });
  }

  // PWA install (Chrome/Edge on desktop + Android)
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt",(e)=>{
    e.preventDefault();
    deferredPrompt = e;
    const ib = qs("installBtn");
    if(ib){ ib.style.display = "inline-flex"; }
  });
  const ib = qs("installBtn");
  if(ib){
    ib.onclick = async () => {
      if(!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      ib.style.display = "none";
    };
  }


  const person = people.find((p) => (p.slug || "") === slug) || people[0];
  if (!person) {
    if (qs("name")) qs("name").textContent = "No employees found";
    if (qs("mName")) qs("mName").textContent = "No employees found";
    return;
  }

  renderPerson(person);
}

main();
