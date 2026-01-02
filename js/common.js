document.addEventListener("DOMContentLoaded", () => {
  console.log('[common.js] DOMContentLoaded fired');
  // Diagnostic: log every click at capture phase to ensure events reach document
  document.addEventListener('click', function (ev) {
    try {
      const tgt = ev.target;
      const inClickable = !!tgt.closest && !!tgt.closest('.click');
      // Only verbose-log clicks that are in project "click" areas to avoid noisy output
      if (inClickable) {
        console.log('[capture-click] target:', tgt.tagName, 'classList:', tgt.className, 'in .click?:', inClickable);
      }
    } catch (e) {
      console.log('[capture-click] error reading target', e);
    }
  }, true); // use capture phase

  // Prevent .txt_t clicks from triggering higher-level delegated handlers (e.g., mailto/link delegation)
  // We use capture-phase listener so this runs before delegated handlers and stops propagation.
  try {
    document.addEventListener('click', function (e) {
      try {
        const txt = e.target.closest && e.target.closest('.txt_t');
        if (!txt) return;
        // Only affect aside items' .txt_t to avoid side-effects elsewhere
        const inAside = !!txt.closest && !!txt.closest('aside');
        if (!inAside) return;
        // Prevent default navigation and stop propagation so mailto or delegated anchor handlers don't run
        e.preventDefault();
        e.stopPropagation();
        // if there is an anchor inside the text we still don't want it to activate via click
        const a = txt.querySelector && txt.querySelector('a[href^="mailto:"]');
        if (a) {
          try { a.blur && a.blur(); } catch (er) { }
        }
        // Optionally provide a small visual cue or do nothing; for now just swallow the click
      } catch (err) { /* ignore per-click errors */ }
    }, true);
  } catch (e) { /* ignore if addEventListener not available */ }

  /* ==================================================
      0. 필수 DOM
  ================================================== */
  const wrapper = document.querySelector(".horizontal-wrapper");
  const track = document.querySelector(".horizontal-scroll");
  const panels = document.querySelectorAll(".panel");

  // 페이지에 가로 레이아웃이 있는지 체크합니다. 없는 경우에도 사이드 메뉴 등 일반 동작은 유지합니다.
  const hasHorizontal = !!(wrapper && track && panels.length);
  if (!hasHorizontal) {
    console.debug("No horizontal layout on this page — skipping horizontal scroll init.");
  }

  /* ==================================================
      1. 가로 스크롤 너비 계산 (hasHorizontal인 경우)
  ================================================== */
  let totalWidth = 0;

  // Helper: clear any selection markers from illust gallery images
  function clearIllustSelection() {
    try {
      const asideEl = document.querySelector('aside');
      // remove 'on' marker from any aside list items to ensure no item appears active
      try {
        const lis = document.querySelectorAll('aside ul > li');
        lis.forEach(li => li.classList.remove('on'));
      } catch (e) { }

      if (!asideEl) return;
      // remove selection markers and any focus from all gallery images in document
      const imgs = Array.from(document.querySelectorAll('.illust-track img'));
      imgs.forEach(img => {
        try {
          // classes/attributes
          img.classList.remove('selected');
          img.removeAttribute('aria-selected');
          img.removeAttribute('data-selected');
          // remove any inline focus visuals
          try { img.style.removeProperty('outline'); img.style.removeProperty('boxShadow'); img.style.removeProperty('transform'); img.style.removeProperty('opacity'); img.style.removeProperty('filter'); } catch (e) { }
          // remove cloned marker so future setup can recreate clones cleanly
          try { delete img.dataset.cloned; } catch (e) { }
          // forcibly restore natural display styles
          try { img.style.display = ''; img.style.visibility = ''; img.style.zIndex = ''; } catch (e) { }
          try { if (typeof img.blur === 'function') img.blur(); } catch (e) { }
        } catch (e) { /* ignore individual image errors */ }
      });

      // reset track cloning or fully rebuild track from original snapshot if present
      try {
        const illustLi = document.querySelector('aside ul > li.illustpop');
        if (illustLi && illustLi.dataset && illustLi.dataset._orig) {
          // replace the li element to remove any attached event listeners/styles
          const parent = illustLi.parentElement;
          const newLi = document.createElement('li');
          newLi.className = illustLi.className.replace(/\bon\b/, '').trim();
          newLi.innerHTML = illustLi.dataset._orig;
          try { delete newLi.dataset._orig; } catch (e) { }
          try { parent.replaceChild(newLi, illustLi); } catch (e) { /* fallback */ illustLi.innerHTML = illustLi.dataset._orig; }
        } else {
          const track = document.querySelector('.illust-track');
          if (track && track.dataset && track.dataset.originalHtml) {
            // replace track element rather than mutate innerHTML to clear attached handlers
            const wrapper = track.parentElement;
            const newTrack = document.createElement('div');
            newTrack.className = track.className;
            newTrack.innerHTML = track.dataset.originalHtml;
            try { wrapper.replaceChild(newTrack, track); } catch (e) { track.innerHTML = track.dataset.originalHtml; }
            try { delete newTrack.dataset.loop; } catch (e) { }
            try { newTrack.style.transform = ''; newTrack.style.transition = ''; } catch (e) { }
          }
        }
      } catch (e) { }

      // also remove any residual .selected classes anywhere in document
      try { document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); } catch (e) { }
      // if an image has focus anywhere, blur it
      try { if (document.activeElement && document.activeElement.tagName === 'IMG') { document.activeElement.blur(); } } catch (e) { }

      // final safety: small deferred second-pass to clear any late-applied inline styles
      try {
        setTimeout(() => {
          try {
            Array.from(document.querySelectorAll('.illust-track img')).forEach(img => {
              try {
                img.classList.remove('selected');
                img.removeAttribute('aria-selected');
                img.removeAttribute('data-selected');
                img.style.removeProperty('outline'); img.style.removeProperty('boxShadow'); img.style.removeProperty('transform'); img.style.removeProperty('opacity'); img.style.removeProperty('filter');
                try { if (typeof img.blur === 'function') img.blur(); } catch (e) { }
              } catch (e) { }
            });
          } catch (e) { }
        }, 120);
      } catch (e) { }
    } catch (e) { /* ignore */ }
  }

  if (hasHorizontal) {
    // Use bounding rect width to account for transforms/margins that offsetWidth misses
    panels.forEach(panel => {
      try {
        totalWidth += Math.round((panel.getBoundingClientRect && panel.getBoundingClientRect().width) || panel.offsetWidth || 0);
      } catch (e) { totalWidth += panel.offsetWidth || 0; }
    });
    // 페이지의 세로 문서 높이를 가로 스크롤 전체 너비에 맞춰 계산
    const scrollHeight = totalWidth - window.innerWidth + window.innerHeight;
    document.body.style.height = `${scrollHeight}px`;

    /* ==================================================
        2. Lenis (세로 스크롤 전용)
    ================================================== */
    // Lenis는 가로 레이아웃이 있을 때만 동작하도록 설정합니다.
    // Lenis 초기화
    // NOTE: lerp tuned slightly lower for crisper programmatic jumps; can be adjusted if needed.
    lenis = new Lenis({
      smooth: true,
      lerp: 0.06,
      wheelMultiplier: 1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Global scroll offset (pixels) applied to all programmatic Lenis scrolls.
    // Default is 24px to compensate for small layout/header offsets.
    // You can override at runtime for testing via:
    // sessionStorage.setItem('scrollOffset', '16')
    const DEFAULT_SCROLL_OFFSET = 24;
    const SCROLL_OFFSET = (function () {
      try {
        const s = sessionStorage.getItem('scrollOffset');
        return s ? parseInt(s, 10) || DEFAULT_SCROLL_OFFSET : DEFAULT_SCROLL_OFFSET;
      } catch (e) { return DEFAULT_SCROLL_OFFSET; }
    })();

    // Wrapper for lenis.scrollTo that applies the global offset and clamps to bounds.
    function adjustedScrollTo(x, options) {
      if (!lenis) return;
      // recalc maxScroll on each call because layout may change
      totalWidth = 0;
      panels.forEach(panel => { totalWidth += panel.offsetWidth; });
      const maxScroll = Math.max(0, totalWidth - window.innerWidth);
      let dest = Math.round(x - (SCROLL_OFFSET || 0));
      if (dest < 0) dest = 0;
      if (dest > maxScroll) dest = maxScroll;
      try { console.debug('[scroll-adjust] orig:', x, 'offset:', SCROLL_OFFSET, 'adj:', dest, 'maxScroll:', maxScroll); } catch (e) { }
      // diagnostic dump for panels/track at time of scroll
      try { dumpPanelMetrics('before-adjustedScrollTo', options && options._hashId); } catch (e) { }

      // perform the initial scroll
      try {
        if (options && typeof lenis.scrollTo === 'function') {
          lenis.scrollTo(dest, options);
        } else {
          lenis.scrollTo(dest);
        }
      } catch (e) {
        try { lenis.scrollTo(dest); } catch (ee) { console.error('[scroll-adjust] lenis.scrollTo failed', ee); }
      }

      // Verify track's current transform and retry if off by more than tolerance.
      const tolerance = 6; // pixels
      let attempts = 0;
      const maxAttempts = 8;

      function readTrackX() {
        try {
          const cs = window.getComputedStyle(track);
          const tf = cs && cs.transform ? cs.transform : 'none';
          if (!tf || tf === 'none') return 0;
          // try DOMMatrix first
          if (typeof DOMMatrix === 'function') {
            try {
              const m = new DOMMatrix(tf);
              if (Number.isFinite(m.m41)) return Math.abs(m.m41);
            } catch (e) { /* ignore */ }
          }
          // regex fallback for matrix(a,b,c,d,tx,ty)
          const m = tf.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,([-0-9.]+),/);
          if (m && m[1]) return Math.abs(parseFloat(m[1]));
        } catch (e) { /* ignore */ }
        return 0;
      }

      function verifyLoop() {
        attempts += 1;
        const currentX = readTrackX();
        const diff = Math.abs(currentX - dest);
        console.debug('[scroll-verify] attempt', attempts, 'currentX', currentX, 'dest', dest, 'diff', diff);
        if (diff <= tolerance) {
          try {
            // If caller passed desired hash id, update URL without native jump
            if (options && options._hashId) {
              history.replaceState(null, '', `${location.pathname}#${options._hashId}`);
            }
          } catch (e) { }
          return;
        }
        if (attempts >= maxAttempts) {
          console.warn('[scroll-verify] max attempts reached, final diff:', diff);
          try {
            // Last resort: snap to nearest panel start to avoid multi-panel misalignment
            let nearestPanelIndex = 0;
            let bestDelta = Infinity;
            let cum = 0;
            for (let i = 0; i < panels.length; i++) {
              const p = panels[i];
              const panelLeft = cum;
              const d = Math.abs(panelLeft - dest);
              if (d < bestDelta) { bestDelta = d; nearestPanelIndex = i; }
              const w = Math.round((p.getBoundingClientRect && p.getBoundingClientRect().width) || p.offsetWidth || 0);
              cum += w;
            }
            const snapLeft = panels[nearestPanelIndex] ? (Array.from(panels).slice(0, nearestPanelIndex).reduce((s, pl) => s + (Math.round((pl.getBoundingClientRect && pl.getBoundingClientRect().width) || pl.offsetWidth || 0)), 0)) : 0;
            console.warn('[scroll-verify] snapping to panel', nearestPanelIndex, 'snapLeft', snapLeft);
            try { lenis.scrollTo(snapLeft); } catch (e) { try { lenis.scrollTo(snapLeft); } catch (ee) { /* ignore */ } }
            // update URL hash if caller provided id
            if (options && options._hashId) {
              try { history.replaceState(null, '', `${location.pathname}#${options._hashId}`); } catch (e) { }
            }
          } catch (e) { console.error('[scroll-verify] snap fallback error', e); }
          return;
        }
        // apply a corrective scroll and retry after short delay
        try {
          lenis.scrollTo(dest);
        } catch (e) { try { lenis.scrollTo(dest); } catch (ee) { /* ignore */ } }
        setTimeout(verifyLoop, 90 + attempts * 30);
      }

      // Start verify loop after a small delay allowing lenis to animate
      setTimeout(verifyLoop, 80);
    }

    // If a target element sits inside a panel, return the panel's offsetLeft
    // This ensures we snap exactly to the panel start instead of ending up
    // several panels off due to transient measurements.
    function getPanelOffsetForElement(el) {
      try {
        if (!el || !panels || panels.length === 0) return null;
        let cum = 0;
        for (let i = 0; i < panels.length; i++) {
          const p = panels[i];
          const w = Math.round((p.getBoundingClientRect && p.getBoundingClientRect().width) || p.offsetWidth || 0);
          if (p.contains && p.contains(el)) return cum;
          if (p.id && el.id && p.id === el.id) return cum;
          cum += w;
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    // Compute a robust scroll target by summing widths of panels preceding the panel
    // that contains the element, plus the element's offsetLeft within that panel.
    function computeTargetScrollForElement(el) {
      try {
        if (!el || !panels || panels.length === 0) return null;
        let cum = 0;
        for (let i = 0; i < panels.length; i++) {
          const p = panels[i];
          const w = Math.round((p.getBoundingClientRect && p.getBoundingClientRect().width) || p.offsetWidth || 0);
          if (p.contains && p.contains(el)) {
            const elRect = el.getBoundingClientRect();
            const panelRect = p.getBoundingClientRect();
            const within = Math.round(elRect.left - panelRect.left);
            return Math.max(0, cum + within);
          }
          cum += w;
        }
      } catch (e) { /* ignore */ }
      return null;
    }

    // Diagnostic: dump panel metrics and track transform to console for debugging
    function dumpPanelMetrics(note, targetId) {
      try {
        console.groupCollapsed('[panels-dump]', note || '', 'targetId:', targetId || '(none)');
        console.log('panels.length =', panels.length);
        let cum = 0;
        const list = [];
        for (let i = 0; i < panels.length; i++) {
          const p = panels[i];
          const rect = p.getBoundingClientRect ? p.getBoundingClientRect() : { left: 0, width: p.offsetWidth || 0 };
          const w = Math.round(rect.width || p.offsetWidth || 0);
          list.push({ index: i, id: p.id || '(no-id)', width: w, left: Math.round(rect.left), rectWidth: Math.round(rect.width), cumLeft: cum });
          cum += w;
        }
        console.table(list);
        console.log('totalWidth (computed) =', cum, 'document.body.style.height =', document.body.style.height);
        try {
          const cs = window.getComputedStyle(track);
          const tf = cs && cs.transform ? cs.transform : 'none';
          console.log('track.transform =', tf);
        } catch (e) { console.log('track.transform read error', e); }
        if (targetId) {
          const t = document.getElementById(targetId);
          if (t) {
            console.log('target.offsetLeft =', t.offsetLeft, 'getBoundingClientRect.left=', t.getBoundingClientRect().left);
            const panelOffset = getPanelOffsetForElement(t);
            const computed = computeTargetScrollForElement(t);
            console.log('computed panelOffset =', panelOffset, 'computeTargetScrollForElement =', computed);
          } else {
            console.log('target element not found for id=', targetId);
          }
        }
        console.groupEnd();
      } catch (e) { console.log('[panels-dump] error', e); }
    }

    /* ==================================================
        3. 세로 스크롤 → 가로 이동 매핑
    ==================================================*/
    lenis.on("scroll", ({ scroll }) => {
      try {
        const asideEl = document.querySelector('aside');
        if (asideEl && asideEl.classList.contains('overlay-mode')) {
          // while overlay gallery open, ignore Lenis scroll updates to avoid horizontal movement
          return;
        }
      } catch (e) { /* ignore */ }
      track.style.transform = `translate3d(${-scroll}px, 0, 0)`;
    });
  }

  /* ==================================================
      4. resize 대응
  ================================================== */
  window.addEventListener("resize", () => {
    if (!hasHorizontal) return;
    totalWidth = 0;
    panels.forEach(panel => {
      try {
        totalWidth += Math.round((panel.getBoundingClientRect && panel.getBoundingClientRect().width) || panel.offsetWidth || 0);
      } catch (e) { totalWidth += panel.offsetWidth || 0; }
    });
    const newHeight = totalWidth - window.innerWidth + window.innerHeight;
    document.body.style.height = `${newHeight}px`;
  });

  /* ==================================================
      5. 오디오 컨트롤
  ================================================== */
  const audio = document.getElementById("bgm-audio");
  const toggleBtn = document.getElementById("audio-toggle");
  const iconPlay = document.getElementById("audio-icon-play");
  const iconPause = document.getElementById("audio-icon-pause");

  let isPlaying = false;

  function updateIcon() {
    try {
      if (iconPlay) iconPlay.style.display = isPlaying ? "none" : "block";
      if (iconPause) iconPause.style.display = isPlaying ? "block" : "none";
    } catch (e) { /* ignore */ }
  }

  function tryAutoPlay() {
    audio.play().then(() => {
      isPlaying = true;
      updateIcon();
    }).catch(() => {
      document.body.addEventListener("click", autoPlayOnUser);
    });
  }

  function autoPlayOnUser() {
    audio.play().catch(() => { });
    isPlaying = true;
    updateIcon();
    document.body.removeEventListener("click", autoPlayOnUser);
  }

  // encapsulated action that toggles audio state safely
  function toggleAudioAction() {
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => {
        isPlaying = true; updateIcon();
      }).catch(() => { isPlaying = false; updateIcon(); });
    } else {
      try { audio.pause(); } catch (e) { }
      isPlaying = false; updateIcon();
    }
  }

  /* ==================================================
      6. .dir_btn 링크 새탭 열기 강제 설정
      - 목적: aside 내의 `.dir_btn a` 요소들만 새 탭으로 열리게 강제
      - 방식: 초기화 시 기존 요소에 속성 추가, 이후 동적 추가를 위해 MutationObserver 사용
  ==================================================*/
  (function enforceDirBtnNewTab() {
    function setNewTabAttrs(a) {
      try {
        if (!a || a.tagName !== 'A') return;
        // Only apply for links that are inside .dir_btn
        if (!a.closest || !a.closest('.dir_btn')) return;
        a.setAttribute('target', '_blank');
        // security: noopener + noreferrer
        const rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        ['noopener', 'noreferrer'].forEach(r => { if (!rel.includes(r)) rel.push(r); });
        a.setAttribute('rel', rel.join(' '));
      } catch (e) { /* ignore */ }
    }

    // Apply to existing anchors
    try {
      document.querySelectorAll('.dir_btn a').forEach(setNewTabAttrs);
    } catch (e) { }

    // Watch for dynamic additions inside aside to catch future anchors
    try {
      const aside = document.querySelector('aside');
      if (aside && typeof MutationObserver === 'function') {
        const mo = new MutationObserver(muts => {
          for (const m of muts) {
            if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
              m.addedNodes.forEach(n => {
                try {
                  if (n.nodeType === Node.ELEMENT_NODE) {
                    // if an element node contains .dir_btn anchors, patch them
                    n.querySelectorAll && n.querySelectorAll('.dir_btn a').forEach(setNewTabAttrs);
                    // if the added node itself is an anchor inside .dir_btn
                    if (n.tagName === 'A' && n.closest && n.closest('.dir_btn')) setNewTabAttrs(n);
                  }
                } catch (e) { }
              });
            }
            // attribute changes not needed here because anchors are usually added as new nodes
          }
        });
        mo.observe(aside, { childList: true, subtree: true });
      }
    } catch (e) { }
  })();

  // attach handler directly if button exists, otherwise delegate to document
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => { e.preventDefault(); toggleAudioAction(); });
  } else {
    // delegated fallback: handle clicks on elements matching #audio-toggle
    document.addEventListener('click', function (e) {
      const t = e.target.closest && e.target.closest('#audio-toggle');
      if (t) { e.preventDefault(); toggleAudioAction(); }
    });
  }

  // keep UI in sync if audio state changes externally
  if (audio) {
    audio.addEventListener('play', () => { isPlaying = true; updateIcon(); });
    audio.addEventListener('pause', () => { isPlaying = false; updateIcon(); });
  }

  tryAutoPlay();
  updateIcon();





  /* ==================================================
      6. 클릭 요소 (aside / home 복귀)
  ================================================== */
  document.querySelector(".about-me .enter_about_me")
    ?.addEventListener("click", () => { });

  const clickables = document.querySelectorAll(".click");
  // Define project-specific clickables in the same visual order as aside list
  // This ensures fallback indexing (index+1) matches aside nth-child order.
  const projectClickables = document.querySelectorAll('.uxuiobj .click, .promoobj .click, .bniobj .click');
  // mapping from clickable class -> aside nth-child index (1-based)
  const clickableToAsideIndex = {
    'std_drg_web': 1,
    'braedlee_app': 2,
    'gwm_web': 3,
    'samsung_promo': 4,
    'vfun_login': 5,
    'lg_plal': 6,
    'bn': 7
  };

  // (no annotateAsideItems — data-project annotation removed per user request)

  if (clickables.length > 0) {
    console.log('[common.js] total .click elements found:', clickables.length);
  } else {
    console.debug('[common.js] no .click elements found on this page (this is normal for aboutme.html)');
  }
  clickables.forEach((el, index) => {
    console.log('[common.js] attaching click handler to element:', el.className, 'index', index);
    // also listen for pointer/mousedown/touchstart at capture to see raw input
    el.addEventListener('pointerdown', (ev) => console.log('[pointerdown on .click]', el.className));
    el.addEventListener('mousedown', (ev) => console.log('[mousedown on .click]', el.className));
    el.addEventListener('touchstart', (ev) => console.log('[touchstart on .click]', el.className));
    el.addEventListener("click", () => {
      console.log('[click] element clicked:', el.className);
      // data-target 속성이 있으면 해당 요소를 열기 (우선권)
      const targetSelector = el.getAttribute("data-target");
      if (targetSelector) {
        console.log('[click] data-target found:', targetSelector);
        const target = document.querySelector(targetSelector);
        if (target) {
          target.style.display = "block";
          target.classList.add("on");
        }
        return;
      }

      // home_main 처리(메인으로 스크롤)
      if (el.classList.contains("home_main")) {
        console.log('[click] home_main clicked — scrolling to main');
        if (typeof lenis !== 'undefined' && lenis && typeof lenis.scrollTo === 'function') lenis.scrollTo(0);
        return;
      }

      // aside 열기: only for project area clickables or explicitly mapped elements
      const aside = document.querySelector("aside");
      if (!aside) return;
      // allow opening aside only when element is within project containers or has mapping
      const isProjectClickable = !!el.closest('.uxuiobj, .promoobj, .bniobj');
      const hasMapping = Object.keys(clickableToAsideIndex).some(cls => el.classList.contains(cls));
      if (!isProjectClickable && !hasMapping) {
        console.log('[click] element not in project area and has no mapping — not opening aside:', el.className);
        return;
      }
      aside.style.display = "block";
      // remove existing selection
      aside.querySelectorAll('ul li.on').forEach(li => li.classList.remove('on'));

      // ensure aside is interactive when opened
      try {
        aside.inert = false;
      } catch (e) { /* inert may not be supported */ }
      aside.setAttribute('aria-hidden', 'false');

      // determine target index by mapping (class-based) first
      let targetIndex = null;
      for (const cls in clickableToAsideIndex) {
        if (el.classList.contains(cls)) {
          targetIndex = clickableToAsideIndex[cls];
          console.log('[click] class-mapped target index for', cls, '=>', targetIndex);
          break;
        }
      }

      // fallback: use positional index among project-specific clickables (matches aside order)
      if (targetIndex === null) {
        const projIndex = Array.prototype.indexOf.call(projectClickables, el);
        console.log('[click] projIndex:', projIndex, 'global index:', index);
        if (projIndex !== -1) {
          targetIndex = projIndex + 1;
          console.log('[click] using project-specific fallback index =>', targetIndex);
        } else {
          targetIndex = index + 1; // last-resort: original global clickable order
          console.log('[click] using global fallback index =>', targetIndex);
        }
      }

      // Diagnostic: list aside li count and a short snippet to help identify order
      const asideLis = Array.from(aside.querySelectorAll('ul > li'));
      console.log('[click] aside lis count:', asideLis.length);
      asideLis.forEach((li, i) => {
        const title = li.querySelector('.tit')?.innerText?.trim() || li.querySelector('.app-span')?.innerText?.trim() || li.textContent.trim().slice(0, 40);
        console.log('[click] aside li', i + 1, 'snippet:', title ? title.replace(/\s+/g, ' ') : '(empty)');
      });

      // Use array-based selection to avoid nth-child mismatch when whitespace/comments or text nodes exist
      let targetLi = null;
      if (Number.isInteger(targetIndex) && targetIndex >= 1 && targetIndex <= asideLis.length) {
        targetLi = asideLis[targetIndex - 1];
        console.log('[click] selecting aside by array index', targetIndex - 1);
      } else {
        console.log('[click] targetIndex out of range or invalid:', targetIndex);
      }

      if (targetLi) {
        // Special case: illustpop should open as a full overlay gallery (different from boxed aside)
        if (targetLi.classList.contains('illustpop')) {
          console.log('[click] opening illust overlay gallery');
          // save previously focused element so we can restore focus when overlay closes
          try { aside._prevFocus = document.activeElement; } catch (e) { /* ignore */ }
          // set aside into overlay mode (CSS will handle sizing/background)
          aside.classList.add('overlay-mode');
          try { aside.inert = false; } catch (e) { }
          aside.setAttribute('aria-hidden', 'false');
          // Inject gallery markup only once (safe to run multiple times)
          if (!targetLi.querySelector('.illust-gallery')) {
            // save original markup so we can restore when overlay closes
            try { if (!targetLi.dataset._orig) targetLi.dataset._orig = targetLi.innerHTML; } catch (e) { }
            targetLi.innerHTML = `
              <div class="illust-gallery-wrap">
                <div class="illust-gallery" role="region" aria-label="Illustration gallery">
                  <div class="illust-track">
                <img src="./assets/illust_img/illust_bloomflower.jpg" alt="bloomflower" />
              <img src="./assets/illust_img/illust_ottugi.jpg" alt="ottugi" />
              <img src="./assets/illust_img/illust_crossant.JPG" alt="crossant" />
              <img src="./assets/illust_img/illust_brunch.JPG" alt="brunch" />
              <img src="./assets/illust_img/illust_christmars.JPG" alt="christmars" />
              <img src="./assets/illust_img/illust_kitchen.JPG" alt="kitchen" />
              <img src="./assets/illust_img/illust_moodshot.psd.jpg" alt="moodshot" />
              <img src="./assets/illust_img/illust_moondust.jpg" alt="moondust" />
              <img src="./assets/illust_img/illust_kich.jpg" alt="kich" />
                  </div>
                </div>
              </div>
            `;
          }
          // ensure aside visible and mark this li
          aside.style.display = 'block';
          targetLi.classList.add('on');
          // initialize carousel immediately so clones/positioning are ready
          try { if (typeof setupCarousel === 'function') setupCarousel(); } catch (e) { /* setupCarousel defined later in scope; ignore if not available */ }
          // focus for accessibility
          // focus will be managed by the overlay handlers (close button will receive focus)
          // avoid focusing an internal image here to keep consistent focus target
          console.log('[click] illust overlay shown');
        } else {
          // Before activating a non-gallery aside item, ensure any lingering
          // illust gallery selection/markup is fully cleared so images don't
          // remain visually selected when other project items open.
          try { clearIllustSelection(); } catch (e) { }
          targetLi.classList.add('on');
          console.log('[click] targetLi found and .on added (array selection)');
        }
      } else {
        console.log('[click] targetLi NOT found for index', targetIndex);
      }
    });
  });

  // Debug: close button diagnostics (presence, computed z-index, events)
  (function closeBtnDiagnostics() {
    const asideEl = document.querySelector('aside');
    // support both naming conventions: .close-btn and .close_btn
    const btn = document.querySelector('aside .close-btn, aside .close_btn') || document.querySelector('.close-btn, .close_btn');
    console.log('[diag] close-btn element found?', !!btn, 'selectorMatched:', btn ? (btn.className || btn.getAttribute('class')) : '(none)');
    if (!btn) return;

    function reportState(prefix) {
      try {
        const cs = window.getComputedStyle(btn);
        const z = cs && cs.zIndex ? cs.zIndex : '(none)';
        const rect = btn.getBoundingClientRect();
        console.log(`[diag] ${prefix} - overlay-mode: ${asideEl && asideEl.classList.contains('overlay-mode')}, zIndex: ${z}, rect: ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      } catch (e) { console.log('[diag] reportState error', e); }
    }

    // initial
    reportState('initial');

    // report when overlay-mode toggles
    if (asideEl) {
      const mo = new MutationObserver(() => reportState('mutation'));
      mo.observe(asideEl, { attributes: true, attributeFilter: ['class'] });
    }

    // listen for pointer and click events on btn
    btn.addEventListener('pointerdown', (e) => { console.log('[diag] pointerdown on close-btn', e.type, 'pointerId', e.pointerId); reportState('pointerdown'); });
    btn.addEventListener('pointerup', (e) => { console.log('[diag] pointerup on close-btn'); reportState('pointerup'); });
    btn.addEventListener('click', (e) => { console.log('[diag] click on close-btn'); reportState('click'); });

    // periodic check in case computed styles change due to late CSS load
    let checks = 0;
    const iv = setInterval(() => {
      reportState('interval');
      checks += 1; if (checks > 8) clearInterval(iv);
    }, 500);
  })();

  document.querySelector("aside .close-btn")
    ?.addEventListener("click", () => {
      const asideEl = document.querySelector("aside");
      if (!asideEl) return;
      // remove overlay-mode if present and clear any visual selection on images
      asideEl.classList.remove('overlay-mode');
  try { clearIllustSelection(); } catch (e) { /* ignore */ }
  try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
      asideEl.style.display = "none";
    });

  // Overlay gallery swipe + close handling for illust overlay
  (function setupIllustOverlayHandlers() {
    const asideEl = document.querySelector('aside');
    if (!asideEl) return;

    // Close overlay when ESC pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && asideEl.classList.contains('overlay-mode')) {
  asideEl.classList.remove('overlay-mode');
  try { clearIllustSelection(); } catch (ee) { }
  try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
  asideEl.style.display = 'none';
        // restore any previous li content? currently original content persists in DOM
      }
    });

    // Infinite-loop carousel setup + delegated pointer events
    let carousel = {
      track: null,
      slides: [],
      slideWidth: 0,
      index: 0, // logical index (0..n-1)
      isDragging: false,
      startX: 0,
      currentX: 0,
      pointerId: null,
      baseTranslate: 0,
      allowClickClose: true,
      autoplayId: null,
      autoplayInterval: 2800,
    };

    function setupCarousel() {
      const track = asideEl.querySelector('.illust-track');
      console.log('[setupCarousel] called, found track?', !!track);
      if (!track) return;
      // ensure track accepts pointer interactions when overlay active
      // set to 'none' to allow JS to fully control pointer movements
      track.style.touchAction = 'none';
      track.style.pointerEvents = track.style.pointerEvents || '';
      carousel.track = track;

      // helper: robustly parse translateX from computed transform
      // small reusable helper to parse translateX from computed transform string
      function parseTranslateX(transformStr) {
        try {
          if (!transformStr || transformStr === 'none') return 0;
          // prefer DOMMatrix if available
          if (typeof DOMMatrix === 'function') {
            const m = new DOMMatrix(transformStr);
            if (Number.isFinite(m.m41)) return m.m41;
          }
          // WebKitCSSMatrix might exist in some browsers; guard access
          if (typeof window !== 'undefined' && window.WebKitCSSMatrix) {
            try {
              const wm = new window.WebKitCSSMatrix(transformStr);
              if (Number.isFinite(wm.m41)) return wm.m41;
            } catch (err) { /* ignore */ }
          }
          // regex fallback for matrix/matrix3d (robust capture for typical browser formats)
          const m = transformStr.match(/matrix\(([-0-9.]+),[-0-9.]+,[-0-9.]+,[-0-9.]+,([-0-9.]+),[-0-9.]+\)/);
          if (m && m[2]) return parseFloat(m[2]);
          const m3 = transformStr.match(/matrix3d\([^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,[^,]+,([-0-9.]+),/);
          if (m3 && m3[1]) return parseFloat(m3[1]);
        } catch (e) { /* ignore */ }
        return 0;
      }
      // Store original HTML snapshot so we can reliably rebuild clones if the track
      // element is replaced/modified between open/close cycles.
      if (!track.dataset.originalHtml) track.dataset.originalHtml = track.innerHTML;

      // If dataset.loop is set but the current DOM doesn't match expected 3x set
      // (e.g. track was replaced), reset to original and let cloning run again.
      try {
        const tmp = document.createElement('div');
        tmp.innerHTML = track.dataset.originalHtml || '';
        const origCount = tmp.querySelectorAll('img').length || 0;
        const currentCount = track.querySelectorAll('img').length || 0;
        if (track.dataset.loop === '3' && currentCount !== origCount * 3) {
          // reset to original markup and clear loop flag so cloning recreates sets
          track.innerHTML = track.dataset.originalHtml;
          delete track.dataset.loop;
          console.log('[setupCarousel] track loop mismatch — reset innerHTML and will reclone');
        }
      } catch (e) { /* non-fatal */ }

      // collect original slides (img elements)
      // Prefer images that are not marked as clones. If none found, and total is divisible by 3,
      // assume a triple set and take the middle third as originals.
      const allImgs = Array.from(track.querySelectorAll('img'));
      // prevent native image drag/selection which can interfere with pointermove
      allImgs.forEach(i => {
        try {
          i.setAttribute('draggable', 'false');
          i.style.userSelect = 'none';
          i.style.webkitUserSelect = 'none';
          i.style.touchAction = 'none';
          i.style.webkitUserDrag = 'none';
          i.style.pointerEvents = 'auto';
        } catch (e) { /* ignore */ }
      });
      let originalImgs = allImgs.filter(i => !i.dataset.cloned);
      if (originalImgs.length === 0 && allImgs.length % 3 === 0 && allImgs.length > 0) {
        const third = allImgs.length / 3;
        originalImgs = allImgs.slice(third, third * 2);
        console.log('[setupCarousel] no non-clone imgs found — assuming middle third as originals');
      }
      const n = originalImgs.length;
      if (n === 0) return;
      console.log('[setupCarousel] original slide count', n);

      // If we've already expanded to a triple set, just refresh references
      if (track.dataset.loop === '3' && allImgs.length >= n * 3) {
        carousel.slides = Array.from(track.querySelectorAll('img'));
      } else {
        // create clones: prepend one full copy and append one full copy so sequence is [cloneSet][original][cloneSet]
        const fragPre = document.createDocumentFragment();
        const fragPost = document.createDocumentFragment();
        originalImgs.forEach(img => {
          const c = img.cloneNode(true);
          c.setAttribute('draggable', 'false');
          c.style.touchAction = 'manipulation';
          c.dataset.cloned = 'true';
          fragPost.appendChild(c);
        });
        // prepend clones in reverse order so the visual order matches
        for (let i = originalImgs.length - 1; i >= 0; i--) {
          const c2 = originalImgs[i].cloneNode(true);
          c2.setAttribute('draggable', 'false');
          c2.style.touchAction = 'manipulation';
          c2.dataset.cloned = 'true';
          fragPre.appendChild(c2);
        }
        track.insertBefore(fragPre, track.firstChild);
        track.appendChild(fragPost);
        track.dataset.loop = '3';
        carousel.slides = Array.from(track.querySelectorAll('img'));
      }

      // compute step (width + horizontal margins) using the first real image in the middle set
      // locate the index of the first non-clone image inside carousel.slides
      let middleStartIndex = carousel.slides.findIndex(s => !s.dataset.cloned);
      if (middleStartIndex === -1) middleStartIndex = 0; // fallback
      const realN = n; // number of originals
      const firstReal = carousel.slides[middleStartIndex];
      if (!firstReal) {
        console.warn('[setupCarousel] firstReal not found, aborting setup');
        return;
      }
      const rect = firstReal.getBoundingClientRect();
      const style = getComputedStyle(firstReal);
      const marginLeft = parseFloat(style.marginLeft) || 0;
      const marginRight = parseFloat(style.marginRight) || 0;
      carousel.step = Math.round(rect.width + marginLeft + marginRight) || window.innerWidth;

      // logical index 0..n-1
      carousel.index = 0;
      // position track so that the first real slide (middle set) is visible
      const middleOffset = middleStartIndex; // index where real set begins
      const initialTranslate = -carousel.step * (middleOffset + carousel.index);
      carousel.track.style.transform = `translate3d(${initialTranslate}px,0,0)`;
      carousel.baseTranslate = initialTranslate;
      carousel.realCount = realN;
      // ensure no transition initially
      carousel.track.style.transition = 'none';
      // force layout so computedStyle reflects the transform immediately
      try { void carousel.track.offsetHeight; } catch (e) { }
      console.log('[setupCarousel] step=', carousel.step, 'middleOffset=', middleOffset, 'initialTranslate=', initialTranslate, 'realCount=', carousel.realCount);

      // attach a track-level pointerdown so pointer capture is taken on the track itself
      try {
        if (carousel._trackDownListener) carousel.track.removeEventListener('pointerdown', carousel._trackDownListener);
      } catch (e) { }
      carousel._trackDownListener = function trackPointerDown(ev) {
        // only respond when overlay-mode / gallery visible
        const illustActive = asideEl.classList.contains('overlay-mode') || !!asideEl.querySelector('ul>li.illustpop.on');
        if (!illustActive) return;
        ev.preventDefault();
        // reset moved flag at start
        carousel._moved = false;
        carousel.isDragging = true;
        carousel.startX = ev.clientX ?? (ev.pageX || 0);
        carousel.currentX = ev.clientX ?? (ev.pageX || 0);
        // remember pointer id so document-level handlers only respond to the active pointer
        carousel.pointerId = typeof ev.pointerId !== 'undefined' ? ev.pointerId : null;
        // parse current translate safely
        try {
          const cs = getComputedStyle(carousel.track);
          // prefer existing carousel.baseTranslate set during setupCarousel if present
          if (typeof carousel.baseTranslate === 'number' && !isNaN(carousel.baseTranslate)) {
            // keep existing baseTranslate
          } else {
            carousel.baseTranslate = parseTranslateX(cs.transform || '');
          }
        } catch (err) { carousel.baseTranslate = carousel.baseTranslate || 0; }
        carousel.allowClickClose = false;
        try { if (carousel.track && typeof carousel.track.setPointerCapture === 'function') carousel.track.setPointerCapture(ev.pointerId); } catch (e) { }
        try { if (carousel.track) carousel.track.style.cursor = 'grabbing'; } catch (e) { }
        // register document/window fallbacks so we still get move/up when pointer leaves gallery
        try {
          // active (non-passive) listeners so we can preventDefault and capture movement
          document.addEventListener('pointermove', docPointerMove, { passive: false });
          document.addEventListener('pointerup', docPointerUp, { passive: false });
          document.addEventListener('mousemove', docPointerMove, { passive: false });
          document.addEventListener('mouseup', docPointerUp, { passive: false });
          document.addEventListener('mouseleave', docPointerUp, { passive: false });
          window.addEventListener('blur', windowBlurHandler);
        } catch (e) { /* ignore */ }
        stopAutoplay();
      };
      try { carousel.track.addEventListener('pointerdown', carousel._trackDownListener, { passive: false }); } catch (e) { carousel.track.addEventListener('pointerdown', carousel._trackDownListener); }

      // attach handlers (avoid duplicates)
      carousel.track.removeEventListener('transitionend', onTransitionEnd);
      carousel.track.addEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('resize', onResize);
      window.addEventListener('resize', onResize);
    }

    function onTransitionEnd() {
      // If user is actively dragging, ignore transitionend adjustments to avoid
      // visual jumps/stutter caused by overlapping handlers.
      if (carousel.isDragging) {
        console.log('[onTransitionEnd] ignored because carousel.isDragging');
        return;
      }
      if (!carousel.track) return;
      const realN = carousel.realCount || 0;
      if (realN === 0) return;
      // If we've animated into the right clone set (visual index >= realN*2), jump back to middle set
      const visualIndex = Math.round((-carousel.baseTranslate) / (carousel.step || 1));
      console.log('[onTransitionEnd] baseTranslate=', carousel.baseTranslate, 'step=', carousel.step, 'visualIndex=', visualIndex);
      const middleStart = realN;
      if (visualIndex >= realN * 2) {
        // compute equivalent index inside middle set
        const eq = visualIndex - realN * 2;
        carousel.index = eq % realN;
        carousel.track.style.transition = 'none';
        const tx = -carousel.step * (middleStart + carousel.index);
        carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
        carousel.baseTranslate = tx;
        console.log('[onTransitionEnd] jumped from right clone to middle, new index=', carousel.index, 'tx=', tx);
        void carousel.track.offsetHeight;
        carousel.track.style.transition = '';
      }
      // If we've animated into the left clone set (visual index < middleStart), jump to middle set
      if (visualIndex < middleStart) {
        const eq = (visualIndex - middleStart + realN) % realN;
        carousel.index = eq;
        carousel.track.style.transition = 'none';
        const tx = -carousel.step * (middleStart + carousel.index);
        carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
        carousel.baseTranslate = tx;
        console.log('[onTransitionEnd] jumped from left clone to middle, new index=', carousel.index, 'tx=', tx);
        void carousel.track.offsetHeight;
        carousel.track.style.transition = '';
      }
    }

    function onResize() {
      if (!carousel.track) return;
      // recalc step using current middle set first image
      const realN = carousel.realCount || 0;
      if (realN === 0) return;
      const firstReal = carousel.slides[realN];
      const rect = firstReal.getBoundingClientRect();
      const style = getComputedStyle(firstReal);
      const marginLeft = parseFloat(style.marginLeft) || 0;
      const marginRight = parseFloat(style.marginRight) || 0;
      carousel.step = Math.round(rect.width + marginLeft + marginRight) || window.innerWidth;
      const tx = -carousel.step * (realN + carousel.index);
      carousel.track.style.transition = 'none';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      void carousel.track.offsetHeight;
      carousel.track.style.transition = '';
    }

    function startAutoplay() {
      // idempotent: if already running, do nothing
      if (carousel.autoplayId) return;
      // small diagnostic
      console.log('[autoplay] start');
      carousel.autoplayId = setInterval(() => {
        try {
          if (carousel.isDragging) return;
          carousel.index += 1;
          const tx = -carousel.step * (carousel.realCount + carousel.index);
          if (carousel.track) {
            carousel.track.style.transition = 'transform 560ms cubic-bezier(.22,.9,.26,1)';
            carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
          }
          carousel.baseTranslate = tx;
        } catch (e) { /* guard against unexpected errors in interval */ }
      }, carousel.autoplayInterval);
    }

    function stopAutoplay() {
      // idempotent stop: only clear if running
      if (!carousel.autoplayId) return;
      clearInterval(carousel.autoplayId);
      carousel.autoplayId = null;
      console.log('[autoplay] stopped');
    }

    // scheduleResume: robustly schedule resuming autoplay after user interaction
    function scheduleResume(delay) {
      try { if (carousel.autoplayResumeId) clearTimeout(carousel.autoplayResumeId); } catch (e) { }
      carousel.autoplayResumeId = setTimeout(() => {
        carousel.autoplayResumeId = null;
        // only start if overlay still active and user is not dragging and not suppressed
        if (!asideEl.classList.contains('overlay-mode')) return;
        if (carousel.isDragging) return;
        if (carousel._suppressAutoplayResume) return;
        startAutoplay();
      }, delay);
    }

    // pointer handlers
    asideEl.addEventListener('pointerdown', (ev) => {
      // allow pointer interactions when overlay-mode is active OR when illustpop item is visible (.illustpop.on)
      const illustActive = asideEl.classList.contains('overlay-mode') || !!asideEl.querySelector('ul>li.illustpop.on');
      if (!illustActive) return;
      // If the event started inside the actual track, prefer the track-level
      // pointerdown listener (attached in setupCarousel) to avoid double-starting
      // dragging logic which caused the "띡띡" forward jumps. So ignore here.
      try {
        if (ev.target && ev.target.closest && ev.target.closest('.illust-track')) {
          console.log('[pointerdown] inside .illust-track - ignoring aside-level handler to avoid duplicate drag start');
          return;
        }
      } catch (e) { /* ignore */ }
      console.log('[pointerdown] clientX=', ev.clientX, 'pageX=', ev.pageX, 'pointerId=', ev.pointerId, 'overlay-mode=', asideEl.classList.contains('overlay-mode'));
      setupCarousel();
      if (!carousel.track) return;
      // reset moved flag and set dragging
      carousel._moved = false;
      carousel.isDragging = true;
      // visual state: add dragging class to disable hover scale
      try { carousel.track.classList.add('dragging'); } catch (e) { }
      carousel.startX = ev.clientX ?? (ev.pageX || 0);
      carousel.currentX = ev.clientX ?? (ev.pageX || 0);
      carousel.pointerId = typeof ev.pointerId !== 'undefined' ? ev.pointerId : null;
      // capture current translate from computed style using parse helper
      try {
        const style = getComputedStyle(carousel.track);
        if (typeof carousel.baseTranslate === 'number' && !isNaN(carousel.baseTranslate)) {
          // keep existing baseTranslate from setupCarousel
        } else {
          carousel.baseTranslate = parseTranslateX(style.transform || '');
        }
      } catch (err) { carousel.baseTranslate = carousel.baseTranslate || 0; }
      // prevent accidental close when dragging
      carousel.allowClickClose = false;
      try { carousel.track.setPointerCapture?.(ev.pointerId); } catch (e) { }
      // set grabbing cursor
      try { if (carousel.track) carousel.track.style.cursor = 'grabbing'; } catch (e) { }
      // register document-level fallbacks here as well (in case track-level didn't run)
      try {
        document.addEventListener('pointermove', docPointerMove, { passive: false });
        document.addEventListener('pointerup', docPointerUp, { passive: false });
        document.addEventListener('mousemove', docPointerMove, { passive: false });
        document.addEventListener('mouseup', docPointerUp, { passive: false });
        window.addEventListener('blur', windowBlurHandler);
      } catch (e) { /* ignore */ }
      console.log('[pointerdown] start drag, startX=', carousel.startX, 'baseTranslate=', carousel.baseTranslate, 'pointerId=', carousel.pointerId);
      stopAutoplay();
    });

    // handle pointercancel and pointerleave to reset dragging state
    asideEl.addEventListener('pointercancel', (ev) => {
      console.log('[pointercancel]');
      if (!carousel.isDragging || !carousel.track) return;
      carousel.isDragging = false;
      carousel.track.releasePointerCapture?.(ev.pointerId);
      // snap back to nearest slide
      const style = getComputedStyle(carousel.track);
      const cur = parseTranslateX(style.transform || '') || carousel.baseTranslate;
      const nearestIndex = Math.round((-cur / carousel.step) - carousel.realCount);
      carousel.index = nearestIndex;
      const tx = -carousel.step * (carousel.realCount + carousel.index);
      carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      // clear suppression and schedule safe resume
      carousel._suppressAutoplayResume = false;
      scheduleResume(600);
    });

    asideEl.addEventListener('pointerleave', (ev) => {
      // if pointer leaves the aside while pressing, treat like pointerup
      if (carousel.isDragging) {
        // call docPointerUp directly with an object shaped like an event
        try { docPointerUp({ clientX: ev.clientX ?? ev.pageX ?? carousel.currentX, pointerId: ev.pointerId }); } catch (e) { }
      }
    });

    asideEl.addEventListener('pointermove', (ev) => {
      if (!carousel.isDragging || !carousel.track) return;
      // ignore moves from other pointers
      if (typeof ev.pointerId !== 'undefined' && carousel.pointerId !== null && ev.pointerId !== carousel.pointerId) return;
      ev.preventDefault();
      carousel.currentX = ev.clientX ?? (ev.pageX || carousel.currentX);
      const dx = carousel.currentX - carousel.startX;
      if (Math.abs(dx) > 6) carousel._moved = true;
      carousel.track.style.transition = 'none';
      carousel.track.style.transform = `translate3d(${carousel.baseTranslate + dx}px,0,0)`;
      if (Math.abs(dx) > 5) console.log('[pointermove] dx=', dx, 'currentX=', carousel.currentX, 'startX=', carousel.startX, 'baseTranslate=', carousel.baseTranslate);
    });

    // Fallbacks: if pointer leaves aside or events are lost, listen at document level
    // to ensure pointerup/move still get processed.
    function docPointerMove(ev) {
      if (!carousel.isDragging || !carousel.track) return;
      // ignore moves from other pointers when pointerId available
      if (typeof ev.pointerId !== 'undefined' && carousel.pointerId !== null && ev.pointerId !== carousel.pointerId) return;
      // robust clientX extraction (supports PointerEvent, MouseEvent, and touch-like fallbacks)
      const clientX = ev.clientX ?? (ev.pageX) ?? (ev.touches && ev.touches[0] && ev.touches[0].clientX) ?? carousel.currentX;
      carousel.currentX = clientX;
      const dx = carousel.currentX - carousel.startX;
      carousel.track.style.transition = 'none';
      carousel.track.style.transform = `translate3d(${carousel.baseTranslate + dx}px,0,0)`;
      if (Math.abs(dx) > 5) console.log('[doc pointermove] dx=', dx, 'clientX=', clientX, 'startX=', carousel.startX, 'baseTranslate=', carousel.baseTranslate);
      try { ev.preventDefault(); } catch (e) { }
    }

    function docPointerUp(ev) {
      if (!carousel.isDragging || !carousel.track) return;
      // ignore ups from other pointers when pointerId available
      if (typeof ev.pointerId !== 'undefined' && carousel.pointerId !== null && ev.pointerId !== carousel.pointerId) return;
      const clientX = ev && (ev.clientX ?? ev.pageX) || carousel.currentX || carousel.startX || 0;
      console.log('[doc pointerup] clientX=', clientX, 'startX=', carousel.startX, 'baseTranslate=', carousel.baseTranslate, 'pointerId=', ev.pointerId);
      carousel.isDragging = false;
      try { carousel.track.classList.remove('dragging'); } catch (e) { }
      const movedFlag = !!carousel._moved;
      carousel._moved = false;
      // compute index delta from drag distance so large drags move multiple slides
      carousel.currentX = clientX;
      const dx = carousel.currentX - carousel.startX;
      const step = carousel.step || 1;
      // delta: positive when user dragged right (want previous), negative when left (next)
      const delta = Math.round(-dx / step);
      if (Math.abs(delta) > 0) {
        carousel.index += delta;
        console.log('[doc pointerup] dx=', dx, 'delta=', delta, 'new index=', carousel.index);
      } else {
        // small drag: snap to nearest using computed transform as safety
        try {
          const style = getComputedStyle(carousel.track);
          const cur = parseTranslateX(style.transform || '') || carousel.baseTranslate;
          const nearestIndex = Math.round((-cur / step) - (carousel.realCount || 0));
          carousel.index = nearestIndex;
          console.log('[doc pointerup] small dx, snapped to nearestIndex=', nearestIndex);
        } catch (e) {
          const threshold = step / 4;
          if (dx > threshold) carousel.index -= 1;
          else if (dx < -threshold) carousel.index += 1;
          console.log('[doc pointerup] fallback threshold applied, dx=', dx, 'index=', carousel.index);
        }
      }
      const tx = -carousel.step * (carousel.realCount + carousel.index);
      carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      console.log('[doc pointerup] dx=', dx, 'moved to index=', carousel.index);
      setTimeout(() => { carousel.allowClickClose = true; }, 300);
      carousel._suppressAutoplayResume = false;
      scheduleResume(600);
      // remove document/window fallbacks that may have been attached on pointerdown
      try {
        document.removeEventListener('pointermove', docPointerMove, { passive: false });
        document.removeEventListener('pointerup', docPointerUp, { passive: false });
        document.removeEventListener('mousemove', docPointerMove, { passive: false });
        document.removeEventListener('mouseup', docPointerUp, { passive: false });
        document.removeEventListener('mouseleave', docPointerUp, { passive: false });
        window.removeEventListener('blur', windowBlurHandler);
      } catch (e) { /* ignore */ }
      // clear active pointerId
      carousel.pointerId = null;
    }

    // Note: document-level handlers will also be attached on pointerdown as needed; keep these
    // global attachments as safe fallback for some browsers, but pointerdown will reattach
    try {
      document.addEventListener('pointermove', docPointerMove, { passive: false });
      document.addEventListener('pointerup', docPointerUp, { passive: false });
      document.addEventListener('mousemove', docPointerMove, { passive: false });
      document.addEventListener('mouseup', docPointerUp, { passive: false });
    } catch (e) { /* ignore */ }

    // handle when window loses focus (treat as pointer up)
    function windowBlurHandler() {
      if (!carousel.isDragging) return;
      try { docPointerUp({ clientX: carousel.currentX || carousel.startX || 0 }); } catch (e) { /* ignore */ }
    }

    asideEl.addEventListener('pointerup', (ev) => {
      console.log('[pointerup] clientX=', ev.clientX, 'pointerId=', ev.pointerId);
      if (!carousel.isDragging || !carousel.track) return;
      try { carousel.track.releasePointerCapture?.(ev.pointerId); } catch (e) { }
      try { if (carousel.track) carousel.track.style.cursor = ''; } catch (e) { }
      try { carousel.track.classList.remove('dragging'); } catch (e) { }
      const movedFlag = !!carousel._moved;
      carousel._moved = false;
      const dx = carousel.currentX - carousel.startX;
      // compute delta from drag and apply so multi-slide moves are possible
      const step = carousel.step || 1;
      const delta = Math.round(-dx / step);
      if (Math.abs(delta) > 0) {
        carousel.index += delta;
        console.log('[pointerup] dx=', dx, 'delta=', delta, 'new index=', carousel.index);
      } else {
        // small drag: fallback to nearest computed transform
        try {
          const style = getComputedStyle(carousel.track);
          const cur = parseTranslateX(style.transform || '') || carousel.baseTranslate;
          const nearestIndex = Math.round((-cur / step) - (carousel.realCount || 0));
          carousel.index = nearestIndex;
          console.log('[pointerup] small dx, snapped to nearestIndex=', nearestIndex);
        } catch (e) {
          const threshold = step / 4;
          if (dx > threshold) carousel.index -= 1;
          else if (dx < -threshold) carousel.index += 1;
          console.log('[pointerup] fallback threshold applied, dx=', dx, 'index=', carousel.index);
        }
      }
      // animate to new position (account for leading clone)
      const tx = -carousel.step * (carousel.realCount + carousel.index);
      carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      console.log('[pointerup] dx=', dx, 'moved to index=', carousel.index, 'tx=', tx, 'baseTranslate after=', carousel.baseTranslate);
      // allow click-close after short delay
      setTimeout(() => { carousel.allowClickClose = true; }, 300);
      carousel.isDragging = false;
      // clear suppression and schedule safe resume
      carousel._suppressAutoplayResume = false;
      scheduleResume(600);
      // cleanup any fallback listeners attached to document/window
      try {
        document.removeEventListener('pointermove', docPointerMove);
        document.removeEventListener('pointerup', docPointerUp);
        document.removeEventListener('mouseleave', docPointerUp);
        window.removeEventListener('blur', windowBlurHandler);
      } catch (e) { /* ignore */ }
    });

    // suppress clicks triggered by drag operations
    asideEl.addEventListener('click', (e) => {
      const illustWrap = asideEl.querySelector('.illust-gallery');
      if (!illustWrap) return;
      // if we detected movement, prevent click handlers inside gallery
      if (carousel._moved) {
        e.stopPropagation();
        e.preventDefault();
        carousel._moved = false;
        return;
      }
    }, true);

    // Ensure individual images do not remain in a 'selected' or focused state after interaction
    asideEl.addEventListener('click', (e) => {
      try {
        const img = e.target && e.target.closest && e.target.closest('img');
        if (!img) return;
        if (!img.closest || !img.closest('.illust-track')) return;
        // remove any selection markers and blur focus
        try { img.classList.remove('selected'); } catch (err) { }
        try { img.removeAttribute('aria-selected'); } catch (err) { }
        try { img.removeAttribute('data-selected'); } catch (err) { }
        try { if (typeof img.blur === 'function') img.blur(); } catch (err) { }
      } catch (err) { /* ignore */ }
    }, false);


    // clicking outside gallery or close button should close overlay
    asideEl.addEventListener('click', (e) => {
      if (!asideEl.classList.contains('overlay-mode')) return;
      const wrap = asideEl.querySelector('.illust-gallery-wrap');
      const closeBtn = asideEl.querySelector('.close-btn');
      if (closeBtn && (closeBtn === e.target || closeBtn.contains(e.target))) {
        stopAutoplay();
  asideEl.classList.remove('overlay-mode');
  try { clearIllustSelection(); } catch (ee) { }
  try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
  asideEl.style.display = 'none';
        return;
      }
      // if click outside the gallery content, close
      if (wrap && !wrap.contains(e.target) && carousel.allowClickClose) {
        stopAutoplay();
  asideEl.classList.remove('overlay-mode');
  try { clearIllustSelection(); } catch (ee) { }
  try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
  asideEl.style.display = 'none';
      }
    });

    // When overlay-mode is added/removed programmatically, start/stop autoplay accordingly
    const obs = new MutationObserver((mutations) => {
      const setImageState = (on) => {
        const illustLi = asideEl.querySelector('ul>li.illustpop');
        // make whole subtree inert and non-interactive when off
        try {
          if (!illustLi) return;
          if (on) {
            // restore
            illustLi.querySelectorAll('*').forEach(el => {
              try {
                el.style.pointerEvents = '';
                if (el.tagName === 'IMG' || el.matches && el.matches('a,button,input,select,textarea')) {
                  el.setAttribute('tabindex', el.dataset._savedTabIndex || '0');
                }
                el.setAttribute('aria-hidden', 'false');
              } catch (e) { }
            });
            try { illustLi.inert = false; } catch (e) { }
          } else {
            // save existing tabindex for restore
            illustLi.querySelectorAll('*').forEach(el => {
              try {
                const ti = el.getAttribute('tabindex');
                if (ti !== null) el.dataset._savedTabIndex = ti;
                el.style.pointerEvents = 'none';
                el.setAttribute('tabindex', '-1');
                el.setAttribute('aria-hidden', 'true');
              } catch (e) { }
            });
            try { illustLi.inert = true; } catch (e) { }
          }
        } catch (e) { console.warn('[setImageState] error', e); }
      };

      for (const m of mutations) {
        if (m.attributeName === 'class' && m.target === asideEl) {
          const isOn = asideEl.classList.contains('overlay-mode');
          if (isOn) {
            // give DOM a tick then ensure track is interactive, carousel setup and start autoplay
            setTimeout(() => {
              const trackEl = asideEl.querySelector('.illust-track');
              if (trackEl) {
                trackEl.style.pointerEvents = '';
                trackEl.style.touchAction = trackEl.style.touchAction || 'pan-y';
              }
              // remove inert so focusable elements are exposed to AT
              try { asideEl.inert = false; } catch (e) { /* inert may not be supported */ }
              setupCarousel(); startAutoplay(); setImageState(true);
              // focus management: move focus to close button and remember previous focus
              try {
                const closeBtn = asideEl.querySelector('.close-btn');
                if (!aside._prevFocus) aside._prevFocus = document.activeElement;
                if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus({ preventScroll: true });
              } catch (e) { /* ignore */ }
            }, 60);
          } else {
            stopAutoplay();
            // immediately disable interaction with images
            setImageState(false);
            try { clearIllustSelection(); } catch (ee) { }
            try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
            // if an element inside aside currently has focus, blur it to avoid aria-hidden on focused
            try {
              const active = document.activeElement;
              if (active && asideEl.contains(active)) {
                active.blur();
              }
            } catch (e) { /* ignore */ }
            // restore previously focused element if available
            try { if (aside._prevFocus && typeof aside._prevFocus.focus === 'function') aside._prevFocus.focus(); } catch (e) { }
            aside._prevFocus = null;
            // mark aside inert to fully prevent focus and AT access
            try { asideEl.inert = true; } catch (e) { /* ignore if not supported */ }
            // clear carousel references to avoid stale handlers
            carousel.track = null;
            carousel.slides = [];
            carousel.step = 0;
            carousel.realCount = 0;
          }
        }
      }
    });
    obs.observe(asideEl, { attributes: true, attributeFilter: ['class'] });

    // Pause autoplay while user is interacting with the gallery; use delegation so it works
    // even if .illust-gallery/.illust-track elements are removed and re-added.
    (function attachHoverPause() {
      if (!asideEl) return;
      // pointerover => pause when entering gallery area
      asideEl.addEventListener('pointerover', (e) => {
        try {
          if (!asideEl.classList.contains('overlay-mode')) return;
          if (!e.target.closest || !e.target.closest('.illust-gallery')) return;
          stopAutoplay();
        } catch (err) { /* ignore */ }
      });
      // pointerout => resume shortly after leaving gallery area
      asideEl.addEventListener('pointerout', (e) => {
        try {
          if (!asideEl.classList.contains('overlay-mode')) return;
          if (!e.target.closest || !e.target.closest('.illust-gallery')) return;
          setTimeout(() => { if (asideEl.classList.contains('overlay-mode')) startAutoplay(); }, 300);
        } catch (err) { /* ignore */ }
      });
      // touch fallbacks (delegated checks)
      asideEl.addEventListener('touchstart', (e) => { try { if (e.target.closest('.illust-gallery')) stopAutoplay(); } catch (err) { } }, { passive: true });
      asideEl.addEventListener('touchend', (e) => { try { if (e.target.closest('.illust-gallery')) setTimeout(() => { if (asideEl.classList.contains('overlay-mode')) startAutoplay(); }, 300); } catch (err) { } });
    })();

    // Wheel support: allow mouse wheel (vertical or horizontal) to control carousel when overlay is active
    // Non-passive listener so we can prevent default scrolling when appropriate.
    (function attachWheelHandler() {
      if (!asideEl) return;
      let wheelAccum = 0; // accumulate small wheel deltas to avoid one-pixel jitter
      let wheelTimeout = null;

      asideEl.addEventListener('wheel', (e) => {
        try {
          // Only handle when overlay-mode is active
          if (!asideEl.classList.contains('overlay-mode')) return;
          // Only when pointer is over the gallery area
          const overGallery = !!(e.target && e.target.closest && e.target.closest('.illust-gallery'));
          if (!overGallery) return;

          // Prevent page / Lenis from scrolling horizontally while overlay is active
          e.preventDefault();
          e.stopPropagation();

          // convert wheel delta to horizontal movement: prefer deltaX if present, otherwise use deltaY
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? -e.deltaX : -e.deltaY;
          // Accumulate and threshold to trigger slide moves, because many mice/touchpads send small deltas
          wheelAccum += delta;

          // pause autoplay while wheel interacting
          stopAutoplay();

          // if user is currently dragging, ignore wheel to avoid fights
          if (carousel.isDragging) return;

          // threshold: use 100 px of accumulated wheel to move one slide (tunable)
          const threshold = Math.max(80, (carousel.step || window.innerWidth) / 3);
          if (Math.abs(wheelAccum) >= threshold) {
            if (wheelAccum > 0) {
              // moved right (previous visually), so decrement logical index
              carousel.index -= 1;
            } else {
              // moved left -> next
              carousel.index += 1;
            }
            // animate
            if (carousel.track && carousel.realCount) {
              const tx = -carousel.step * (carousel.realCount + carousel.index);
              carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
              carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
              carousel.baseTranslate = tx;
              console.log('[wheel] moved to index=', carousel.index, 'tx=', tx);
            }
            wheelAccum = 0;
          }

          // resume autoplay after short inactivity
          if (wheelTimeout) clearTimeout(wheelTimeout);
          wheelTimeout = setTimeout(() => {
            wheelAccum = 0;
            if (asideEl.classList.contains('overlay-mode')) startAutoplay();
          }, 200);
        } catch (err) { /* ignore */ }
      }, { passive: false });
    })();
  })();

  // Caption element for illust overlay (shows title + year on hover)
  (function attachHoverCaption() {
    try {
      const asideEl = document.querySelector('aside');
      if (!asideEl) return;
      // avoid duplicate insertion
      if (asideEl._hasIllustCaption) return; asideEl._hasIllustCaption = true;

      const caption = document.createElement('div');
      caption.className = 'illust-caption';
      caption.innerHTML = '<span class="title"></span><span class="year"></span>';
      document.body.appendChild(caption);

      let hoverTimer = null;

      // Use delegation on aside so it remains valid even if .illust-track nodes are replaced.
      asideEl.addEventListener('pointerover', (e) => {
        try {
          if (!asideEl.classList.contains('overlay-mode')) return;
          const img = e.target.closest && e.target.closest('img');
          if (!img) return;
          if (!img.closest || !img.closest('.illust-track')) return;
          const title = img.dataset.title || img.alt || '';
          const year = img.dataset.year || '';
          caption.querySelector('.title').textContent = title;
          caption.querySelector('.year').textContent = year || '';
          if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
          caption.classList.add('show');
        } catch (err) { /* ignore */ }
      });

      asideEl.addEventListener('pointerout', (e) => {
        try {
          if (!asideEl.classList.contains('overlay-mode')) {
            caption.classList.remove('show');
            return;
          }
          // if moving between images inside the same track, do not hide immediately
          if (hoverTimer) clearTimeout(hoverTimer);
          hoverTimer = setTimeout(() => caption.classList.remove('show'), 120);
        } catch (err) { /* ignore */ }
      });

      // ensure caption hides when overlay is closed
      const mo = new MutationObserver(() => {
        if (!asideEl.classList.contains('overlay-mode')) caption.classList.remove('show');
      });
      mo.observe(asideEl, { attributes: true, attributeFilter: ['class'] });
    } catch (e) {
      // non-fatal
    }
  })();




  /* ==================================================
      7. 버튼 hover 보정
  ================================================== */
  const directBtns = document.querySelectorAll(".direct_plan, .direct_output");
  directBtns.forEach(btn => {
    btn.addEventListener("mouseenter", () => btn.classList.add("is-hover"));
    btn.addEventListener("mouseleave", () => btn.classList.remove("is-hover"));
    btn.addEventListener("focus", () => btn.classList.add("is-hover"));
    btn.addEventListener("blur", () => btn.classList.remove("is-hover"));
  });

  // 햄버거 메뉴 열기/닫기: 로드 시 닫힘 보장, 클릭 시 토글
  const hamburger = document.querySelector('.hamburger');
  const sideMenu = document.querySelector('.side_menu');
  const closeBtn = document.querySelector('.side_menu .close_btn');

  // 초기 상태: 메뉴 닫힘
  if (sideMenu) {
    // Defensive: remove any server-rendered/inline 'on' class and ensure closed state
    sideMenu.classList.remove('on');
    sideMenu.classList.add('close');
    // Accessibility: mark hidden
    sideMenu.setAttribute('aria-hidden', 'true');
    // Prevent possible flash by nudging its position via inline style until CSS applies
    sideMenu.style.display = 'none';
    if (!sideMenu.style.right) sideMenu.style.right = '-420px';
  }

  if (hamburger && sideMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      // 토글 only
      const isOpen = sideMenu.classList.toggle('on');
      sideMenu.classList.toggle('close', !isOpen);
      sideMenu.setAttribute('aria-hidden', (!isOpen).toString());
      // manage display: when opening, set display:flex then remove inline right to allow transition
      if (isOpen) {
        sideMenu.style.display = 'flex';
        // allow a tick for CSS to apply then remove inline right to let transition animate
        requestAnimationFrame(() => sideMenu.style.right = '');
        // if a page-specific controller provided an openHome helper, call it to
        // ensure Home submenu is expanded when menu opens (helps aboutme page)
        try { if (window.sideMenu && typeof window.sideMenu.openHome === 'function') window.sideMenu.openHome(); } catch (e) { /* ignore */ }
      } else {
        // hide after transition (give time for transition to move right)
        sideMenu.style.right = '-420px';
        if (typeof sideMenu.closeAllSubmenus === 'function') sideMenu.closeAllSubmenus();
        sideMenu.setAttribute('aria-hidden', 'true');
        setTimeout(() => sideMenu.style.display = 'none', 600);
      }
    });

    // 메뉴 바깥 클릭 시 닫힘
    document.addEventListener('click', (e) => {
      if (sideMenu.classList.contains('on') && !sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        sideMenu.classList.remove('on');
        sideMenu.classList.add('close');
        sideMenu.setAttribute('aria-hidden', 'true');
        if (typeof sideMenu.closeAllSubmenus === 'function') sideMenu.closeAllSubmenus();
        sideMenu.style.right = '-420px';
        setTimeout(() => sideMenu.style.display = 'none', 600);
      }
    });
  }

  if (sideMenu && closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('on');
      sideMenu.classList.add('close');
      sideMenu.setAttribute('aria-hidden', 'true');
      if (typeof sideMenu.closeAllSubmenus === 'function') sideMenu.closeAllSubmenus();
      sideMenu.style.right = '-420px';
      setTimeout(() => sideMenu.style.display = 'none', 600);
    });
  }

  // 사이드 메뉴 Home 하위 메뉴 토글
  const menuList = document.querySelector('.side_menu .menu ul.menu_list');
  console.debug('menuList init', { exists: !!menuList });
  if (menuList) {
    const homeItem = menuList.querySelector('li.menu_item'); // 첫 번째 li(Home)
    const homeSubMenu = homeItem?.querySelector('ul');
    const homeAnchor = homeItem?.querySelector('span');
    console.debug('homeItem/homeAnchor found', { homeItem: !!homeItem, homeAnchor: !!homeAnchor, homeSubMenu: !!homeSubMenu });

    // helper: open submenu smoothly
    function openSubmenu(ul, item) {
      if (!ul || !item) return;
      // cleanup existing end handler if present
      if (ul._submenuOnEnd) {
        ul.removeEventListener('transitionend', ul._submenuOnEnd);
        ul._submenuOnEnd = null;
      }
      // close others
      menuList.querySelectorAll('li.menu_item > ul.open').forEach(other => {
        if (other !== ul) closeSubmenu(other, other.previousElementSibling);
      });
      // ensure start from collapsed state to trigger transition reliably
      ul.style.maxHeight = '0';
      // allow next frame to add open class and set target height
      requestAnimationFrame(() => {
        ul.classList.add('open');
        ul.setAttribute('aria-hidden', 'false');
        item?.querySelector(':scope > a')?.setAttribute('aria-expanded', 'true');

        // compute target height; sometimes ancestor is display:none and scrollHeight==0
        // poll a few frames until a non-zero scrollHeight is available or attempts exhausted
        const computeAndSetHeight = (attempt = 0) => {
          const h = ul.scrollHeight || 0;
          if (h > 0 || attempt >= 8) {
            // trigger layout then set height
            void ul.offsetHeight;
            ul.style.maxHeight = (h > 0 ? h : 0) + 'px';
            const onEnd = (ev) => {
              if (ev.propertyName !== 'max-height') return;
              // clear inline height so content changes don't get clipped
              ul.style.maxHeight = '';
              ul.removeEventListener('transitionend', onEnd);
              ul._submenuOnEnd = null;
            };
            ul._submenuOnEnd = onEnd;
            ul.addEventListener('transitionend', onEnd);
            return;
          }
          // wait a frame and retry
          requestAnimationFrame(() => {
            setTimeout(() => computeAndSetHeight(attempt + 1), 30);
          });
        };
        computeAndSetHeight(0);
      });
      console.debug('openSubmenu called', { item });
    }

    // helper: close submenu smoothly
    function closeSubmenu(ul, item) {
      if (!ul || !item) return;
      // cleanup existing end handler if present
      if (ul._submenuOnEnd) {
        ul.removeEventListener('transitionend', ul._submenuOnEnd);
        ul._submenuOnEnd = null;
      }
      // ensure starting height is set (in case it was '')
      const startH = ul.scrollHeight;
      ul.style.maxHeight = startH + 'px';
      // force reflow then animate to 0
      requestAnimationFrame(() => {
        ul.style.maxHeight = '0';
      });
      ul.setAttribute('aria-hidden', 'true');
      item?.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
      const onEnd = (ev) => {
        if (ev.propertyName !== 'max-height') return;
        ul.classList.remove('open');
        ul.removeEventListener('transitionend', onEnd);
        ul._submenuOnEnd = null;
        // keep maxHeight as 0 to ensure collapsed state
        ul.style.maxHeight = '0';
      };
      ul._submenuOnEnd = onEnd;
      ul.addEventListener('transitionend', onEnd);
      console.debug('closeSubmenu called', { item });
    }

    // expose a helper on sideMenu to close all submenus (used when menu is closed)
    if (sideMenu) {
      sideMenu.closeAllSubmenus = function () {
        menuList.querySelectorAll('li.menu_item > ul.open').forEach(ul => {
          closeSubmenu(ul, ul.previousElementSibling);
        });
      };
      // Expose a small API for other pages that expect a global sideMenu controller.
      // aboutme.html contains a debug snippet that checks window.sideMenu.openHome()
      // — provide those functions here so the check passes and can control the Home submenu.
      try {
        window.sideMenu = window.sideMenu || {};
        window.sideMenu.openHome = function () {
          try { if (typeof openSubmenu === 'function' && homeSubMenu && homeItem) openSubmenu(homeSubMenu, homeItem); } catch (e) { }
        };
        window.sideMenu.closeHome = function () {
          try { if (typeof closeSubmenu === 'function' && homeSubMenu && homeItem) closeSubmenu(homeSubMenu, homeItem); } catch (e) { }
        };
      } catch (e) { /* non-fatal */ }
    }

    homeItem?.addEventListener('click', function (e) {
      // 클릭된 요소가 최상위 Home 앵커(또는 li 자체)를 클릭한 경우, 하위 메뉴 토글
      const clickedA = e.target.closest('a');
      console.debug('homeItem click', { target: e.target.tagName, clickedA: !!clickedA });
      const isTopAnchor = clickedA && clickedA.parentElement === homeItem && clickedA.nextElementSibling && clickedA.nextElementSibling.tagName === 'UL';
      const clickedInsideLi = homeItem.contains(e.target);
      if (isTopAnchor || (!clickedA && clickedInsideLi)) {
        e.preventDefault();
        e.stopPropagation();
        if (!homeSubMenu) return;
        const isOpen = homeSubMenu.classList.contains('open');
        if (isOpen) closeSubmenu(homeSubMenu, homeItem);
        else openSubmenu(homeSubMenu, homeItem);
        return;
      }
      // 하위 메뉴의 링크를 클릭한 경우는 기존 sideAnchors 핸들러가 처리하므로 기본 동작 허용
    });

    // Also attach directly to the top anchor to be extra-safe
    if (homeAnchor) {
      homeAnchor.addEventListener('click', (e) => {
        console.debug('homeAnchor click', { target: e.target.tagName });
        e.preventDefault();
        e.stopPropagation();
        if (!homeSubMenu) return;
        const isOpen = homeSubMenu.classList.contains('open');
        if (isOpen) closeSubmenu(homeSubMenu, homeItem);
        else openSubmenu(homeSubMenu, homeItem);
      });
    }

    // Safety: capture-phase listener on any .home-toggle anchors to ensure
    // we toggle submenu even if other listeners stopPropagation or preventDefault.
    document.addEventListener('click', (e) => {
      try {
        const t = e.target.closest && e.target.closest('.home-toggle');
        if (!t) return;
        console.debug('capture home-toggle click', { tag: e.target.tagName });
        e.preventDefault();
        e.stopPropagation();
        if (!homeSubMenu) return;
        const isOpen = homeSubMenu.classList.contains('open');
        if (isOpen) closeSubmenu(homeSubMenu, homeItem);
        else openSubmenu(homeSubMenu, homeItem);
      } catch (err) { /* ignore */ }
    }, true); // use capture phase

    // Initialize aria states for any existing submenus (in case of server-rendered classes)
    // Centralized sync: ensure aria attributes, anchor aria-expanded, and inline maxHeight
    // are consistent with the element's .open class. Run at init and when classes change.
    function syncSubmenuState() {
      menuList.querySelectorAll('li.menu_item').forEach((li) => {
        const ul = li.querySelector('ul');
        const topA = li.querySelector(':scope > a, :scope > span, :scope > .home-toggle');
        if (!ul) return;
        if (ul.classList.contains('open')) {
          ul.setAttribute('aria-hidden', 'false');
          if (topA) topA.setAttribute('aria-expanded', 'true');
          // If no explicit maxHeight or it's '0', set to scrollHeight to allow transition
          if (!ul.style.maxHeight || ul.style.maxHeight === '0px') {
            ul.style.maxHeight = ul.scrollHeight + 'px';
            // clear after transition to allow dynamic content
            const _clear = () => { ul.style.maxHeight = ''; ul.removeEventListener('transitionend', _clear); };
            ul.addEventListener('transitionend', _clear);
          }
        } else {
          ul.setAttribute('aria-hidden', 'true');
          if (topA) topA.setAttribute('aria-expanded', 'false');
          ul.style.maxHeight = '0';
        }
      });
      console.debug('syncSubmenuState executed');
    }

    // run initially
    syncSubmenuState();

    // observe class changes within menuList to keep ARIA in sync (defensive)
    try {
      const mo = new MutationObserver((mutations) => {
        let needsSync = false;
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'class') { needsSync = true; break; }
          if (m.type === 'childList') { needsSync = true; break; }
        }
        if (needsSync) {
          // small debounce
          clearTimeout(menuList._syncTimer);
          menuList._syncTimer = setTimeout(() => syncSubmenuState(), 40);
        }
      });
      mo.observe(menuList, { attributes: true, subtree: true, childList: true, attributeFilter: ['class'] });
    } catch (e) { /* ignore if MutationObserver not available */ }

    // Keyboard accessibility: Space/Enter toggles top-level anchors that control submenus
    menuList.querySelectorAll('li.menu_item > a').forEach(a => {
      const ul = a.nextElementSibling;
      if (!ul || ul.tagName !== 'UL') return;
      // ensure ul has an id for aria-controls
      if (!ul.id) ul.id = `submenu-${Math.random().toString(36).substr(2, 6)}`;
      a.setAttribute('aria-controls', ul.id);
      a.addEventListener('keydown', (ev) => {
        if (ev.key === ' ' || ev.key === 'Spacebar' || ev.key === 'Enter') {
          ev.preventDefault();
          a.click();
        }
      });
    });

    // 메뉴 바깥 클릭 시 하위 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (!homeItem.contains(e.target)) {
        if (homeSubMenu && homeSubMenu.classList.contains('open')) {
          closeSubmenu(homeSubMenu, homeItem);
        }
      }
    });

    // Delegate click handler as a robust fallback for submenu anchors (works even if individual handlers missing)
    menuList.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      // if some other handler already prevented default, don't interfere
      if (e.defaultPrevented) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      console.debug('menuList delegated click', { href, id, hasTarget: !!target, hasHorizontal: !!hasHorizontal, hasLenis: !!lenis });
      e.preventDefault();
      if (!target) {
        // not on this page — store target id then redirect to index (avoid native hash jump)
        // Also append a query param as a reliable fallback for servers/clients where
        // sessionStorage may be cleared or not available in the next load event.
        console.debug('menuList delegated click -> target not found, storing and redirecting', { href, id });
        try { a.blur && a.blur(); } catch (e) { /* ignore */ }
        try { sessionStorage.setItem('scrollTargetId', id); } catch (e) { /* ignore */ }
        const qurl = `index.html?scrollTarget=${encodeURIComponent(id)}`;
        window.location.href = qurl;
        return;
      }
      if (hasHorizontal && lenis) {
        const maxScroll = Math.max(0, totalWidth - window.innerWidth);
        // Prefer panel-aligned offset if applicable
        const computedTarget = computeTargetScrollForElement(target);
        const panelOffset = getPanelOffsetForElement(target);
        const preferred = (computedTarget !== null) ? computedTarget : ((panelOffset !== null) ? panelOffset : target.offsetLeft);
        const dest = Math.min(preferred, maxScroll);
        console.debug('menuList -> lenis scroll', { targetOffset: target.offsetLeft, computedTarget, panelOffset, totalWidth, maxScroll, dest });
        adjustedScrollTo(dest, { _hashId: id });
      } else {
        // fallback to in-page anchor
        console.debug('menuList -> fallback scrollIntoView', { targetOffset: target.offsetLeft });
        target.scrollIntoView({ behavior: 'smooth' });
      }
      // close menu
      if (sideMenu) {
        sideMenu.classList.remove('on');
        sideMenu.classList.add('close');
        sideMenu.setAttribute('aria-hidden', 'true');
        if (typeof sideMenu.closeAllSubmenus === 'function') sideMenu.closeAllSubmenus();
        sideMenu.style.right = '-420px';
        setTimeout(() => sideMenu.style.display = 'none', 600);
      }
    });
  }

  // 타이틀(Menu)을 눌러도 하위메뉴가 열리도록 처리
  const titMenu = document.querySelector('.side_menu .menu .tit_menu');
  if (titMenu && menuList) {
    titMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const homeItem = menuList.querySelector('li.menu_item');
      const homeSubMenu = homeItem?.querySelector('ul');
      if (!homeSubMenu) return;
      const isOpen = homeSubMenu.classList.contains('open');
      if (isOpen) closeSubmenu(homeSubMenu, homeItem);
      else openSubmenu(homeSubMenu, homeItem);
    });
  }

  // 사이드 메뉴 내부 앵커 클릭 -> Lenis로 수평 스크롤 처리
  const sideAnchors = document.querySelectorAll('.side_menu .menu ul.menu_list a[href^="#"]');
  if (sideAnchors.length) {
    sideAnchors.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href');
        if (!href || href === '#') return;
        const id = href.slice(1);
        const target = document.getElementById(id);
        if (!target) {
          // 현재 페이지에 타겟이 없으면 index로 이동하되, 세션에 목적지 id를 저장합니다.
          // 이를 통해 index에서 Lenis로 정확하게 스크롤합니다.
          console.debug('sideAnchor click -> target not found, storing and redirecting', { href, id });
          try { a.blur && a.blur(); } catch (e) { /* ignore */ }
          try { sessionStorage.setItem('scrollTargetId', id); } catch (e) { /* ignore */ }
          const qurl2 = `index.html?scrollTarget=${encodeURIComponent(id)}`;
          window.location.href = qurl2;
          return;
        }
        // 가로 레이아웃이 있는 페이지이면 Lenis로 스크롤, 아니면 인덱스로 리디렉트
        if (hasHorizontal && lenis) {
          const maxScroll = Math.max(0, totalWidth - window.innerWidth);
          const computedTarget = computeTargetScrollForElement(target);
          const panelOffset = getPanelOffsetForElement(target);
          const preferred = (computedTarget !== null) ? computedTarget : ((panelOffset !== null) ? panelOffset : target.offsetLeft);
          const dest = Math.min(preferred, maxScroll);
          console.debug('sideAnchor -> lenis.scroll', { href, id, targetOffset: target.offsetLeft, computedTarget, panelOffset, totalWidth, maxScroll, dest });
          adjustedScrollTo(dest, { _hashId: id });
        } else {
          console.debug('sideAnchor -> redirect to index', { href, id });
          window.location.href = `index.html#${id}`;
          return;
        }
        // 메뉴 자동 닫기
        if (sideMenu) {
          sideMenu.classList.remove('on');
          sideMenu.classList.add('close');
          sideMenu.setAttribute('aria-hidden', 'true');
          if (typeof sideMenu.closeAllSubmenus === 'function') sideMenu.closeAllSubmenus();
          sideMenu.style.right = '-420px';
          setTimeout(() => sideMenu.style.display = 'none', 600);
        }
      });
    });
  }

  // 가로 레이아웃 페이지에서 location.hash가 있으면 Lenis로 스크롤하여 적절한 섹션으로 이동
  if (hasHorizontal && typeof window !== 'undefined') {
    // Prefer sessionStorage-stored target id (set when redirecting from other pages)
    const storedId = (function () { try { return sessionStorage.getItem('scrollTargetId'); } catch (e) { return null; } })();
    const initialHash = window.location.hash;
    const idFromHash = initialHash ? initialHash.slice(1) : null;
    const id = storedId || idFromHash;
    if (storedId) {
      try { sessionStorage.removeItem('scrollTargetId'); } catch (e) { /* ignore */ }
    }
    if (id) {
      const target = document.getElementById(id);
      if (target && lenis) {
        // 페이지 렌더링/레이아웃 안정화까지 기다린 뒤 Lenis로 스크롤합니다.
        // target.offsetLeft가 안정화(값이 더 이상 변하지 않음)되거나
        // 최대 시도 횟수에 도달하면 스크롤을 수행합니다.
        const tryScroll = (attempt = 0, lastOffset = -1) => {
          // recalc totalWidth in case layout changed after initial measurement
          totalWidth = 0;
          panels.forEach(panel => { totalWidth += panel.offsetWidth; });
          const maxScroll = Math.max(0, totalWidth - window.innerWidth);
          const offset = target.offsetLeft;
          const dest = Math.min(offset, maxScroll);
          console.debug('[initial-hash] tryScroll', { attempt, offset, lastOffset, totalWidth, maxScroll, dest });
          try { dumpPanelMetrics('[initial-hash] tryScroll', id); } catch (e) { }
          // offset이 더 이상 변하지 않거나 시도 횟수 초과 시 스크롤
          if (offset === lastOffset || attempt >= 10) {
            console.debug('[initial-hash] final scroll', { attempt, offset, dest });
            try {
              // Prefer panel offset on initial load as well
              const computedTarget = computeTargetScrollForElement(target);
              const panelOffset = getPanelOffsetForElement(target);
              const finalPreferred = (computedTarget !== null) ? computedTarget : ((panelOffset !== null) ? panelOffset : dest);
              adjustedScrollTo(finalPreferred, { _hashId: id });
            } catch (e) { console.error('[initial-hash] adjustedScrollTo error', e); }
            // verify result and apply up to 3 small corrections if needed
            try {
              let verifyAttempts = 0;
              const verify = () => {
                verifyAttempts += 1;
                // current horizontal transform (negative scroll)
                const transform = track && track.style.transform ? track.style.transform : window.getComputedStyle(track).transform;
                let currentX = 0;
                try {
                  const m = transform.match(/matrix\(([^,]+),/);
                  if (m) currentX = Math.abs(parseFloat(m[1]));
                } catch (e) { /* ignore */ }
                const diff = Math.abs(currentX - dest);
                if (diff > 6 && verifyAttempts <= 3) {
                  // apply small correction (lerp a bit towards dest)
                  try { lenis.scrollTo(Math.round(dest)); } catch (e) { /* ignore */ }
                  setTimeout(verify, 120);
                  return;
                }
                // finally update URL hash without causing native jump
                try { history.replaceState(null, '', `${location.pathname}#${id}`); } catch (e) { /* ignore */ }
              };
              setTimeout(verify, 120);
            } catch (e) { try { history.replaceState(null, '', `${location.pathname}#${id}`); } catch (ee) { /* ignore */ } }
            return;
          }
          // 다음 애니메이션 프레임 후 짧은 지연을 두고 재시도
          requestAnimationFrame(() => {
            setTimeout(() => tryScroll(attempt + 1, offset), 30);
          });
        };
        // If we were redirected with a storedId, prefer waiting for full window.load
        // so images/fonts have stabilized; otherwise start after a short delay.
        const startTry = () => setTimeout(() => tryScroll(0, -1), 80);
        if (storedId) {
          if (document.readyState === 'complete') startTry();
          else window.addEventListener('load', startTry, { once: true });
        } else {
          startTry();
        }
      }
    }
  }

  // 햄버거 클릭 시 사이드 메뉴 오픈/클로즈 (심플 토글)
  (function () {
    var hamburger = document.querySelector('.hamburger');
    var sideMenu = document.querySelector('.side_menu');
    var closeBtn = document.querySelector('.side_menu .close_btn');
    if (!hamburger || !sideMenu) return;

    // 초기 상태: 닫힘
    sideMenu.classList.remove('on');
    sideMenu.classList.add('close');

    hamburger.addEventListener('click', function (e) {
      e.stopPropagation();
      sideMenu.classList.add('on');
      sideMenu.classList.remove('close');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        sideMenu.classList.remove('on');
        sideMenu.classList.add('close');
      });
    }

    document.addEventListener('click', function (e) {
      if (sideMenu.classList.contains('on') && !sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        sideMenu.classList.remove('on');
        sideMenu.classList.add('close');
      }
    });
  })();

  // Duplicate home-toggle handler removed. Rely on existing openSubmenu/closeSubmenu helpers below.
});

// removed duplicate debug declarations that caused a SyntaxError

