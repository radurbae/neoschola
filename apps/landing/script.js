window.NEOSCHOLA_CONFIG = {
  // Ganti dengan URL domain deployment web app NeoSchola
  demoUrl: "https://app.neoschola.floc.site",
  // Ganti nomor WhatsApp admin resmi sekolah/penjualan (format internasional tanpa tanda +)
  whatsappNumber: "6285791702218",
  // Alamat email korespondensi resmi
  contactEmail: "floccreativeid@gmail.com"
};

var DEMO_CHILDREN = {
  raka: {
    name: "Raka Pratama",
    classGrade: "Kelas 4A",
    attendanceStatus: "Hadir Tepat Waktu",
    attendanceDetail: "Presensi masuk pukul 06.48 WIB",
    attendanceSub: "Tercatat oleh Wali Kelas 4A",
    taskStatus: "PR Matematika",
    taskDetail: "Batas pengumpulan besok pukul 12.00",
    taskSub: "Bab 4: Pecahan Desimal",
    sppStatus: "Lunas",
    sppDetail: "SPP November 2026",
    sppSub: "Kuitansi digital NS-202611-042",
    trendVal: "21/22 Hari",
    trendSub: "Raka Pratama, 1 izin sakit tercatat bulan ini",
    trendBars: [78, 92, 85, 64, 94, 88, 96]
  },
  nadia: {
    name: "Nadia Putri",
    classGrade: "Kelas 2B",
    attendanceStatus: "Izin Sakit Terverifikasi",
    attendanceDetail: "Keterangan izin sakit tercatat wali murid",
    attendanceSub: "Disetujui Wali Kelas 2B",
    taskStatus: "Gambar Tematik",
    taskDetail: "Tema Lingkungan Bersih",
    taskSub: "Batas pengumpulan Jumat depan",
    sppStatus: "Menunggu Verifikasi",
    sppDetail: "SPP November 2026",
    sppSub: "Referensi transfer dikirim 22 Nov",
    trendVal: "19/22 Hari",
    trendSub: "Nadia Putri, izin sakit hari ini sedang ditinjau",
    trendBars: [84, 76, 90, 68, 82, 74, 86]
  }
};

document.addEventListener("DOMContentLoaded", function () {
  initLiveClipboardFeedback();
  initHeaderState();
  initMobileDrawer();
  initChildSwitcher();
  initRoleTabs();
  initLeadForm();
  initCopyButtons();
  initDemoLinks();
  initScrollReveal();
  initSmoothScroll();
});

function initHeaderState() {
  var header = document.querySelector(".header");
  if (!header) return;

  var isScrolled = false;

  function onScrollHeader() {
    var nextScrolled = window.scrollY > 12;
    if (nextScrolled !== isScrolled) {
      isScrolled = nextScrolled;
      header.classList.toggle("is-scrolled", isScrolled);
    }
  }

  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  var sections = document.querySelectorAll("main section[id]");
  var navLinks = document.querySelectorAll(".nav-link, .nav-mobile-link");
  if (!sections.length || !navLinks.length) return;

  function setActiveNav(sectionId) {
    var targetHash = sectionId && sectionId !== "hero" ? "#" + sectionId : "";
    for (var i = 0; i < navLinks.length; i++) {
      var href = navLinks[i].getAttribute("href") || "";
      if (targetHash && href === targetHash) {
        navLinks[i].classList.add("is-active");
        navLinks[i].setAttribute("aria-current", "location");
      } else {
        navLinks[i].classList.remove("is-active");
        navLinks[i].removeAttribute("aria-current");
      }
    }
  }

  if (window.scrollY < 160) {
    setActiveNav("hero");
  }

  if (!("IntersectionObserver" in window)) return;

  var navObserver = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        setActiveNav(entries[i].target.id);
      }
    }
  }, {
    rootMargin: "-20% 0px -55% 0px",
    threshold: 0
  });

  for (var j = 0; j < sections.length; j++) {
    navObserver.observe(sections[j]);
  }
}

function initLiveClipboardFeedback() {
  if (!document.getElementById("clipboard-live-region")) {
    var liveRegion = document.createElement("div");
    liveRegion.id = "clipboard-live-region";
    liveRegion.className = "sr-only";
    liveRegion.setAttribute("aria-live", "polite");
    document.body.appendChild(liveRegion);
  }
}

function announceToScreenReader(message) {
  var region = document.getElementById("clipboard-live-region");
  if (region) {
    region.textContent = "";
    setTimeout(function () {
      region.textContent = message;
    }, 50);
  }
}

