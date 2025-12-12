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
  document.querySelector(".about-me .enter_about-me")
    ?.addEventListener("click", () => { });

  const clickables = document.querySelectorAll(".click");
  clickables.forEach((el, index) => {
    el.addEventListener("click", () => {

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

});
