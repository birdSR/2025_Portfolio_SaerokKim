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

    // --- top_end_item spread 애니메이션 트리거 (고정/최하단에서만 해제) ---
    (function(){
      const topEnd = document.querySelector('.top_end_item');
      if (!topEnd) return;
      let spreadFixed = false;
      function checkTopEndSpread() {
        const scrollY = window.scrollY || window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const atBottom = (window.scrollY + winHeight) >= (docHeight - 2); // 2px 오차 허용
        if (scrollY <= 0) {
          topEnd.classList.add('spread');
          spreadFixed = true;
        } else if (atBottom) {
          topEnd.classList.remove('spread');
          spreadFixed = false;
        } else if (spreadFixed) {
          topEnd.classList.add('spread');
        }
      }
      window.addEventListener('scroll', () => {
        window.requestAnimationFrame(checkTopEndSpread);
      });
      // 초기 상태도 체크
      checkTopEndSpread();
    })();
});