function initMobileDrawer() {
  var btnHamburger = document.getElementById("btn-hamburger");
  var drawer = document.getElementById("mobile-drawer");
  if (!btnHamburger || !drawer) return;

  function toggleDrawer(open) {
    var willOpen = typeof open === "boolean" ? open : !drawer.classList.contains("is-open");
    if (willOpen) {
      drawer.classList.add("is-open");
      btnHamburger.setAttribute("aria-expanded", "true");
    } else {
      drawer.classList.remove("is-open");
      btnHamburger.setAttribute("aria-expanded", "false");
    }
  }

  btnHamburger.addEventListener("click", function () {
    toggleDrawer();
  });

  var mobileLinks = drawer.querySelectorAll("a");
  for (var i = 0; i < mobileLinks.length; i++) {
    mobileLinks[i].addEventListener("click", function () {
      toggleDrawer(false);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) {
      toggleDrawer(false);
      btnHamburger.focus();
    }
  });

  var header = document.querySelector(".header");
  document.addEventListener("click", function (e) {
    if (drawer.classList.contains("is-open") && header && !header.contains(e.target)) {
      toggleDrawer(false);
    }
  });
}

function initChildSwitcher() {
  var tabs = document.querySelectorAll(".child-tab");
  var cardPresensi = document.getElementById("hero-card-presensi");
  var presensiStatus = document.getElementById("hero-presensi-status");
  var presensiDetail = document.getElementById("hero-presensi-detail");
  var presensiSub = document.getElementById("hero-presensi-sub");

  var cardTugas = document.getElementById("hero-card-tugas");
  var tugasStatus = document.getElementById("hero-tugas-status");
  var tugasDetail = document.getElementById("hero-tugas-detail");
  var tugasSub = document.getElementById("hero-tugas-sub");

  var cardSpp = document.getElementById("hero-card-spp");
  var sppStatus = document.getElementById("hero-spp-status");
  var sppDetail = document.getElementById("hero-spp-detail");
  var sppSub = document.getElementById("hero-spp-sub");

  var trendCard = document.querySelector(".preview-trend-card");
  var trendVal = document.getElementById("hero-trend-val");
  var trendSub = document.getElementById("hero-trend-sub");
  var trendBarsWrap = document.getElementById("hero-trend-bars");

  if (!tabs.length || !presensiStatus) return;

  function triggerSwitchMotion(el) {
    if (!el) return;
    el.classList.remove("is-switching");
    void el.offsetWidth;
    el.classList.add("is-switching");
  }

  function updateChildView(childKey) {
    var data = DEMO_CHILDREN[childKey];
    if (!data) return;

    presensiStatus.textContent = data.attendanceStatus;
    presensiDetail.textContent = data.attendanceDetail;
    presensiSub.textContent = data.attendanceSub;
    if (cardPresensi) {
      cardPresensi.className = childKey === "raka"
        ? "preview-pastel-card card-mint"
        : "preview-pastel-card card-butter";
    }

    tugasStatus.textContent = data.taskStatus;
    tugasDetail.textContent = data.taskDetail;
    tugasSub.textContent = data.taskSub;

    sppStatus.textContent = data.sppStatus;
    sppDetail.textContent = data.sppDetail;
    sppSub.textContent = data.sppSub;
    if (cardSpp) {
      cardSpp.className = childKey === "raka"
        ? "preview-pastel-card card-mint"
        : "preview-pastel-card card-butter";
    }

    if (trendVal) trendVal.textContent = data.trendVal;
    if (trendSub) trendSub.textContent = data.trendSub;
    if (trendBarsWrap && data.trendBars) {
      var bars = trendBarsWrap.querySelectorAll(".trend-bar");
      for (var k = 0; k < bars.length; k++) {
        if (typeof data.trendBars[k] === "number") {
          bars[k].style.height = data.trendBars[k] + "%";
        }
      }
    }

    triggerSwitchMotion(cardPresensi);
    triggerSwitchMotion(cardTugas);
    triggerSwitchMotion(cardSpp);
    triggerSwitchMotion(trendCard);

    announceToScreenReader("Menampilkan data " + data.name + ", " + data.classGrade);
  }

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      for (var j = 0; j < tabs.length; j++) {
        tabs[j].classList.remove("is-active");
        tabs[j].setAttribute("aria-pressed", "false");
      }
      this.classList.add("is-active");
      this.setAttribute("aria-pressed", "true");
      var childKey = this.getAttribute("data-child");
      updateChildView(childKey);
    });
  }
}

