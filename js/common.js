document.addEventListener("DOMContentLoaded", () => {

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
    const homeAnchor = homeItem?.querySelector('> a');
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
        item?.querySelector('> a')?.setAttribute('aria-expanded', 'true');
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
      item?.querySelector('> a')?.setAttribute('aria-expanded', 'false');
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
    menuList.querySelectorAll('li.menu_item').forEach(li => {
      const a = li.querySelector('> a');
      const ul = li.querySelector('ul');
      if (!ul) return;
      if (ul.classList.contains('open')) {
        ul.setAttribute('aria-hidden', 'false');
        a?.setAttribute('aria-expanded', 'true');
      } else {
        ul.setAttribute('aria-hidden', 'true');
        a?.setAttribute('aria-expanded', 'false');
        // ensure collapsed maxHeight
        ul.style.maxHeight = '0';
      }
    });

    // Keyboard accessibility: Space/Enter toggles top-level anchors that control submenus
    menuList.querySelectorAll('li.menu_item > a').forEach(a => {
      const ul = a.nextElementSibling;
      if (!ul || ul.tagName !== 'UL') return;
      // ensure ul has an id for aria-controls
      if (!ul.id) ul.id = `submenu-${Math.random().toString(36).substr(2,6)}`;
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

});
