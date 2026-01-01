document.addEventListener("DOMContentLoaded", () => {
  console.log('[common.js] DOMContentLoaded fired');
  // Diagnostic: log every click at capture phase to ensure events reach document
  document.addEventListener('click', function (ev) {
    try {
      const tgt = ev.target;
      const inClickable = !!tgt.closest && !!tgt.closest('.click');
      console.log('[capture-click] target:', tgt.tagName, 'classList:', tgt.className, 'in .click?:', inClickable);
    } catch (e) {
      console.log('[capture-click] error reading target', e);
    }
  }, true); // use capture phase

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
  if (hasHorizontal) {
    panels.forEach(panel => {
      totalWidth += panel.offsetWidth;
    });
    // 페이지의 세로 문서 높이를 가로 스크롤 전체 너비에 맞춰 계산
    const scrollHeight = totalWidth - window.innerWidth + window.innerHeight;
    document.body.style.height = `${scrollHeight}px`;

    /* ==================================================
        2. Lenis (세로 스크롤 전용)
    ================================================== */
    // Lenis는 가로 레이아웃이 있을 때만 동작하도록 설정합니다.
    lenis = new Lenis({
      smooth: true,
      lerp: 0.08,
      wheelMultiplier: 1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

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
      totalWidth += panel.offsetWidth;
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
    iconPlay.style.display = isPlaying ? "none" : "block";
    iconPause.style.display = isPlaying ? "block" : "none";
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

  toggleBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play();
      isPlaying = true;
    } else {
      audio.pause();
      isPlaying = false;
    }
    updateIcon();
  });

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

  console.log('[common.js] total .click elements found:', clickables.length);
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
          // set aside into overlay mode (CSS will handle sizing/background)
          aside.classList.add('overlay-mode');
          try { aside.inert = false; } catch (e) { }
          aside.setAttribute('aria-hidden', 'false');
          // Inject gallery markup only once (safe to run multiple times)
          if (!targetLi.querySelector('.illust-gallery')) {
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
          const firstImg = targetLi.querySelector('.illust-track img');
          if (firstImg) firstImg.focus({ preventScroll: true });
          console.log('[click] illust overlay shown');
        } else {
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
    const btn = document.querySelector('aside .close-btn') || document.querySelector('.close-btn');
    console.log('[diag] close-btn element found?', !!btn);
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
      document.querySelector("aside").style.display = "none";
    });

  // Overlay gallery swipe + close handling for illust overlay
  (function setupIllustOverlayHandlers() {
    const asideEl = document.querySelector('aside');
    if (!asideEl) return;

    // Close overlay when ESC pressed
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && asideEl.classList.contains('overlay-mode')) {
        asideEl.classList.remove('overlay-mode');
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
      track.style.touchAction = track.style.touchAction || 'pan-y';
      track.style.pointerEvents = track.style.pointerEvents || '';
      carousel.track = track;
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

      // attach handlers (avoid duplicates)
      carousel.track.removeEventListener('transitionend', onTransitionEnd);
      carousel.track.addEventListener('transitionend', onTransitionEnd);
      window.removeEventListener('resize', onResize);
      window.addEventListener('resize', onResize);
    }

    function onTransitionEnd() {
      if (!carousel.track) return;
      const realN = carousel.realCount || 0;
      if (realN === 0) return;
      // If we've animated into the right clone set (visual index >= realN*2), jump back to middle set
      const visualIndex = Math.round((-carousel.baseTranslate) / carousel.step);
      const middleStart = realN;
      if (visualIndex >= realN * 2) {
        // compute equivalent index inside middle set
        const eq = visualIndex - realN * 2;
        carousel.index = eq % realN;
        carousel.track.style.transition = 'none';
        const tx = -carousel.step * (middleStart + carousel.index);
        carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
        carousel.baseTranslate = tx;
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
      console.log('[autoplay] start requested');
      stopAutoplay();
      carousel.autoplayId = setInterval(() => {
        if (carousel.isDragging) return;
        carousel.index += 1;
        const tx = -carousel.step * (carousel.realCount + carousel.index);
        carousel.track.style.transition = 'transform 560ms cubic-bezier(.22,.9,.26,1)';
        carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
        carousel.baseTranslate = tx;
      }, carousel.autoplayInterval);
    }

    function stopAutoplay() {
      if (carousel.autoplayId) {
        clearInterval(carousel.autoplayId);
        carousel.autoplayId = null;
        console.log('[autoplay] stopped');
      } else {
        console.log('[autoplay] stop called but no active interval');
      }
    }

    // pointer handlers
    asideEl.addEventListener('pointerdown', (ev) => {
      // allow pointer interactions when overlay-mode is active OR when illustpop item is visible (.illustpop.on)
      const illustActive = asideEl.classList.contains('overlay-mode') || !!asideEl.querySelector('ul>li.illustpop.on');
      if (!illustActive) return;
      console.log('[pointerdown] clientX=', ev.clientX, 'overlay-mode=', asideEl.classList.contains('overlay-mode'));
      setupCarousel();
      if (!carousel.track) return;
      carousel.isDragging = true;
      carousel.startX = ev.clientX;
      carousel.currentX = ev.clientX;
      // capture current translate from computed style
      const style = getComputedStyle(carousel.track);
      const matrix = new WebKitCSSMatrix(style.transform || '');
      carousel.baseTranslate = matrix.m41 || 0;
      // prevent accidental close when dragging
      carousel.allowClickClose = false;
      carousel.track.setPointerCapture?.(ev.pointerId);
      // pause autoplay while dragging
      console.log('[pointerdown] start drag');
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
      const m = new WebKitCSSMatrix(style.transform || '');
      const cur = Number.isFinite(m.m41) ? m.m41 : carousel.baseTranslate;
      const nearestIndex = Math.round((-cur / carousel.step) - carousel.realCount);
      carousel.index = nearestIndex;
      const tx = -carousel.step * (carousel.realCount + carousel.index);
      carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      setTimeout(() => { if (asideEl.classList.contains('overlay-mode')) startAutoplay(); }, 600);
    });

    asideEl.addEventListener('pointerleave', (ev) => {
      // if pointer leaves the aside while pressing, treat like pointerup
      if (carousel.isDragging) {
        const fake = Object.assign({}, ev);
        asideEl.dispatchEvent(new PointerEvent('pointerup', { clientX: ev.clientX, pointerId: ev.pointerId }));
      }
    });

    asideEl.addEventListener('pointermove', (ev) => {
      if (!carousel.isDragging || !carousel.track) return;
      ev.preventDefault();
      carousel.currentX = ev.clientX;
      const dx = carousel.currentX - carousel.startX;
      carousel.track.style.transition = 'none';
      carousel.track.style.transform = `translate3d(${carousel.baseTranslate + dx}px,0,0)`;
      if (Math.abs(dx) > 5) console.log('[pointermove] dx=', dx);
    });

    asideEl.addEventListener('pointerup', (ev) => {
      console.log('[pointerup] clientX=', ev.clientX);
      if (!carousel.isDragging || !carousel.track) return;
      carousel.track.releasePointerCapture?.(ev.pointerId);
      const dx = carousel.currentX - carousel.startX;
      // threshold: quarter of one step to move one slide
      const threshold = carousel.step / 4;
      if (dx > threshold) {
        // move previous
        carousel.index -= 1;
      } else if (dx < -threshold) {
        // move next
        carousel.index += 1;
      }
      // animate to new position (account for leading clone)
      const tx = -carousel.step * (carousel.realCount + carousel.index);
      carousel.track.style.transition = 'transform 360ms cubic-bezier(.22,.9,.26,1)';
      carousel.track.style.transform = `translate3d(${tx}px,0,0)`;
      carousel.baseTranslate = tx;
      console.log('[pointerup] dx=', dx, 'moved to index=', carousel.index);
      // allow click-close after short delay
      setTimeout(() => { carousel.allowClickClose = true; }, 300);
      carousel.isDragging = false;
      // restart autoplay shortly after release
      setTimeout(() => { if (asideEl.classList.contains('overlay-mode')) startAutoplay(); }, 600);
    });


    // clicking outside gallery or close button should close overlay
    asideEl.addEventListener('click', (e) => {
      if (!asideEl.classList.contains('overlay-mode')) return;
      const wrap = asideEl.querySelector('.illust-gallery-wrap');
      const closeBtn = asideEl.querySelector('.close-btn');
      if (closeBtn && (closeBtn === e.target || closeBtn.contains(e.target))) {
        stopAutoplay();
        asideEl.classList.remove('overlay-mode');
        asideEl.style.display = 'none';
        return;
      }
      // if click outside the gallery content, close
      if (wrap && !wrap.contains(e.target) && carousel.allowClickClose) {
        stopAutoplay();
        asideEl.classList.remove('overlay-mode');
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
            }, 60);
          } else {
            stopAutoplay();
            // immediately disable interaction with images
            setImageState(false);
            // if an element inside aside currently has focus, blur it to avoid aria-hidden on focused
            try {
              const active = document.activeElement;
              if (active && asideEl.contains(active)) {
                active.blur();
              }
            } catch (e) { /* ignore */ }
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
        const h = ul.scrollHeight;
        // trigger layout then set height
        void ul.offsetHeight;
        ul.style.maxHeight = h + 'px';
        const onEnd = (ev) => {
          if (ev.propertyName !== 'max-height') return;
          // clear inline height so content changes don't get clipped
          ul.style.maxHeight = '';
          ul.removeEventListener('transitionend', onEnd);
          ul._submenuOnEnd = null;
        };
        ul._submenuOnEnd = onEnd;
        ul.addEventListener('transitionend', onEnd);
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

    // Initialize aria states for any existing submenus (in case of server-rendered classes)
    menuList.querySelectorAll('li.menu_item').forEach((li, index) => {
      //const a = li.querySelector('> a');
      const ul = li.querySelector('ul');
      if (!ul) return;
      if (ul.classList.contains('open')) {
        ul.setAttribute('aria-hidden', 'false');
        // a?.setAttribute('aria-expanded', 'true');
      } else {
        ul.setAttribute('aria-hidden', 'true');
        // a?.setAttribute('aria-expanded', 'false');
        ul.style.maxHeight = '0';
      }
    });

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
      console.debug('menuList delegated click', { href, id, hasTarget: !!target });
      e.preventDefault();
      if (!target) {
        // not on this page — redirect to index with hash
        window.location.href = `index.html#${id}`;
        return;
      }
      if (hasHorizontal && lenis) {
        const maxScroll = Math.max(0, totalWidth - window.innerWidth);
        const dest = Math.min(target.offsetLeft, maxScroll);
        lenis.scrollTo(dest);
      } else {
        // fallback to in-page anchor
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
          // 현재 페이지에 타겟이 없으면 인덱스 페이지로 이동
          window.location.href = `index.html#${id}`;
          return;
        }
        // 가로 레이아웃이 있는 페이지이면 Lenis로 스크롤, 아니면 인덱스로 리디렉트
        if (hasHorizontal && lenis) {
          const maxScroll = Math.max(0, totalWidth - window.innerWidth);
          const dest = Math.min(target.offsetLeft, maxScroll);
          lenis.scrollTo(dest);
        } else {
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
    const initialHash = window.location.hash;
    if (initialHash) {
      const id = initialHash.slice(1);
      const target = document.getElementById(id);
      if (target && lenis) {
        // 약간의 대기 후(렌더/Lenis 초기화) 스크롤
        setTimeout(() => {
          const maxScroll = Math.max(0, totalWidth - window.innerWidth);
          const dest = Math.min(target.offsetLeft, maxScroll);
          lenis.scrollTo(dest);
        }, 80);
      }
    }
  }

  // 햄버거 클릭 시 사이드 메뉴 오픈/클로즈 (심플 토글)
  document.addEventListener('DOMContentLoaded', function () {
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
  });

  // Home 클릭 시 하위 ul이 슬라이드+페이드로 자연스럽게 열리고 닫히는 JS 보완
  // (index.html, aboutme.html 모두 동작)

  var homeToggle = document.querySelector('.side_menu .home-toggle');
  var homeSubmenu = document.getElementById('home-submenu');
  if (!homeToggle || !homeSubmenu) return;

  // 초기 상태 보장
  homeSubmenu.style.maxHeight = '0';
  homeSubmenu.style.opacity = '0';
  homeSubmenu.classList.remove('open');
  homeSubmenu.setAttribute('aria-hidden', 'true');
  homeToggle.setAttribute('aria-expanded', 'false');

  homeToggle.addEventListener('click', function (e) {
    e.preventDefault();
    var isOpen = homeSubmenu.classList.contains('open');
    if (isOpen) {
      // 닫기
      homeSubmenu.style.maxHeight = homeSubmenu.scrollHeight + 'px';
      homeSubmenu.style.opacity = '1';
      requestAnimationFrame(function () {
        homeSubmenu.style.maxHeight = '0';
        homeSubmenu.style.opacity = '0';
      });
      homeSubmenu.setAttribute('aria-hidden', 'true');
      homeToggle.setAttribute('aria-expanded', 'false');
      homeSubmenu.classList.remove('open');
      // 닫힌 후 maxHeight 해제
      var onEndClose = function (ev) {
        if (ev.propertyName === 'max-height') {
          homeSubmenu.style.maxHeight = '0';
          homeSubmenu.removeEventListener('transitionend', onEndClose);
        }
      };
      homeSubmenu.addEventListener('transitionend', onEndClose);
    } else {
      // 열기
      homeSubmenu.classList.add('open');
      homeSubmenu.setAttribute('aria-hidden', 'false');
      homeToggle.setAttribute('aria-expanded', 'true');
      homeSubmenu.style.maxHeight = homeSubmenu.scrollHeight + 'px';
      homeSubmenu.style.opacity = '1';
      // transition 끝나면 maxHeight 해제(자연스러운 애니메이션)
      var onEnd = function (ev) {
        if (ev.propertyName === 'max-height') {
          homeSubmenu.style.maxHeight = '';
          homeSubmenu.removeEventListener('transitionend', onEnd);
        }
      };
      homeSubmenu.addEventListener('transitionend', onEnd);
    }
  });
});

// removed duplicate debug declarations that caused a SyntaxError