function initRoleTabs() {
  var tablist = document.querySelector('[role="tablist"].role-tabs');
  if (!tablist) return;

  var tabs = tablist.querySelectorAll('[role="tab"]');
  var panels = document.querySelectorAll('[role="tabpanel"].role-panel');

  function switchTab(targetTab) {
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove("is-active");
      tabs[i].setAttribute("aria-selected", "false");
      tabs[i].setAttribute("tabindex", "-1");
    }
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.remove("is-active");
      panels[j].hidden = true;
    }

    targetTab.classList.add("is-active");
    targetTab.setAttribute("aria-selected", "true");
    targetTab.removeAttribute("tabindex");
    targetTab.focus();

    var panelId = targetTab.getAttribute("aria-controls");
    var activePanel = document.getElementById(panelId);
    if (activePanel) {
      activePanel.classList.add("is-active");
      activePanel.hidden = false;
    }
  }

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener("click", function () {
      switchTab(this);
    });

    tabs[i].addEventListener("keydown", function (e) {
      var tabListArray = Array.prototype.slice.call(tabs);
      var index = tabListArray.indexOf(this);

      if (e.key === "ArrowRight") {
        e.preventDefault();
        var nextTab = tabListArray[(index + 1) % tabListArray.length];
        switchTab(nextTab);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        var prevTab = tabListArray[(index - 1 + tabListArray.length) % tabListArray.length];
        switchTab(prevTab);
      } else if (e.key === "Home") {
        e.preventDefault();
        switchTab(tabListArray[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        switchTab(tabListArray[tabListArray.length - 1]);
      }
    });
  }
}

// Fallback for non-HTTPS origins or environments where navigator.clipboard is rejected
function copyTextFallback(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  var successful = false;
  try {
    successful = document.execCommand("copy");
  } catch (err) {
    successful = false;
  }
  document.body.removeChild(textArea);
  return successful;
}

function copyToClipboard(text, onSuccess, onError) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(function () {
      var ok = copyTextFallback(text);
      if (ok && onSuccess) onSuccess();
      else if (!ok && onError) onError();
    });
  } else {
    var ok = copyTextFallback(text);
    if (ok && onSuccess) onSuccess();
    else if (!ok && onError) onError();
  }
}

function initCopyButtons() {
  var buttons = document.querySelectorAll(".btn-copy");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener("click", function () {
      var btn = this;
      var textToCopy = btn.getAttribute("data-copy-text") || "";
      var defaultLabel = btn.getAttribute("data-default-label") || btn.textContent;
      if (!textToCopy) return;

      copyToClipboard(textToCopy, function () {
        btn.textContent = "Tersalin!";
        btn.classList.add("is-copied");
        announceToScreenReader(textToCopy + " berhasil disalin ke papan klip");
        setTimeout(function () {
          btn.textContent = defaultLabel;
          btn.classList.remove("is-copied");
        }, 2200);
      }, function () {
        btn.textContent = "Gagal Salin";
        setTimeout(function () {
          btn.textContent = defaultLabel;
        }, 2200);
      });
    });
  }
}

function initDemoLinks() {
  var cfg = window.NEOSCHOLA_CONFIG || {};
  var demoBtns = document.querySelectorAll(".btn-open-demo");
  var demoUrl = cfg.demoUrl || "https://app.neoschola.floc.site";
  for (var i = 0; i < demoBtns.length; i++) {
    demoBtns[i].setAttribute("href", demoUrl);
    demoBtns[i].setAttribute("target", "_blank");
    demoBtns[i].setAttribute("rel", "noopener noreferrer");
  }

  var btnWaConsult = document.getElementById("btn-wa-consult");
  if (btnWaConsult) {
    var waNumber = cfg.whatsappNumber || "6285791702218";
    var consultText = encodeURIComponent(
      "Halo Tim NeoSchola, saya ingin berkonsultasi mengenai portal sekolah."
    );
    btnWaConsult.setAttribute("href", "https://wa.me/" + waNumber + "?text=" + consultText);
  }

  var btnWaDirect = document.getElementById("btn-wa-direct");
  if (btnWaDirect) {
    var defaultWaNumber = cfg.whatsappNumber || "6285791702218";
    var defaultDirectText = encodeURIComponent(
      "Halo Tim NeoSchola, saya ingin menjadwalkan demo portal sekolah."
    );
    btnWaDirect.setAttribute("href", "https://wa.me/" + defaultWaNumber + "?text=" + defaultDirectText);
  }

  var linkContactEmail = document.getElementById("link-contact-email");
  if (linkContactEmail) {
    var contactEmail = cfg.contactEmail || "floccreativeid@gmail.com";
    linkContactEmail.setAttribute("href", "mailto:" + contactEmail);
    linkContactEmail.textContent = contactEmail;
  }
}

