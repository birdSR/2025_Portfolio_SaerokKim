document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.horizontal-scroll');

  container.addEventListener('wheel', (event) => {
    // 세로 스크롤을 막고
    event.preventDefault();

    // deltaY 값을 가로 스크롤로 사용
    container.scrollLeft += event.deltaY;
  }, { passive: false });

  // 가로 스크롤을 휠로 동작하게 하는 스크립트
  const horizontalWrapper = document.querySelector('.horizontal-wrapper');
  horizontalWrapper.addEventListener('wheel', function (e) {
    if (e.deltaY !== 0) {
      e.preventDefault();
      horizontalWrapper.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Lenis.js로 부드러운 가로 스크롤 적용
  if (window.Lenis) {
    const lenis = new Lenis({
      direction: 'horizontal',
      smooth: true,
      gestureDirection: 'both',
      wrapper: document.querySelector('.horizontal-wrapper'),
      content: document.querySelector('.horizontal-scroll'),
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  const audio = document.getElementById('bgm-audio');
  const toggleBtn = document.getElementById('audio-toggle');
  const iconPlay = document.getElementById('audio-icon-play');
  const iconPause = document.getElementById('audio-icon-pause');

  let isPlaying = false;

  function updateIcon() {
    if (isPlaying) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    }
  }

  // 자동 재생 시도 (유저 상호작용 없이)
  function tryAutoPlay() {
    audio.play().then(() => {
      isPlaying = true;
      updateIcon();
    }).catch(() => {
      // 브라우저 정책상 실패 시, 유저 상호작용 후 재생
      document.body.addEventListener('click', autoPlayOnUser);
    });
  }

  function autoPlayOnUser() {
    if (audio.paused) {
      audio.play().catch(() => { });
      isPlaying = true;
      updateIcon();
    }
    document.body.removeEventListener('click', autoPlayOnUser);
  }

  toggleBtn.addEventListener('click', function () {
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
  document.querySelector('.about-me .enter_about-me').addEventListener('click', () => {

  })

  let clickables = document.querySelectorAll('.click');
  clickables.forEach((clickable, index) => {
    clickable.addEventListener('click', () => {
      document.querySelector('aside').style.display = 'block';
      document.querySelector('aside ul li').classList.remove('on');
      document.querySelector('aside ul li:nth-child(' + (index + 1) + ')').classList.add('on');
    });
  });
  document.querySelector('aside .close-btn').addEventListener('click', () => {
    document.querySelector('aside').style.display = 'none';
  });

  // aside 내 .direct_plan, .direct_output 버튼 hover 효과 JS로 보장
  const directBtns = document.querySelectorAll('.direct_plan, .direct_output');
  directBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.classList.add('is-hover');
    });
    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('is-hover');
    });
    // 키보드 접근성: 포커스 시에도 hover 효과
    btn.addEventListener('focus', () => {
      btn.classList.add('is-hover');
    });
    btn.addEventListener('blur', () => {
      btn.classList.remove('is-hover');
    });
  });
});