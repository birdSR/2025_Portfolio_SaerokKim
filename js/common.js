document.addEventListener("DOMContentLoaded", () => {
  console.log('[common.js] DOMContentLoaded');

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

    // global flag used to temporarily disable Lenis-driven transform updates
    // when the illust popup/gallery is open. Default: closed.
    window.isIllustOpen = false;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    /* ==================================================
        3. 세로 스크롤 → 가로 이동 매핑
    ==================================================*/
    lenis.on("scroll", ({ scroll }) => {
      // do nothing while illust gallery is open to keep background fixed
      if (window.isIllustOpen) return;
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
  clickables.forEach((el, index) => {
    el.addEventListener("click", () => {
      // data-target 속성이 있으면 해당 요소를 열기
      const targetSelector = el.getAttribute("data-target");
      if (targetSelector) {
        const target = document.querySelector(targetSelector);
        if (target) {
          // display: block 또는 .on 클래스 등 원하는 방식으로 열기
          target.style.display = "block";
          target.classList.add("on");
        }
        return;
      }
      // 기존 동작 (home_main, aside)
      if (el.classList.contains("home_main")) {
        lenis.scrollTo(0);
        return;
      }
      const aside = document.querySelector("aside");
      aside.style.display = "block";
      aside.querySelector("ul li.on")?.classList.remove("on");
      aside.querySelector(`ul li:nth-child(${index + 1})`)
        ?.classList.add("on");
    });
  });

  /* === Illust popup gallery behavior (simplified consistent loop) === */
  (function illustGalleryInit() {
    try {
      const illustTrigger = document.querySelector('.illust.click');
      const asideEl = document.querySelector('aside');
      if (!illustTrigger || !asideEl) return;
      const illustLi = asideEl.querySelector('li.illustpop');
      if (!illustLi) return;

      const galleryWrap = illustLi.querySelector('.illust-gallery');
      const track = illustLi.querySelector('.illust-track');
      if (!track) return;

      let scrollWrap = null;
      let autoTimer = null;
      let isOpen = false;
      let isAnimatingLocal = false;
      let isUserInteracting = false;
      let hoverPause = false;
      // while true, do not start automatic looping (set during drag/wheel)
      let autoDisabledForInteraction = false;
      let currentIndex = 0;
      let imgs = [];
      let originalCount = 0;
      let originalImgs = [];
      let slideWidth = 0;
      // timing constants for this gallery
      const AUTO_INTERVAL_MS = 4500;
      const TRANSITION_MS = 1100;

      function ensureWrapper() {
        if (track.parentElement && track.parentElement.classList.contains('illust-scroll-wrapper')) {
          scrollWrap = track.parentElement;
        } else {
          const wrap = document.createElement('div');
          wrap.className = 'illust-scroll-wrapper';
          track.parentNode.insertBefore(wrap, track);
          wrap.appendChild(track);
          scrollWrap = wrap;
        }
        // ensure overflow visible so hover scale won't clip
        scrollWrap.style.overflow = 'hidden';
        // prevent the browser from handling touch gestures inside the gallery
        // so pointer events can drive horizontal dragging reliably
        scrollWrap.style.touchAction = 'none';
        // cursor affordance
        scrollWrap.style.cursor = 'grab';
      }

      function measureSlides() {
        imgs = Array.from(track.querySelectorAll('img'));
        // If originalImgs already known (after createLoopIfNeeded), use it for measurements
        const measureSource = (originalImgs && originalImgs.length) ? originalImgs[0] : imgs[0];
        originalCount = (originalImgs && originalImgs.length) ? originalImgs.length : imgs.length;
        if (!measureSource) return;
        const cs = getComputedStyle(measureSource);
        const marginRight = parseFloat(cs.marginRight) || 0;
        slideWidth = measureSource.offsetWidth + marginRight;
      }

      // caption utilities
      let captionEl = null;
      function ensureCaption() {
        if (captionEl) return captionEl;
        captionEl = document.createElement('div');
        captionEl.className = 'illust-caption';
        // attach to body and fix position relative to viewport
        captionEl.style.position = 'fixed';
        captionEl.style.left = '50%';
        captionEl.style.transform = 'translateX(-50%)';
        captionEl.style.bottom = '88px';
        captionEl.style.pointerEvents = 'none';
        captionEl.style.opacity = '0';
        captionEl.style.transition = 'opacity 360ms ease';
        captionEl.style.zIndex = '10000';
        document.body.appendChild(captionEl);
        return captionEl;
      }
      function repositionCaptionFor(/*img*/) {
        // caption is horizontally centered; vertical position is fixed via bottom.
        if (!captionEl) return;
        captionEl.style.opacity = '1';
      }

      function showCaptionForIndex(idx) {
        if (!track) return;
        const origCount = originalCount || 0;
        if (origCount === 0 || !originalImgs || originalImgs.length === 0) return;
        const logical = ((idx % origCount) + origCount) % origCount;
        const img = originalImgs[logical];
        if (!img) return;
        const cap = ensureCaption();
        const title = img.getAttribute('data-title') || img.getAttribute('alt') || '';
        const year = img.getAttribute('data-year') || '';
        cap.innerHTML = `<span class="title">${title}</span>${year ? `<span class="year">${year}</span>` : ''}`;
        repositionCaptionFor(img);
        cap.classList.add('visible');
        // make sure it's visible
        cap.style.opacity = '1';
      }

      function prepareCaptionForIndex(idx) {
        // prepare content and start faded state so it fades in during transition
        if (!track) return;
        const origCount = originalCount || 0;
        if (origCount === 0 || !originalImgs || originalImgs.length === 0) return;
        const logical = ((idx % origCount) + origCount) % origCount;
        const img = originalImgs[logical];
        if (!img) return;
        const cap = ensureCaption();
        const title = img.getAttribute('data-title') || img.getAttribute('alt') || '';
        const year = img.getAttribute('data-year') || '';
        // set invisible content first
        cap.style.opacity = '0';
        cap.innerHTML = `<span class="title">${title}</span>${year ? `<span class="year">${year}</span>` : ''}`;
        // force layout then fade in
        requestAnimationFrame(() => { cap.style.opacity = '1'; });
      }

      function attachImgHoverHandlers() {
        if (!originalImgs || originalImgs.length === 0) return;
        originalImgs.forEach((img, i) => {
          // show caption on hover / pointer enter
          img.addEventListener('pointerenter', () => {
            try { showCaptionForIndex(i); } catch (e) { }
            hoverPause = true;
            stopAuto();
          });
          // restore caption and auto-play on leave
          img.addEventListener('pointerleave', () => {
            try { showCaptionForIndex(currentIndex); } catch (e) { }
            hoverPause = false;
            // only restart auto if not being dragged or otherwise interacting
            if (!isUserInteracting && !dragging) startAuto();
          });
        });
      }

      function createLoopIfNeeded() {
        if (track.dataset.looped) return;
        // originalImgs should be populated before calling
        if (!originalImgs || originalImgs.length === 0) {
          originalImgs = Array.from(track.querySelectorAll('img')).slice(0);
          originalCount = originalImgs.length;
        }
        // prepend a clone of originals (reverse insert to preserve order)
        originalImgs.slice().reverse().forEach(img => {
          track.insertBefore(img.cloneNode(true), track.firstChild);
        });
        // append a clone of originals
        originalImgs.forEach(img => track.appendChild(img.cloneNode(true)));
        track.dataset.looped = '1';
        // refresh imgs reference
        imgs = Array.from(track.querySelectorAll('img'));
      }

      function loadImagesPromise() {
        const imgsAll = Array.from(track.querySelectorAll('img'));
        if (!imgsAll.length) return Promise.resolve();
        return new Promise((resolve) => {
          let remain = imgsAll.length;
          const check = () => { remain -= 1; if (remain <= 0) resolve(); };
          imgsAll.forEach(img => {
            if (img.complete && img.naturalWidth !== 0) check();
            else {
              img.addEventListener('load', function onLoad() { img.removeEventListener('load', onLoad); check(); });
              img.addEventListener('error', function onErr() { img.removeEventListener('error', onErr); check(); });
            }
          });
        });
      }

      function measureOriginals() {
        originalImgs = Array.from(track.querySelectorAll('img')).slice(0);
        originalCount = originalImgs.length;
        if (originalCount === 0) return;
        const cs = getComputedStyle(originalImgs[0]);
        const marginRight = parseFloat(cs.marginRight) || 0;
        slideWidth = originalImgs[0].offsetWidth + marginRight;
      }

      function setTransformForIndex(idx, withTransition = true, cb) {
        if (!scrollWrap) return;
        const viewWidth = scrollWrap.clientWidth || scrollWrap.getBoundingClientRect().width || 0;
        const centerOffset = idx * slideWidth + (slideWidth / 2);
        const target = Math.max(0, centerOffset - viewWidth / 2);
        const rounded = Math.round(target * 100) / 100;
        if (!withTransition) {
          track.style.transition = 'none';
          track.style.transform = `translate3d(${-rounded}px,0,0)`;
          if (cb) cb();
          return;
        }
        // if user starts interacting while animation scheduled, cancel and let user take control
        if (isUserInteracting && !dragging) {
          // prefer to abort animation if some other interaction is active
          track.style.transition = 'none';
          track.style.transform = `translate3d(${-rounded}px,0,0)`;
          if (cb) cb();
          return;
        }
        isAnimatingLocal = true;
        // prepare caption content so it can fade-in alongside the slide
        try { prepareCaptionForIndex(idx); } catch (e) { }
        track.style.willChange = 'transform';
        track.style.transition = `transform ${TRANSITION_MS}ms linear`;
        track.style.transform = `translate3d(${-rounded}px,0,0)`;

        function onEnd(e) {
          if (e && e.propertyName && e.propertyName !== 'transform') return;
          track.removeEventListener('transitionend', onEnd);
          track.style.willChange = '';
          // normalize index if we've moved into the cloned areas (we use triple-copy)
          if (originalCount > 0) {
            const total = track.children.length; // should be originalCount * 3
            if (idx >= originalCount * 2) {
              // moved into appended clone -> wrap back to middle copy
              currentIndex = idx - originalCount;
              setTransformForIndex(currentIndex, false);
              try { showCaptionForIndex(currentIndex); } catch (e) { }
            } else if (idx < originalCount) {
              // moved into prepended clone -> wrap forward to middle copy
              currentIndex = idx + originalCount;
              setTransformForIndex(currentIndex, false);
              try { showCaptionForIndex(currentIndex); } catch (e) { }
            } else {
              currentIndex = idx;
              try { showCaptionForIndex(currentIndex); } catch (e) { }
            }
          } else {
            currentIndex = idx;
            try { showCaptionForIndex(currentIndex); } catch (e) { }
          }
          isAnimatingLocal = false;
          if (cb) cb();
        }
        track.addEventListener('transitionend', onEnd);
      }

      function nextSlideSimple() {
        if (isAnimatingLocal || isUserInteracting || autoDisabledForInteraction) return;
        setTransformForIndex(currentIndex + 1, true);
      }

      function startAuto() {
        // don't start auto while user is interacting or we've disabled auto for interaction
        if (autoDisabledForInteraction || hoverPause || isUserInteracting) return;
        if (autoTimer) clearInterval(autoTimer);
        autoTimer = setInterval(() => nextSlideSimple(), AUTO_INTERVAL_MS);
      }
      function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

      // Pointer drag support (simple): allow dragging track transform, then snap to nearest index
      let dragging = false, dragStartX = 0, dragStartTranslate = 0, wheelTimer = null;
      function getCurrentTranslate() {
        const t = getComputedStyle(track).transform || 'none';
        try { const m = new DOMMatrixReadOnly(t); return -m.m41; } catch (e) { return 0; }
      }
      // compute nearest logical index (based on originals) from a given translate value
      function computeNearestIndexFromTranslate(cur) {
        if (!scrollWrap || !originalCount || slideWidth === 0) return { idx: 0, logical: 0, targetIdx: 0 };
        const viewWidth = scrollWrap.clientWidth || scrollWrap.getBoundingClientRect().width || 0;
        // idx in the full track (including prepended clones)
        const idx = Math.round((cur + viewWidth / 2 - (slideWidth / 2)) / slideWidth);
        // logical index within original set
        const logical = ((idx % originalCount) + originalCount) % originalCount;
        // target index should point to the middle copy to avoid edge jumps
        const targetIdx = logical + originalCount;
        return { idx, logical, targetIdx };
      }
      function onPointerDown(e) {
        // start dragging; capture pointer and attach move/up handlers only while dragging
        if (e.pointerType === 'mouse' && e.button !== 0) return; // only left mouse button
        e.preventDefault();
        dragging = true;
        isUserInteracting = true;
        autoDisabledForInteraction = true;
        stopAuto();
        dragStartX = e.clientX;
        dragStartTranslate = getCurrentTranslate();
        try { e.target.setPointerCapture?.(e.pointerId); } catch (err) { }
        // attach global move/up handlers for robust tracking
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        if (scrollWrap) scrollWrap.style.cursor = 'grabbing';
      }
      function onPointerMove(e) {
        if (!dragging) return;
        const dx = dragStartX - e.clientX;
        const pos = dragStartTranslate + dx;
        track.style.transition = 'none';
        track.style.transform = `translate3d(${-Math.round(pos * 100) / 100}px,0,0)`;
      }
      function onPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        try { e.target.releasePointerCapture?.(e.pointerId); } catch (err) { }
        // remove the global handlers added on pointerdown
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        if (scrollWrap) scrollWrap.style.cursor = 'grab';
        // snap to closest logical index and target the middle copy to avoid jumps
        const cur = getCurrentTranslate();
        const { targetIdx } = computeNearestIndexFromTranslate(cur);
        // set currentIndex to target and animate
        currentIndex = targetIdx;
        setTransformForIndex(currentIndex, true, () => { autoDisabledForInteraction = false; isUserInteracting = false; startAuto(); });
      }

      function onWheel(e) {
        // map wheel to horizontal movement: prefer deltaX, else deltaY
        e.preventDefault();
        isUserInteracting = true; autoDisabledForInteraction = true; stopAuto();
        const raw = (Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY);
        // scale slightly for comfortable responsiveness
        const delta = (raw || 0) * 1.25;
        const cur = getCurrentTranslate();
        const pos = cur + delta;
        track.style.transition = 'none';
        track.style.transform = `translate3d(${-Math.round(pos * 100) / 100}px,0,0)`;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          // snap after wheel stops — compute logical then snap to middle copy
          const cur2 = getCurrentTranslate();
          const { targetIdx } = computeNearestIndexFromTranslate(cur2);
          currentIndex = targetIdx;
          setTransformForIndex(currentIndex, true, () => { autoDisabledForInteraction = false; isUserInteracting = false; startAuto(); });
        }, 150);
      }

      function openGallery() {
        asideEl.classList.add('overlay-mode');
        asideEl.style.display = 'block';
        asideEl.setAttribute('aria-hidden', 'false');
        Array.from(asideEl.querySelectorAll('ul > li')).forEach(li => li.style.display = 'none');
        illustLi.style.display = 'flex';
        ensureWrapper();
        // capture originals, create loop, then wait for all images
        measureOriginals();
        createLoopIfNeeded();
        // wait for images to load so measurements are correct
        loadImagesPromise().then(() => {
          // refresh measurements and set starting index to middle copy
          measureSlides();
          // start at the middle (originals in the center)
          currentIndex = originalCount;
          // immediate positioning without delay
          setTransformForIndex(currentIndex, false);
          // attach hover handlers from original images and show initial caption
          attachImgHoverHandlers();
          try { showCaptionForIndex(currentIndex); } catch (e) { }
          window.isIllustOpen = true; if (typeof lenis?.pause === 'function') { try { lenis.pause(); } catch (e) { } }
          document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden';
          // attach pointer/wheel handlers to scrollWrap
          scrollWrap.addEventListener('pointerdown', onPointerDown);
          scrollWrap.addEventListener('wheel', onWheel, { passive: false });
          // immediately advance one slide to start visible loop, then start interval
          nextSlideSimple();
          startAuto();
        }).catch(() => {
          // fallback: still try to measure and start
          measureSlides(); setTransformForIndex(currentIndex, false); startAuto();
        });
      }

      function closeGallery() {
        stopAuto();
        asideEl.classList.remove('overlay-mode');
        asideEl.style.display = '';
        asideEl.setAttribute('aria-hidden', 'true');
        Array.from(asideEl.querySelectorAll('ul > li')).forEach(li => li.style.display = '');
        illustLi.style.display = '';
        window.isIllustOpen = false; if (typeof lenis?.resume === 'function') { try { lenis.resume(); } catch (e) { } }
        document.documentElement.style.overflow = ''; document.body.style.overflow = '';
        // hide and remove caption from body
        if (captionEl) {
          captionEl.style.opacity = '0';
          try { document.body.removeChild(captionEl); } catch (e) { }
          captionEl = null;
        }
        // detach handlers
        if (scrollWrap) {
          scrollWrap.removeEventListener('pointerdown', onPointerDown);
          scrollWrap.removeEventListener('wheel', onWheel);
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }

      // wire controls
      illustTrigger.addEventListener('click', (e) => { e.preventDefault(); openGallery(); });
      const closeBtn = asideEl.querySelector('.close-btn');
      if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeGallery(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeGallery(); });
    } catch (err) { console.debug('[illustGalleryInit] simplified init error', err); }
  })();


  document.querySelector("aside .close-btn")
    ?.addEventListener("click", () => {
      document.querySelector("aside").style.display = "none";
    });




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