function initLeadForm() {
  var form = document.getElementById("lead-form");
  if (!form) return;

  var schoolNameInput = document.getElementById("lead-school-name");
  var schoolLevelSelect = document.getElementById("lead-school-level");
  var studentCountInput = document.getElementById("lead-student-count");
  var contactNameInput = document.getElementById("lead-contact-name");
  var notesInput = document.getElementById("lead-notes");

  var errorSchool = document.getElementById("error-school-name");
  var errorContact = document.getElementById("error-contact-name");

  var confirmationBox = document.getElementById("lead-confirmation");
  var btnWaDirect = document.getElementById("btn-wa-direct");
  var btnCopyMsg = document.getElementById("btn-copy-wa-message");

  function setFieldError(input, errorEl, hasError) {
    if (!input) return;
    if (hasError) {
      input.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      if (errorEl) {
        input.setAttribute("aria-describedby", errorEl.id);
        errorEl.classList.add("is-visible");
      }
    } else {
      input.classList.remove("has-error");
      input.setAttribute("aria-invalid", "false");
      if (errorEl) {
        input.removeAttribute("aria-describedby");
        errorEl.classList.remove("is-visible");
      }
    }
  }

  function validate() {
    var isSchoolValid = Boolean(schoolNameInput.value.trim());
    setFieldError(schoolNameInput, errorSchool, !isSchoolValid);

    var isContactValid = Boolean(contactNameInput.value.trim());
    setFieldError(contactNameInput, errorContact, !isContactValid);

    return isSchoolValid && isContactValid;
  }

  schoolNameInput.addEventListener("input", function () {
    var hasError = !this.value.trim();
    setFieldError(this, errorSchool, hasError);
  });

  contactNameInput.addEventListener("input", function () {
    var hasError = !this.value.trim();
    setFieldError(this, errorContact, hasError);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) {
      var firstError = form.querySelector(".has-error");
      if (firstError) firstError.focus();
      return;
    }

    var schoolName = schoolNameInput.value.trim();
    var level = schoolLevelSelect.value || "Belum dipilih";
    var studentCount = studentCountInput.value.trim() || "-";
    var contactName = contactNameInput.value.trim();
    var notes = notesInput.value.trim() || "Tidak ada catatan tambahan";

    var waLines = [
      "Halo Tim NeoSchola, saya ingin menjadwalkan demo dan konsultasi implementasi portal sekolah:",
      "",
      "* Nama Sekolah: " + schoolName,
      "* Jenjang: " + level,
      "* Perkiraan Siswa: " + studentCount,
      "* Nama & Jabatan: " + contactName,
      "* Catatan Kebutuhan: " + notes,
      "",
      "Mohon informasi ketersediaan jadwal demo daring atau paparan di sekolah kami. Terima kasih."
    ];

    var waMessage = waLines.join("\n");
    var waNumber = (window.NEOSCHOLA_CONFIG && window.NEOSCHOLA_CONFIG.whatsappNumber) || "6285791702218";
    var waUrl = "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(waMessage);

    window.open(waUrl, "_blank", "noopener,noreferrer");

    if (confirmationBox) {
      confirmationBox.hidden = false;
      confirmationBox.classList.add("is-visible");
      if (btnWaDirect) {
        btnWaDirect.setAttribute("href", waUrl);
      }
      if (btnCopyMsg) {
        btnCopyMsg.setAttribute("data-copy-text", waMessage);
      }
      confirmationBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
      announceToScreenReader("Jadwal demo berhasil disusun. Silakan lanjutkan ke WhatsApp.");
    }
  });
}

function initScrollReveal() {
  var targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) {
    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add("is-revealed");
    }
    return;
  }

  function revealVisible() {
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i];
      if (el.classList.contains("is-revealed")) continue;
      var rect = el.getBoundingClientRect();
      if (rect.top <= viewH + 80) {
        el.classList.add("is-revealed");
      }
    }
  }

  revealVisible();
  document.documentElement.classList.add("has-reveal");

  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add("is-revealed");
        observer.unobserve(entries[i].target);
      }
    }
  }, {
    threshold: 0.01,
    rootMargin: "0px 0px 80px 0px"
  });

  for (var j = 0; j < targets.length; j++) {
    if (!targets[j].classList.contains("is-revealed")) {
      observer.observe(targets[j]);
    }
  }

  window.addEventListener("hashchange", revealVisible);
}

