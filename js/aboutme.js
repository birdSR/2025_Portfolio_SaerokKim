document.addEventListener("DOMContentLoaded", () => {
  // 대상 요소와 계산
  const el = document.getElementById("target");
  if (!el) return;

  // helper: 보텀 요소가 문서 맨 아래에 붙도록 #target min-height 조정
  function fixBottomGap() {
    const bottomEl = el.querySelector('.bottom');
    if (!bottomEl) return;

    // bottomEl의 문서 상단 기준 하단 좌표
    const rect = bottomEl.getBoundingClientRect();
    const bottomDocBottom = window.scrollY + rect.top + rect.height;

    // 문서 전체 높이와 비교
    const docHeight = document.documentElement.scrollHeight;
    if (bottomDocBottom < docHeight) {
      // 현재 문서가 더 길면 별도 처리 불필요
    } else if (bottomDocBottom > docHeight) {
      // 문서가 짧아 .bottom 아래에 여백이 생길 때
      const requiredExtra = bottomDocBottom - docHeight;
      // #target 높이를 늘려서 여백 제거
      const prevMin = parseInt(window.getComputedStyle(el).minHeight) || 0;
      el.style.minHeight = (el.offsetHeight + requiredExtra) + 'px';
    }
  }

  // 스크롤해서 .bottom의 시작 지점(또는 .bottom 위쪽)이 뷰포트 상단으로 오게 함
  function scrollToBottomStart() {
    const bottomEl = el.querySelector('.bottom');
    if (!bottomEl) return;
    // .bottom의 상단을 뷰포트 바닥에 맞추려면 문서에서의 위치를 계산
    const bottomRect = bottomEl.getBoundingClientRect();
    const bottomTopDoc = window.scrollY + bottomRect.top;
    const targetScrollTop = Math.max(0, Math.round(bottomTopDoc - (window.innerHeight - bottomRect.height)));

    try {
      window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    } catch (e) {
      const start = window.scrollY || window.pageYOffset;
      const distance = targetScrollTop - start;
      const duration = 500;
      let startTime = null;
      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const time = timestamp - startTime;
        const progress = Math.min(time / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        window.scrollTo(0, start + distance * ease);
        if (time < duration) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  }

  // 초기 보정 및 스크롤
  fixBottomGap();
  // 보정 이후 재계산이 필요할 수 있어 짧은 지연 후 스크롤 시도
  setTimeout(scrollToBottomStart, 80);

  // 창 크기 변화에 대응: 보정 후 재스크롤
  window.addEventListener('resize', () => {
    fixBottomGap();
    // debounce
    clearTimeout(window._aboutme_scroll_timeout);
    window._aboutme_scroll_timeout = setTimeout(scrollToBottomStart, 120);
  });

  // 캐릭터 및 컨텍스트 박스 등장 애니메이션
  // 캐릭터 SVG 파일명
  const charNames = [
    "about_char_coffee.svg",
    "about_char_legup.svg",
    "about_char_onehup.svg",
    "about_char_readbook.svg",
    "about_char_sdown.svg",
    "about_char_sdownhup.svg",
    "about_char_twohup.svg",
    "about_char_work.svg"
  ];

  // 캐릭터 등장 효과 클래스 부여
  charNames.forEach(name => {
    document.querySelectorAll(`img[src*='${name}']`).forEach(img => {
      img.classList.add("aboutme-fade");
    });
  });

  // top_bird 등장 효과 클래스 부여
  const topBird = document.querySelector('.top_bird');
  if (topBird) {
    topBird.classList.add('aboutme-fade');
    // Intersection Observer로 등장 트리거
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          topBird.classList.add('visible');
        } else {
          topBird.classList.remove('visible');
        }
      });
    }, { threshold: 0.3 });
    observer.observe(topBird);
  }

  // introduce, awords, qualifications, strength, skill, also_do_it, break_time, specialty 트리거 (top_bird 제외)
  const triggerArticles = [
    'introduce', 'awords', 'qualifications', 'strength', 'skill', 'also_do_it', 'break_time', 'specialty'
  ];
  triggerArticles.forEach(cls => {
    const article = document.querySelector(`article.${cls}`);
    if (article) {
      article.classList.add('aboutme-fade');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            article.classList.add('visible');
          } else {
            article.classList.remove('visible');
          }
        });
      }, { threshold: 0.3 });
      observer.observe(article);
    }
  });

  // 모든 context-box, 캐릭터 이미지 초기화 함수
  function resetAllTriggers() {
    document.querySelectorAll('.context-box').forEach(box => {
      box.classList.remove('visible');
    });
    document.querySelectorAll('.aboutme-fade').forEach(img => {
      img.classList.remove('visible');
    });
  }

  // article별로 캐릭터/컨텍스트박스 트리거
  document.querySelectorAll('section.intro > article').forEach(article => {
    const charImg = article.querySelector('.aboutme-fade');
    const contextBox = article.querySelector('.context-box');
    if (charImg) {
      // 캐릭터가 있는 경우: 캐릭터가 보이면 캐릭터+context-box 순차 등장
      let contextTimeout = null;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            charImg.classList.add('visible');
            if (contextBox) {
              contextTimeout = setTimeout(() => contextBox.classList.add('visible'), 300);
            }
          } else {
            charImg.classList.remove('visible');
            if (contextBox) {
              contextBox.classList.remove('visible');
              if (contextTimeout) clearTimeout(contextTimeout);
            }
          }
        });
      }, { threshold: 0.3 });
      observer.observe(charImg);
    } else if (contextBox) {
      // 캐릭터가 없는 경우: context-box만 관찰
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            contextBox.classList.add('visible');
          } else {
            contextBox.classList.remove('visible');
          }
        });
      }, { threshold: 0.3 });
      observer.observe(contextBox);
    }
  });

  // --- top_end_item spread 애니메이션 트리거 (최상단에서만 고정, 최하단에서만 해제) ---
  (function () {
    const topEnd = document.querySelector('.top_end_item');
    if (!topEnd) return;
    let spreadFixed = false;
    function checkTopEndSpread() {
      const scrollY = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const atBottom = (window.scrollY + winHeight) >= (docHeight - 2); // 2px 오차 허용
      if (atBottom) {
        topEnd.classList.remove('spread');
        spreadFixed = false;
      } else if (scrollY <= 0 || spreadFixed) {
        topEnd.classList.add('spread');
        spreadFixed = true;
      }
    }
    window.addEventListener('scroll', checkTopEndSpread);
    // 초기 상태도 체크
    checkTopEndSpread();
  })();

  // .top_bird 안의 .tropy 중 홀수(1,3,5)만 블랙 배경/화이트 텍스트 적용
  const topBirdTropies = document.querySelectorAll('.top_bird .list .tropy');
  topBirdTropies.forEach((tropy, idx) => {
    // b_one~b_six은 모두 .tropy에 붙어 있으므로, 홀수 idx만 적용 (0,2,4)
    if (idx % 2 === 0) {
      const conSpan = tropy.querySelector('.con-span');
      if (conSpan) {
        conSpan.classList.add('black-bg-white-txt');
      }
    }
  });

  // .top_bird 제외, 나머지 .tropy > .con-span 홀수만 블랙 배경/화이트 텍스트 적용 (배경은 .tropy에) - 롤백
  // (아무 동작 없음)

  /* ==================================================
      5. 오디오 컨트롤
  ================================================== */
  // Audio controls are handled centrally by `js/common.js` (setup, autoplay, toggle).
  // This file previously contained a duplicate audio initialization which could
  // interfere with the common handler; that logic has been intentionally removed
  // so `#bgm-audio` and `#audio-toggle` are managed in one place.

});

