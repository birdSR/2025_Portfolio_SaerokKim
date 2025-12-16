document.addEventListener("DOMContentLoaded", () => {

  /* ==================================================
      0. 필수 DOM
  ================================================== */
  const wrapper = document.querySelector(".horizontal-wrapper");
  const track = document.querySelector(".horizontal-scroll");
  const panels = document.querySelectorAll(".panel");

  if (!wrapper || !track || !panels.length) {
    console.error("horizontal 구조 DOM 누락");
    return;
  }

  /* ==================================================
      1. 가로 총 길이 계산 → 세로 스크롤 높이 생성
  ================================================== */
  let totalWidth = 0;
  panels.forEach(panel => {
    totalWidth += panel.offsetWidth;
  });

  // viewport 만큼은 빼야 마지막 패널에서 멈춤
  const scrollHeight = totalWidth - window.innerWidth + window.innerHeight;
  document.body.style.height = `${scrollHeight}px`;

  /* ==================================================
      2. Lenis (세로 스크롤 전용)
  ================================================== */
  const lenis = new Lenis({
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
  ================================================== */
  lenis.on("scroll", ({ scroll }) => {
    track.style.transform = `translate3d(${-scroll}px, 0, 0)`;
  });

  /* ==================================================
      4. resize 대응
  ================================================== */
  window.addEventListener("resize", () => {
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
        setTimeout(() => sideMenu.style.display = 'none', 600);
      }
    });

    // 메뉴 바깥 클릭 시 닫힘
    document.addEventListener('click', (e) => {
      if (sideMenu.classList.contains('on') && !sideMenu.contains(e.target) && !hamburger.contains(e.target)) {
        sideMenu.classList.remove('on');
        sideMenu.classList.add('close');
      }
    });
  }

  if (sideMenu && closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('on');
      sideMenu.classList.add('close');
    });
  }

  // 사이드 메뉴 Home 하위 메뉴 토글
  const menuList = document.querySelector('.side_menu .menu ul.menu_list');
  if (menuList) {
    const homeItem = menuList.querySelector('li.menu_item'); // 첫 번째 li(Home)
    const homeSubMenu = homeItem?.querySelector('ul');
    homeItem?.addEventListener('click', function (e) {
      // a 태그 클릭 시에는 기본 이동 막기
      if (e.target.tagName === 'A' && e.target.closest('ul') !== homeSubMenu) return;
      e.stopPropagation();
      // 토글
      if (homeSubMenu) {
        const isOpen = homeSubMenu.classList.contains('open');
        // 모든 하위 ul 닫기
        menuList.querySelectorAll('li.menu_item > ul.open').forEach(ul => ul.classList.remove('open'));
        if (!isOpen) {
          homeSubMenu.classList.add('open');
        }
      }
    });
    // 메뉴 바깥 클릭 시 하위 메뉴 닫기
    document.addEventListener('click', (e) => {
      if (!homeItem.contains(e.target)) {
        homeSubMenu?.classList.remove('open');
      }
    });
  }

});
