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
    sppSub: "Kuitansi digital NS-202611-042"
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
    sppSub: "Referensi transfer dikirim 22 Nov"
  }
};

document.addEventListener("DOMContentLoaded", function () {
  initLiveClipboardFeedback();
  initMobileDrawer();
  initChildSwitcher();
  initRoleTabs();
  initLeadForm();
  initCopyButtons();
  initDemoLinks();
});

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

  if (!tabs.length || !presensiStatus) return;

  function updateChildView(childKey) {
    var data = DEMO_CHILDREN[childKey];
    if (!data) return;

    presensiStatus.textContent = data.attendanceStatus;
    presensiDetail.textContent = data.attendanceDetail;
    presensiSub.textContent = data.attendanceSub;
    if (cardPresensi) {
      if (childKey === "raka") {
        cardPresensi.className = "preview-pastel-card card-mint";
      } else {
        cardPresensi.className = "preview-pastel-card card-butter";
      }
    }

    tugasStatus.textContent = data.taskStatus;
    tugasDetail.textContent = data.taskDetail;
    tugasSub.textContent = data.taskSub;

    sppStatus.textContent = data.sppStatus;
    sppDetail.textContent = data.sppDetail;
    sppSub.textContent = data.sppSub;
    if (cardSpp) {
      if (childKey === "raka") {
        cardSpp.className = "preview-pastel-card card-mint";
      } else {
        cardSpp.className = "preview-pastel-card card-butter";
      }
    }

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