function initSmoothScroll() {
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var coarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (reducedMotion || coarsePointer || !finePointer) return;

  document.documentElement.classList.add("has-smooth-scroll");

  var currentY = window.scrollY || window.pageYOffset;
  var targetY = currentY;
  var lastWrittenY = currentY;
  var rafId = null;
  var lastTime = 0;

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function getMaxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTime = 0;
    }
  }

  function step(now) {
    var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = now;
    var damping = 1 - Math.exp(-10.5 * dt);
    currentY += (targetY - currentY) * damping;

    if (Math.abs(targetY - currentY) < 0.35) {
      currentY = targetY;
      lastWrittenY = currentY;
      window.scrollTo(0, currentY);
      rafId = null;
      lastTime = 0;
      return;
    }

    lastWrittenY = currentY;
    window.scrollTo(0, currentY);
    rafId = requestAnimationFrame(step);
  }

  function startLoop() {
    if (rafId === null) {
      lastTime = 0;
      rafId = requestAnimationFrame(step);
    }
  }

  function hasScrollableParent(target, deltaY) {
    var el = target && target.nodeType === 1 ? target : null;
    while (el && el !== document.body && el !== document.documentElement) {
      var style = window.getComputedStyle(el);
      var overflowY = style ? style.overflowY : "";
      var isScrollable = el.tagName === "TEXTAREA" || overflowY === "auto" || overflowY === "scroll";
      if (isScrollable && el.scrollHeight > el.clientHeight + 1) {
        var canScrollDown = deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        var canScrollUp = deltaY < 0 && el.scrollTop > 0;
        if (canScrollDown || canScrollUp) {
          return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }

  window.addEventListener("wheel", function (e) {
    if (!e.cancelable) return;
    if (e.ctrlKey || e.metaKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (hasScrollableParent(e.target, e.deltaY)) return;

    var delta = e.deltaY;
    if (e.deltaMode === 1) {
      delta *= 28;
    } else if (e.deltaMode === 2) {
      delta *= window.innerHeight * 0.85;
    }
    delta = clamp(delta, -320, 320);

    e.preventDefault();

    if (rafId === null) {
      currentY = window.scrollY || window.pageYOffset;
      targetY = currentY;
    }
    targetY = clamp(targetY + delta, 0, getMaxScroll());
    startLoop();
  }, { passive: false });

  window.addEventListener("scroll", function () {
    var actualY = window.scrollY || window.pageYOffset;
    if (Math.abs(actualY - lastWrittenY) > 2) {
      stopLoop();
      currentY = actualY;
      targetY = actualY;
      lastWrittenY = actualY;
    }
  }, { passive: true });

  window.addEventListener("keydown", function (e) {
    var keys = {
      ArrowUp: true,
      ArrowDown: true,
      PageUp: true,
      PageDown: true,
      Home: true,
      End: true
    };
    var tag = e.target && e.target.tagName ? e.target.tagName : "";
    var isSpace = e.key === " " && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && tag !== "BUTTON" && tag !== "A";
    if (keys[e.key] || isSpace) {
      stopLoop();
      currentY = window.scrollY || window.pageYOffset;
      targetY = currentY;
      lastWrittenY = currentY;
    }
  });

  window.addEventListener("mousedown", function () {
    stopLoop();
    currentY = window.scrollY || window.pageYOffset;
    targetY = currentY;
    lastWrittenY = currentY;
  });

  window.addEventListener("resize", function () {
    var maxScroll = getMaxScroll();
    targetY = clamp(targetY, 0, maxScroll);
    currentY = clamp(currentY, 0, maxScroll);
  }, { passive: true });

  var anchorLinks = document.querySelectorAll('a[href^="#"]');
  for (var i = 0; i < anchorLinks.length; i++) {
    anchorLinks[i].addEventListener("click", function (e) {
      var href = this.getAttribute("href");
      if (!href || href === "#" || href === "#main-content") return;
      var targetEl = document.getElementById(href.slice(1));
      if (!targetEl) return;

      e.preventDefault();
      try {
        history.pushState(null, "", href);
      } catch (err) {}

      if (rafId === null) {
        currentY = window.scrollY || window.pageYOffset;
      }
      targetY = clamp(targetEl.getBoundingClientRect().top + (window.scrollY || window.pageYOffset) - 84, 0, getMaxScroll());
      startLoop();
    });
  }
}