// Defensive diagnostics and small-safe initializers for aboutme page.
// Non-invasive: only logs presence and ensures expected globals exist.
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('[aboutme.js] diagnostics init');
    // ensure debounce timer variable exists to avoid accidental global leaks elsewhere
    if (typeof window._aboutme_scroll_timeout === 'undefined') window._aboutme_scroll_timeout = null;

    // Report integration points
    console.log('window.sideMenu available:', !!window.sideMenu, window.sideMenu ? Object.keys(window.sideMenu) : null);
    const audio = document.getElementById('bgm-audio');
    const toggleBtn = document.getElementById('audio-toggle');
    console.log('#bgm-audio present:', !!audio, ' #audio-toggle present:', !!toggleBtn);

    // If common.js is not loaded or audio missing, provide a helpful console hint (no automatic changes)
    if (!window.sideMenu) console.warn('[aboutme.js] window.sideMenu not found — common.js may not have loaded yet.');
    if (!audio) console.warn('[aboutme.js] bgm audio element (#bgm-audio) not found.');
  } catch (err) {
    console.warn('[aboutme.js] diagnostics error', err);
  }
});

// Removed immediate debug IIFE to avoid running before DOM is ready.
// Diagnostics now run under DOMContentLoaded handlers (see above).

// Moved from inline aboutme.html: developer debug helper
window.addEventListener('DOMContentLoaded', function movedInlineDebug() {
  try {
    console.group('%c[aboutme debug] 시작 (moved from HTML inline)', 'color: #0b5; font-weight: bold');

    // Stylesheet list and load order
    console.log('stylesheets:', Array.from(document.styleSheets).map(s => s.href).filter(Boolean));

    // Check presence of key elements
    const hamburger = document.querySelector('.hamburger');
    const sideMenu = document.querySelector('.side_menu');
    console.log('.hamburger present:', !!hamburger, hamburger);
    console.log('.side_menu present:', !!sideMenu, sideMenu);

    // Log computed styles for critical rules
    if (hamburger) {
      const ch = getComputedStyle(hamburger);
      console.log('hamburger computed:', ch.position, ch.zIndex);
    }
    if (sideMenu) {
      const cs = getComputedStyle(sideMenu);
      console.log('side_menu computed right/display/z-index:', cs.right, cs.display, cs.zIndex);
    }

    // Inspect same-origin stylesheet rules for duplicated selectors (best-effort)
    try {
      const selectorCounts = {};
      Array.from(document.styleSheets).forEach(ss => {
        if (!ss || !ss.cssRules) return;
        Array.from(ss.cssRules).forEach(rule => {
          if (rule.selectorText) {
            const s = rule.selectorText.trim();
            if (/\.side_menu|\.hamburger/.test(s)) selectorCounts[s] = (selectorCounts[s] || 0) + 1;
          }
        });
      });
      console.log('selectorCounts (side_menu/hamburger):', selectorCounts);
    } catch (e) {
      console.warn('Could not inspect stylesheet rules (cross-origin or blocked):', e.message);
    }

    // Audio debug: try to play and catch promise errors
    const audio = document.getElementById('bgm-audio');
    if (audio) {
      console.log('#bgm-audio src:', audio.src);
      audio.pause();
      audio.currentTime = 0;
      audio.play().then(() => {
        console.log('Audio played successfully (debug test).');
        audio.pause();
      }).catch(err => {
        console.error('Audio play failed (debug test):', err);
      });
    } else {
      console.warn('#bgm-audio element not found');
    }

    // Event hooks for debugging
    if (hamburger) hamburger.addEventListener('click', () => console.log('hamburger clicked (debug)'));
    const closeBtn = document.querySelector('.side_menu .close_btn, .close_btn');
    if (closeBtn) closeBtn.addEventListener('click', () => console.log('side_menu close clicked (debug)'));

    console.groupEnd();
  } catch (err) {
    console.warn('[movedInlineDebug] failed', err);
  }
});