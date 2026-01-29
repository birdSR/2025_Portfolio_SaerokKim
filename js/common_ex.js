// 전역 런타임 진단: 최상위 에러 및 처리되지 않은 프로미스 거부를 캡처
// 미니파이된 벤더 번들이 에러를 던질 때 스택 트레이스와 파일명을 수집하는 데 도움
(function globalRuntimeDiagnostics() {
  try {
    window.addEventListener('error', function (ev) {
      try {
        // ev.error는 리소스 에러의 경우 null일 수 있음; 사용 가능한 필드 출력
        console.error('[global-error] message=', ev && ev.message, 'filename=', ev && ev.filename, 'lineno=', ev && ev.lineno, 'colno=', ev && ev.colno, 'error=', ev && ev.error);
        if (ev && ev.error && ev.error.stack) console.error('[global-error-stack]', ev.error.stack);
      } catch (e) { /* 로깅 실패 무시 */ }
    });

    window.addEventListener('unhandledrejection', function (ev) {
      try {
        console.error('[unhandledrejection] reason=', ev && ev.reason);
        if (ev && ev.reason && ev.reason.stack) console.error('[unhandledrejection-stack]', ev.reason.stack);
      } catch (e) { /* 로깅 실패 무시 */ }
    });
    // 진단이 활성화되었을 때를 위한 작은 마커
    console.debug('[globalRuntimeDiagnostics] installed');
  } catch (e) { /* 무시 */ }
})();

document.addEventListener("DOMContentLoaded", () => {
  console.log('[common.js] DOMContentLoaded fired');
  // 디버그 헬퍼: event.preventDefault() 호출 추적
  // 페이지 URL에 ?tracePreventDefault=1을 추가하거나 window._enablePreventDefaultTracer(true)를 호출하여 활성화
  (function preventDefaultTracer() {
    try {
      const orig = Event.prototype.preventDefault;
      let enabled = false;
      try { enabled = new URLSearchParams(location.search).get('tracePreventDefault') === '1'; } catch (e) { enabled = false; }
      Event.prototype.preventDefault = function () {
        try {
          if (enabled) {
            // 호출자를 위한 간결한 정보와 스택 로그
            try {
              console.groupCollapsed('[preventDefault tracer] eventType=', this && this.type, 'target=', this && this.target);
              console.log('event:', this);
              // 호출 시점의 JS 스택을 캡처하기 위해 Error().stack 사용
              console.log(new Error('preventDefault stack').stack);
              console.groupEnd();
            } catch (e) { console.log('[preventDefault tracer] logging error', e); }
          }
        } catch (e) { /* 무시 */ }
        return orig.apply(this, arguments);
      };
      window._enablePreventDefaultTracer = (v = true) => { enabled = !!v; console.log('[preventDefault tracer] enabled=', enabled); };
      window._disablePreventDefaultTracer = () => { enabled = false; console.log('[preventDefault tracer] disabled'); };
      console.debug('[preventDefault tracer] installed (enabled=', !!enabled, ')');
    } catch (e) { /* 무시 */ }
  })();
  // ===== 안쓰는거시작 =====
  // aside 내부 앵커의 원본 href를 보존하여 다른 스크립트가 조용히 덮어쓰지 못하도록 함
  // href 속성이 변경되면 복원함
  // 참고: 옵저버가 잘못된 href를 복원하는 충돌로 인해 비활성화됨
  // 필요한 경우 근본 원인 해결 후 재활성화
  (function preserveAsideAnchors() {
    try {
      return; // 비활성화됨
      const asideEl = document.querySelector('aside');
      if (!asideEl) return;
      // data-preserved-href에 초기 href 저장
      function stashAnchors(root) {
        try {
          const list = Array.from((root || asideEl).querySelectorAll('a'));
          list.forEach(a => {
            try {
              const h = a.getAttribute && a.getAttribute('href');
              if (h != null) a.dataset.preservedHref = h;
            } catch (e) { }
          });
        } catch (e) { }
      }
      stashAnchors(asideEl);

      const mo = new MutationObserver((muts) => {
        try {
          muts.forEach(m => {
            try {
              if (m.type === 'attributes' && m.attributeName === 'href') {
                const t = m.target;
                if (t && t.dataset && t.dataset.preservedHref) {
                  const want = t.dataset.preservedHref;
                  const now = t.getAttribute && t.getAttribute('href');
                  if (now !== want) {
                    try { t.setAttribute('href', want); console.debug('[preserve-href] restored href', want, 'on', t); } catch (e) { }
                  }
                }
              }
              if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
                Array.from(m.addedNodes).forEach(n => {
                  try {
                    if (n.nodeType === 1) stashAnchors(n);
                  } catch (e) { }
                });
              }
            } catch (e) { }
          });
        } catch (e) { }
      });
      mo.observe(asideEl, { attributes: true, attributeFilter: ['href'], subtree: true, childList: true });
      // 필요시 디버깅을 위해 노출
      window._preserveAsideHrefObserver = mo;
      console.debug('[preserve-href] aside anchor href preservation active');
    } catch (e) { }
  })();
  // ===== 안쓰는것끝 =====

  // ===== 안쓰는거시작 =====
  // 더 강력한 백업: aside 내부 앵커의 원본 href를 메모리 맵에 보관
  // aside 리스트 인덱스 + 앵커 클래스/텍스트로 키를 생성. 노드가 교체되면 이 맵을 사용하여
  // 원본 HTML 제공 href 값을 즉시 복원함
  // 참고: 인덱스/data-id 매핑이 불일치하여 올바른 href를 덮어쓸 수 있으므로 비활성화됨
  (function preserveAsideOriginalMap() {
    try {
      return; // 비활성화됨
      const asideEl = document.querySelector('aside');
      if (!asideEl) return;
      const map = Object.create(null);
      const listItems = Array.from(asideEl.querySelectorAll('ul > li'));
      listItems.forEach((li, idx) => {
        try {
          const anchors = Array.from(li.querySelectorAll('a'));
          anchors.forEach(a => {
            try {
              const cls = (a.className || '').toString().trim();
              const txt = (a.textContent || '').trim().slice(0, 40);
              // 안정적인 키 선호: 인덱스 기반 불일치를 피하기 위해 li[data-id]가 있을 때 사용
              // 노드가 재정렬되거나 교체되는 경우를 대비
              const lid = (li.dataset && li.dataset.id) ? li.dataset.id : `li${idx}`;
              const key = `${lid}::cls:${cls}::txt:${txt}`;
              map[key] = a.getAttribute && a.getAttribute('href');
            } catch (e) { }
          });
        } catch (e) { }
      });
      // 디버깅을 위해 노출
      window._asideOriginalHrefMap = map;

      const mo2 = new MutationObserver((muts) => {
        try {
          // 관련 변경 발생 시 현재 aside 앵커를 순회하고 원본 맵으로 복원
          const currentLis = Array.from(asideEl.querySelectorAll('ul > li'));
          currentLis.forEach((li, idx) => {
            try {
              const anchors = Array.from(li.querySelectorAll('a'));
              anchors.forEach(a => {
                try {
                  const cls = (a.className || '').toString().trim();
                  const txt = (a.textContent || '').trim().slice(0, 40);
                  // 원본 맵 생성 시 사용된 것과 동일한 안정적인 키를 계산하기 위해
                  // data-id가 있을 때 사용
                  const lid = (li.dataset && li.dataset.id) ? li.dataset.id : `li${idx}`;
                  const key = `${lid}::cls:${cls}::txt:${txt}`;
                  const want = window._asideOriginalHrefMap && window._asideOriginalHrefMap[key];
                  if (want && a.getAttribute && a.getAttribute('href') !== want) {
                    try { a.setAttribute('href', want); console.debug('[aside-original-restore] restored', key, want); } catch (e) { }
                  }
                } catch (e) { }
              });
            } catch (e) { }
          });
        } catch (e) { }
      });
      mo2.observe(asideEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
      window._asideOriginalHrefObserver = mo2;
      console.debug('[aside-original-map] original href map stored and observer active');
    } catch (e) { }
  })();
  // ===== 안쓰는것끝 =====
  // 여러 헬퍼와 진단 도구에서 사용되는 전역 aside 참조
  const aside = document.querySelector('aside');
  // 진단: 이벤트가 document에 도달하는지 확인하기 위해 캡처 단계에서 모든 클릭 로그
  document.addEventListener('click', function (ev) {
    try {
      const tgt = ev.target;
      const inClickable = !!tgt.closest && !!tgt.closest('.click');
      // 노이즈가 많은 출력을 피하기 위해 프로젝트 "click" 영역의 클릭만 상세 로그
      if (inClickable) {
        console.log('[capture-click] target:', tgt.tagName, 'classList:', tgt.className, 'in .click?:', inClickable);
      }
    } catch (e) {
      console.log('[capture-click] error reading target', e);
    }
  }, true); // 캡처 단계 사용

  // 전역 mailto 억제기: aside가 프로그래밍 방식으로 열릴 때
  // window._suppressMailUntil = Date.now() + ms를 설정하여 우발적인 mailto 활성화 방지
  document.addEventListener('click', function (ev) {
    try {
      const a = ev.target && ev.target.closest ? ev.target.closest('a[href^="mailto:"]') : null;
      if (!a) return;
      const until = window._suppressMailUntil || 0;
      if (Date.now() < until) {
        try { ev.preventDefault(); } catch (e) { }
        try { ev.stopPropagation(); } catch (e) { }
        try { console.log('[suppress-mail] blocked mailto click because aside just opened'); } catch (e) { }
      }
    } catch (e) { }
  }, true);

  // 참고: 동작을 단순화하기 위해 타이밍 기반 href 제거(suppressMailto)를 제거함
  // 아래의 DOM-detach 접근 방식(disableMailtoWhileAsideOpen)에 의존하며
  // 이는 브라우저 간 더 견고하고 경쟁 조건이 적음

  // ===== 안쓰는거시작 =====
  // 단순화: DOM에서 mailto 앵커를 분리하지 않음 (안전하지 않음). 대신
  // 액션을 로그하고 DOM 부작용이 없는 경량 헬퍼를 노출. aside가 열려 있는 동안
  // 의도하지 않은 mailto 활성화를 방지하기 위해 캡처 단계 차단기에 의존
  (function disableMailtoWhileAsideOpen_Noop() {
    window._mailtoStash = window._mailtoStash || [];
    window._disableMailtoNow = function () { try { console.debug('[mailto] _disableMailtoNow called (noop)'); } catch (e) { } };
    window._restoreMailtoNow = function () { try { console.debug('[mailto] _restoreMailtoNow called (noop)'); } catch (e) { } };
    window.debug_disableMailtoNow = window._disableMailtoNow;
    window.debug_restoreMailtoNow = window._restoreMailtoNow;
  })();
  // ===== 안쓰는것끝 =====

  // 캡처 단계 임시 차단기: aside 열기 전환 중 네이티브 mailto 실행 방지
  (function attachCaptureBlockerHelpers() {
    try {
      let _handler = null;
      window._attachMailtoCaptureBlocker = function (timeoutMs = 1400) {
        try {
          if (_handler) return;
          _handler = function (ev) {
            try {
              const a = ev.target && ev.target.closest && ev.target.closest('a[href^="mailto:"]');
              if (!a) return;
              // side_menu 내부의 mailto는 정상적으로 작동하도록 허용
              if (a.closest && a.closest('.side_menu')) return;
              try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch (e) { }
              try { console.debug('[mailto-capture-blocker] prevented mailto click on', a); } catch (e) { }
            } catch (e) { /* 무시 */ }
          };
          document.addEventListener('click', _handler, true);
          if (typeof timeoutMs === 'number' && timeoutMs > 0) {
            setTimeout(() => { try { window._removeMailtoCaptureBlocker(); } catch (e) { } }, timeoutMs);
          }
          console.debug('[mailto-capture-blocker] installed (timeoutMs=' + timeoutMs + ')');
        } catch (e) { /* 무시 */ }
      };
      window._removeMailtoCaptureBlocker = function () {
        try {
          if (!_handler) return;
          try { document.removeEventListener('click', _handler, true); } catch (e) { }
          _handler = null;
          console.debug('[mailto-capture-blocker] removed');
        } catch (e) { /* 무시 */ }
      };
    } catch (e) { /* 무시 */ }
  })();

  // 제거됨: pointerup/mouseup/auxclick 방어 핸들러; DOM-detach가 mailto 안전성을 처리함

  // 제거됨: pointerdown 억제 — aside가 열릴 때 mailto 앵커의 DOM-detach에 의존

  // 제거됨: aside 텍스트에 대한 캡처 단계 클릭 삼키기 — DOM-detach가 견고한 mailto 보호 제공

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

  // 헬퍼: 일러스트 갤러리 이미지에서 선택 마커 제거
  function clearIllustSelection() {
    try {
      const asideEl = document.querySelector('aside');
      // aside 리스트 항목에서 'on' 마커를 제거하여 활성 항목이 나타나지 않도록 함
      try {
        const lis = document.querySelectorAll('aside ul > li');
        lis.forEach(li => li.classList.remove('on'));
      } catch (e) { }

      if (!asideEl) return;
      // 문서의 모든 갤러리 이미지에서 선택 마커와 포커스 제거
      const imgs = Array.from(document.querySelectorAll('.illust-track img'));
      imgs.forEach(img => {
        try {
          // 클래스/속성
          img.classList.remove('selected');
          img.removeAttribute('aria-selected');
          img.removeAttribute('data-selected');
          // 인라인 포커스 비주얼 제거
          try { img.style.removeProperty('outline'); img.style.removeProperty('boxShadow'); img.style.removeProperty('transform'); img.style.removeProperty('opacity'); img.style.removeProperty('filter'); } catch (e) { }
          // 향후 설정이 깨끗하게 복제본을 재생성할 수 있도록 복제 마커 제거
          try { delete img.dataset.cloned; } catch (e) { }
          // 자연스러운 표시 스타일을 강제로 복원
          try { img.style.display = ''; img.style.visibility = ''; img.style.zIndex = ''; } catch (e) { }
          try { if (typeof img.blur === 'function') img.blur(); } catch (e) { }
        } catch (e) { /* 개별 이미지 에러 무시 */ }
      });

      // 트랙 복제 재설정 또는 원본 스냅샷이 있으면 트랙을 완전히 재구축
      try {
        const illustLi = document.querySelector('aside ul > li.illustpop');
        if (illustLi && illustLi.dataset && illustLi.dataset._orig) {
          // 첨부된 이벤트 리스너/스타일을 제거하기 위해 li 요소 교체
          const parent = illustLi.parentElement;
          const newLi = document.createElement('li');
          newLi.className = illustLi.className.replace(/\bon\b/, '').trim();
          newLi.innerHTML = illustLi.dataset._orig;
          try { delete newLi.dataset._orig; } catch (e) { }
          try { parent.replaceChild(newLi, illustLi); } catch (e) { /* 폴백 */ illustLi.innerHTML = illustLi.dataset._orig; }
        } else {
          const track = document.querySelector('.illust-track');
          if (track && track.dataset && track.dataset.originalHtml) {
            // 첨부된 핸들러를 지우기 위해 innerHTML을 변경하는 대신 트랙 요소 교체
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

      // 문서의 모든 곳에서 잔여 .selected 클래스 제거
      try { document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); } catch (e) { }
      // 어떤 이미지가 포커스를 가지고 있으면 blur 처리
      try { if (document.activeElement && document.activeElement.tagName === 'IMG') { document.activeElement.blur(); } } catch (e) { }

      // 최종 안전 장치: 늦게 적용된 인라인 스타일을 지우기 위한 지연된 2차 패스
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
    } catch (e) { /* 무시 */ }
  }

  if (hasHorizontal) {
    // 변환/여백을 고려하여 offsetWidth가 놓치는 부분을 바운딩 렉트 너비로 사용
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
    // 참고: lerp를 약간 낮게 조정하여 프로그래매틱 점프를 더 명확하게; 필요시 조정 가능
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

    // 모든 프로그래매틱 Lenis 스크롤에 적용되는 전역 스크롤 오프셋(픽셀)
    // 기본값은 24px로 작은 레이아웃/헤더 오프셋을 보상합니다.
    // 테스트를 위해 런타임에 재정의할 수 있습니다:
    // sessionStorage.setItem('scrollOffset', '16')
    const DEFAULT_SCROLL_OFFSET = 24;
    const SCROLL_OFFSET = (function () {
      try {
        const s = sessionStorage.getItem('scrollOffset');
        return s ? parseInt(s, 10) || DEFAULT_SCROLL_OFFSET : DEFAULT_SCROLL_OFFSET;
      } catch (e) { return DEFAULT_SCROLL_OFFSET; }
    })();

    // 전역 오프셋을 적용하고 바운드에 클램프하는 lenis.scrollTo의 래퍼
    function adjustedScrollTo(x, options) {
      if (!lenis) return;
      // 레이아웃이 변경될 수 있으므로 각 호출시 maxScroll 재계산
      totalWidth = 0;
      panels.forEach(panel => { totalWidth += panel.offsetWidth; });
      const maxScroll = Math.max(0, totalWidth - window.innerWidth);
      let dest = Math.round(x - (SCROLL_OFFSET || 0));
      if (dest < 0) dest = 0;
      if (dest > maxScroll) dest = maxScroll;
      try { console.debug('[scroll-adjust] orig:', x, 'offset:', SCROLL_OFFSET, 'adj:', dest, 'maxScroll:', maxScroll); } catch (e) { }
      // 스크롤 시점의 패널/트랙에 대한 진단 덤프
      try { dumpPanelMetrics('before-adjustedScrollTo', options && options._hashId); } catch (e) { }

      // 초기 스크롤 수행
      try {
        if (options && typeof lenis.scrollTo === 'function') {
          lenis.scrollTo(dest, options);
        } else {
          lenis.scrollTo(dest);
        }
      } catch (e) {
        try { lenis.scrollTo(dest); } catch (ee) { console.error('[scroll-adjust] lenis.scrollTo failed', ee); }
      }

      // 트랙의 현재 변환을 확인하고 허용 오차보다 크면 재시도
      const tolerance = 6; // 픽셀
      let attempts = 0;
      const maxAttempts = 8;

      function readTrackX() {
        try {
          const cs = window.getComputedStyle(track);
          const tf = cs && cs.transform ? cs.transform : 'none';
          if (!tf || tf === 'none') return 0;
          // 먼저 DOMMatrix 시도
          if (typeof DOMMatrix === 'function') {
            try {
              const m = new DOMMatrix(tf);
              if (Number.isFinite(m.m41)) return Math.abs(m.m41);
            } catch (e) { /* 무시 */ }
          }
          // matrix(a,b,c,d,tx,ty)에 대한 정규식 폴백
          const m = tf.match(/matrix\([^,]+,[^,]+,[^,]+,[^,]+,([-0-9.]+),/);
          if (m && m[1]) return Math.abs(parseFloat(m[1]));
        } catch (e) { /* 무시 */ }
        return 0;
      }

      function verifyLoop() {
        attempts += 1;
        const currentX = readTrackX();
        const diff = Math.abs(currentX - dest);
        console.debug('[scroll-verify] attempt', attempts, 'currentX', currentX, 'dest', dest, 'diff', diff);
        if (diff <= tolerance) {
          try {
            // 호출자가 원하는 해시 id를 전달한 경우 네이티브 점프 없이 URL 업데이트
            if (options && options._hashId) {
              history.replaceState(null, '', `${location.pathname}#${options._hashId}`);
            }
          } catch (e) { }
          return;
        }
        if (attempts >= maxAttempts) {
          console.warn('[scroll-verify] max attempts reached, final diff:', diff);
          try {
            // 최후 수단: 멀티 패널 불일치를 피하기 위해 가장 가까운 패널 시작으로 스냅
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
            try { lenis.scrollTo(snapLeft); } catch (e) { try { lenis.scrollTo(snapLeft); } catch (ee) { /* 무시 */ } }
            // 호출자가 id를 제공한 경우 URL 해시 업데이트
            if (options && options._hashId) {
              try { history.replaceState(null, '', `${location.pathname}#${options._hashId}`); } catch (e) { }
            }
          } catch (e) { console.error('[scroll-verify] snap fallback error', e); }
          return;
        }
        // 수정 스크롤을 적용하고 짧은 지연 후 재시도
        try {
          lenis.scrollTo(dest);
        } catch (e) { try { lenis.scrollTo(dest); } catch (ee) { /* 무시 */ } }
        setTimeout(verifyLoop, 90 + attempts * 30);
      }

      // lenis가 애니메이션할 수 있도록 짧은 지연 후 검증 루프 시작
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
    } catch (e) { /* 무시 */ }
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

  // 오디오 상태를 안전하게 토글하는 캡슐화된 액션
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
  // ===== 안쓰는거시작 =====
  // enforceDirBtnNewTab 비활성화: .dir_btn 앵커에 대한 HTML 우선 동작 보존
  // 이전에 이 IIFE는 `.dir_btn a`를 새 탭에서 열도록 target/rel을 추가하여 강제했음
  // 그 동작은 오늘 변경되었고 사용자가 이전 동작을 다시 요청했음
  // 코드를 제거하지 않고 안전하게 되돌리기 위해 여기에 no-op IIFE를 유지하여
  // 필요한 경우 향후 쉽게 다시 활성화할 수 있도록 함
  (function enforceDirBtnNewTab() {
    // no-op: .dir_btn 앵커 속성을 변경하지 않으므로 앵커가 HTML href/target을 따름
    return;
  })();
  // ===== 안쓰는것끝 =====

  // 버튼이 존재하면 직접 핸들러 연결, 그렇지 않으면 document에 위임
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => { e.preventDefault(); toggleAudioAction(); });
  } else {
    // 위임된 폴백: #audio-toggle과 일치하는 요소에 대한 클릭 처리
    document.addEventListener('click', function (e) {
      const t = e.target.closest && e.target.closest('#audio-toggle');
      if (t) { e.preventDefault(); toggleAudioAction(); }
    });
  }

  // 여기서는 .direct_output만 처리하도록 함; '.dir_btn a'를 가로채지 마세요
  // HTML에 정의된 앵커가 원래 href/target을 사용하여 탐색하도록 함
  // 참고: .dir_btn 내부의 링크들은 이미 HTML에 target="_blank"가 설정되어 있으므로
  // JavaScript가 개입하지 않고 브라우저가 자연스럽게 처리하도록 함
  // 이전에 있던 .direct_output 핸들러는 제거됨 - HTML의 기본 동작을 존중

  // 오디오 상태가 외부에서 변경되면 UI를 동기화
  if (audio) {
    audio.addEventListener('play', () => { isPlaying = true; updateIcon(); });
    audio.addEventListener('pause', () => { isPlaying = false; updateIcon(); });
  }

  tryAutoPlay();
  updateIcon();





  /* ==================================================
      6. 클릭 요소 (aside / home 복귀)
  ================================================== */
  // HTML 클래스(하이픈)를 사용하여 enter-about-me 클릭 연결하여 마크업과 일치
  document.querySelector(".about-me .enter_about-me")
    ?.addEventListener("click", () => { });

  const clickables = document.querySelectorAll(".click");

  // side_menu의 해시 링크를 가로스크롤(=lenis scroll)로 변환
  try {
    document.querySelectorAll('.side_menu a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        try {
          const hash = a.getAttribute('href');
          if (!hash || hash === '#') return;
          const id = hash.slice(1);
          const el = document.getElementById(id);
          if (!el) return;
          e.preventDefault();
          const target = (typeof computeTargetScrollForElement === 'function') ? computeTargetScrollForElement(el) : null;
          if (typeof adjustedScrollTo === 'function' && target != null) {
            adjustedScrollTo(target, { duration: 1.0, _hashId: id });
          } else if (typeof lenis !== 'undefined' && lenis && typeof lenis.scrollTo === 'function') {
            const panelOffset = (typeof getPanelOffsetForElement === 'function') ? getPanelOffsetForElement(el) : 0;
            try { lenis.scrollTo(panelOffset); } catch (e) { try { lenis.scrollTo(panelOffset); } catch (ee) { /* 무시 */ } }
          }

          // 메뉴 닫기
          const sideMenu = document.querySelector('.side_menu');
          if (sideMenu && sideMenu.classList.contains('on')) {
            sideMenu.classList.remove('on');
            sideMenu.classList.add('close');
            sideMenu.setAttribute('aria-hidden', 'true');
            sideMenu.style.right = '-420px';
            setTimeout(() => sideMenu.style.display = 'none', 600);
          }
        } catch (e) { /* 클릭별 에러 무시 */ }
      });
    });
  } catch (e) { }
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
    'bn': 7,
    'illust': 8 // added mapping for illustration clickable (matches aside order)
  };

  // Project metadata keyed by data-id for robust matching (used to populate dir_btn links)
  const projectsMeta = {
    'studio-dragon': { id: 'studio-dragon', plan: 'https://buly.kr/AwgZjrN', web: 'https://birdSR.github.io/studio_dragon_saerokkim/' },
    'breadlee': { id: 'breadlee', plan: 'https://buly.kr/58TZNRd', web: 'https://buly.kr/7FSf9FY' },
    'museum-letters': { id: 'museum-letters', plan: 'https://buly.kr/Aar3mng', web: '' },
    'samsung-promo': { id: 'samsung-promo', plan: 'https://buly.kr/CM0eHiA', web: '' },
    'vfun-login': { id: 'vfun-login', plan: 'https://buly.kr/Aar3mng', web: '' },
    'lg-plal': { id: 'lg-plal', plan: 'https://buly.kr/58TZNRd', web: '' },
    'content-banner': { id: 'content-banner', plan: 'https://buly.kr/CM0eHiA', web: '' },
    'illustration': { id: 'illustration', plan: '', web: '' }
  };

  function openAsideById(id, targetLi) {
    try {
      const asideEl = document.querySelector('aside');
      if (!asideEl) return;
      const meta = projectsMeta[id] || null;
      // clear existing selection
      asideEl.querySelectorAll('ul li.on').forEach(li => li.classList.remove('on'));
      if (targetLi) targetLi.classList.add('on');
      // update dir_btn anchors if present inside targetLi
      // Disable JS-side href mutation here. Let HTML-defined href and browser
      // default behavior control anchor targets. This avoids JS overwriting
      // hrefs and interfering with hover/focus styles.
      // (If future behavior is required, reintroduce minimal, well-scoped updates.)
      // show aside
      asideEl.style.display = 'block';
      try { document.body.classList.add('aside-open'); } catch (e) { }
      try { asideEl.setAttribute('aria-hidden', 'false'); } catch (e) { }
      // Ensure aside interactive area receives pointer events and focus management.
      // Do not set inline styles here; preserve CSS hover/focus rules authored in stylesheet.

      // Re-run a short deferred restore to handle cases where other observers temporarily
      // modified hrefs during the aside display transition. This keeps HTML-authoritative
      // hrefs present when the aside becomes visible.
      // No deferred JS restore.

      console.log('[openAsideById] opened aside for id=', id);
    } catch (e) { console.error('[openAsideById] error', e); }
  }

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
    el.addEventListener("click", (ev) => {
      console.log('[click] element clicked:', el.className);
      // If user clicked a real link inside the clickable area, let the link act normally
      const clickedLink = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
      if (clickedLink) {
        console.log('[click] clicked a real link inside clickable — letting link handle navigation', clickedLink.getAttribute('href'));
        return; // allow normal link behavior (mailto or external)
      }
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
      try { if (typeof window._disableMailtoNow === 'function') { console.debug('[aside] calling _disableMailtoNow() before showing aside (moved)'); window._disableMailtoNow(); } } catch (e) { }
      aside.style.display = "block";
      try { window._suppressMailUntil = Date.now() + 1200; console.debug('[aside] set _suppressMailUntil to', window._suppressMailUntil); } catch (e) { }
      try { document.body.classList.add('aside-open'); console.debug('[aside] added body.aside-open'); } catch (e) { }
      // remove existing selection
      aside.querySelectorAll('ul li.on').forEach(li => li.classList.remove('on'));

      // ensure aside is interactive when opened
      try {
        aside.inert = false;
      } catch (e) { /* inert may not be supported */ }
      aside.setAttribute('aria-hidden', 'false');

      // Determine target by data-id on the clicked element's corresponding aside li
      // Prefer explicit mapping via clickableToAsideIndex (compat), otherwise use data-id on aside li.
      let targetLi = null;
      // first, try class-based mapping to an aside index
      for (const cls in clickableToAsideIndex) {
        if (el.classList.contains(cls)) {
          const asideLis = Array.from(aside.querySelectorAll('ul > li'));
          const idx = clickableToAsideIndex[cls] - 1;
          if (idx >= 0 && idx < asideLis.length) {
            targetLi = asideLis[idx];
            console.log('[click] class-mapped target li for', cls, '=> index', idx);
          }
          break;
        }
      }

      // If not found, try to find a data-id on a closest container or match by clickable's class
      if (!targetLi) {
        // Find a meaningful data-id from the clicked element (closest element with data-id or its ancestors)
        let container = el;
        let foundId = null;
        while (container && container !== document.body) {
          if (container.dataset && container.dataset.id) { foundId = container.dataset.id; break; }
          container = container.parentElement;
        }
        // If the clickable element itself had a class that corresponds to a aside li data-id, try to map by naming
        if (!foundId) {
          // no-op: fallthrough to projectClickables positional fallback below
        }
        if (foundId) {
          targetLi = aside.querySelector(`ul > li[data-id="${foundId}"]`);
          console.log('[click] found targetLi by data-id from clickable container:', foundId, '=>', !!targetLi);
        }
      }

      // positional fallback: try to match by index among projectClickables (best-effort)
      if (!targetLi) {
        const projIndex = Array.prototype.indexOf.call(projectClickables, el);
        if (projIndex !== -1) {
          const asideLis = Array.from(aside.querySelectorAll('ul > li'));
          targetLi = asideLis[projIndex];
          console.log('[click] using project-specific fallback index =>', projIndex);
        }
      }

      // Diagnostic: list aside li count and a short snippet to help identify order
      const asideLis = Array.from(aside.querySelectorAll('ul > li'));
      console.log('[click] aside lis count:', asideLis.length);
      asideLis.forEach((li, i) => {
        const title = li.querySelector('.tit')?.innerText?.trim() || li.querySelector('.app-span')?.innerText?.trim() || li.textContent.trim().slice(0, 40);
        console.log('[click] aside li', i + 1, 'snippet:', title ? title.replace(/\s+/g, ' ') : '(empty)');
      });

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
          try { if (typeof window._disableMailtoNow === 'function') { console.debug('[aside] calling _disableMailtoNow() before showing illust overlay (moved)'); window._disableMailtoNow(); } } catch (e) { }
          aside.style.display = 'block';
          try { window._suppressMailUntil = Date.now() + 1200; console.debug('[aside] set _suppressMailUntil to', window._suppressMailUntil, '(illust)'); } catch (e) { }
          try { if (typeof window.suppressMailto === 'function') window.suppressMailto(900); } catch (e) { }
          try { document.body.classList.add('aside-open'); console.debug('[aside] added body.aside-open (illust)'); } catch (e) { }
          try { if (typeof window.suppressMailto === 'function') window.suppressMailto(900); } catch (e) { }
          // mark and populate via helper
          const id = targetLi.dataset && targetLi.dataset.id ? targetLi.dataset.id : null;
          openAsideById(id || null, targetLi);
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
          try { if (typeof window.suppressMailto === 'function') window.suppressMailto(900); } catch (e) { }
          const id2 = targetLi.dataset && targetLi.dataset.id ? targetLi.dataset.id : null;
          openAsideById(id2 || null, targetLi);
          console.log('[click] targetLi found and opened via data-id', id2);
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

  // Click diagnostics for header, side menu, and dir_btn anchors.
  // Install capture-phase listener that logs concise info when clicks involve these areas.
  try {
    document.addEventListener('click', function (ev) {
      try {
        const t = ev.target;
        const interested = t && (t.closest && (t.closest('.site-header') || t.closest('.hamburger') || t.closest('.side_menu') || t.closest('.dir_btn')));
        if (!interested) return;
        const a = t.closest && t.closest('a') ? t.closest('a') : null;
        const info = {
          tag: t.tagName,
          class: t.className,
          href: a ? (a.getAttribute && a.getAttribute('href')) : null,
          defaultPrevented: ev.defaultPrevented,
          isTrusted: ev.isTrusted,
        };
        try { info.computedPointer = window.getComputedStyle(t).pointerEvents; } catch (e) { info.computedPointer = '(err)'; }
        console.log('[click-diag] capture', info);
        try {
          // deferred snapshot after propagation to see if something changed
          setTimeout(() => {
            try {
              console.log('[click-diag] deferred activeElement=', document.activeElement && (document.activeElement.tagName + (document.activeElement.className ? ' .' + document.activeElement.className : '')),
                'defaultPrevented_after=', ev.defaultPrevented);
            } catch (e) { }
          }, 0);
        } catch (e) { }
      } catch (e) { /* ignore per-event errors */ }
    }, true);
  } catch (e) { }

  // aside 내부 링크가 정상적으로 작동하도록 보장
  // .dir_btn 내부의 모든 <a> 태그는 각자의 href로 새 탭에서 열려야 함
  try {
    const asideEl = document.querySelector('aside');
    if (asideEl) {
      asideEl.addEventListener('click', function (ev) {
        try {
          // aside 내부의 실제 링크를 클릭한 경우
          const clickedLink = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
          if (!clickedLink) return;

          // .dir_btn 내부의 링크인지 확인
          const isDirBtnLink = clickedLink.closest('.dir_btn');
          if (!isDirBtnLink) return;

          // ⚠️ CRITICAL: 기본 동작을 즉시 방지 (브라우저가 링크를 열기 전에 차단)
          ev.preventDefault();
          ev.stopPropagation();
          ev.stopImmediatePropagation(); // 다른 핸들러도 차단

          const href = clickedLink.getAttribute('href');
          const target = clickedLink.getAttribute('target');

          console.log('[aside-link] clicked link:', {
            href: href,
            target: target,
            class: clickedLink.className,
            text: clickedLink.textContent.trim()
          });

          // 추가 디버깅: href 값의 타입과 실제 값 확인
          console.log('[aside-link] DEBUG - href type:', typeof href, 'value:', JSON.stringify(href), 'length:', href ? href.length : 'null');

          // href가 유효하지 않으면 무시
          if (!href || href === '#') {
            console.log('[aside-link] invalid href, ignoring');
            return;
          }

          try {
            // target="_blank"가 설정되어 있거나 외부 링크인 경우 새 탭에서 열기
            if (target === '_blank' || href.startsWith('http://') || href.startsWith('https://')) {
              const newWindow = window.open(href, '_blank', 'noopener,noreferrer');
              if (newWindow) {
                newWindow.opener = null; // 보안을 위해
                console.log('[aside-link] opened in new tab:', href);
              } else {
                console.warn('[aside-link] popup blocked, trying location.href');
                window.location.href = href;
              }
            } else {
              // 내부 링크는 현재 탭에서 열기
              window.location.href = href;
              console.log('[aside-link] navigating to:', href);
            }
          } catch (err) {
            console.error('[aside-link] error opening link:', err);
            // 폴백: 기본 동작 허용
            window.location.href = href;
          }
        } catch (err) {
          console.error('[aside-link] handler error:', err);
        }
      }, true); // 캡처 단계에서 처리 - 다른 핸들러보다 먼저 실행

      console.debug('[aside-link] link handler installed (capture phase)');
    }
  } catch (e) {
    console.error('[aside-link] failed to install handler:', e);
  }

  document.querySelector("aside .close-btn")
    ?.addEventListener("click", () => {
      const asideEl = document.querySelector("aside");
      if (!asideEl) return;
      // remove overlay-mode if present and clear any visual selection on images
      asideEl.classList.remove('overlay-mode');
      try { clearIllustSelection(); } catch (e) { /* ignore */ }
      try { setTimeout(() => { try { clearIllustSelection(); } catch (e) { } }, 160); } catch (e) { }
      asideEl.style.display = "none";
      try { document.body.classList.remove('aside-open'); console.debug('[aside] removed body.aside-open (close-btn)'); } catch (e) { }
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
        try { document.body.classList.remove('aside-open'); console.debug('[aside] removed body.aside-open (Escape)'); } catch (e) { }
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
        try { document.body.classList.remove('aside-open'); console.debug('[aside] removed body.aside-open (click-outside)'); } catch (e) { }
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

  // Diagnostic logging for direct links to aid debugging (click details)
  try {
    document.querySelectorAll('.direct_plan, .direct_output').forEach(el => {
      el.addEventListener('click', function (ev) {
        try {
          const a = ev.currentTarget || this;
          const href = a.getAttribute && a.getAttribute('href');
          const target = a.getAttribute && a.getAttribute('target');
          console.log('[direct-link] click', { class: a.className, href, target, button: ev.button, clientX: ev.clientX, clientY: ev.clientY, defaultPrevented: ev.defaultPrevented });
          // Print event path for deeper inspection in consoles that support it
          try { console.log('[direct-link] event path:', ev.composedPath ? ev.composedPath() : (ev.path || '(no path)')); } catch (e) { }
          // Also log a deferred snapshot after propagation to detect late preventDefault or focus changes
          try {
            setTimeout(() => {
              try {
                console.log('[direct-link] deferred state', { defaultPrevented_after: ev.defaultPrevented, activeElement: document.activeElement && (document.activeElement.tagName + (document.activeElement.className ? ' .' + document.activeElement.className : '')) });
              } catch (e) { console.log('[direct-link] deferred log error', e); }
            }, 0);
          } catch (e) { }
        } catch (e) { console.error('[direct-link] log handler error', e); }
      }, true); // use capture to log early
    });
  } catch (e) { /* ignore if selectors not present */ }

  // Capture-phase enforcement: DISABLED to avoid forcing navigation and interfering with CSS hover.
  try {
    // intentionally disabled: document.addEventListener('click', ...) -> no-op
    // If needed, re-enable a conservative logger-only handler here.
    return;
  } catch (e) { }

  // Capture-phase guard: prevent clicks on non-link aside text from triggering mailto
  try {
    document.addEventListener('click', function (ev) {
      try {
        // Only care when aside is visible
        const aside = document.querySelector('aside');
        if (!aside || aside.style.display === 'none' || aside.getAttribute('aria-hidden') === 'true') return;

        // If the original click target is inside one of the non-link areas, block mailto activation.
        const nonLinkSelectors = ['.txt_t', '.app-span', '.app-span2', '.pop_bottom', '.pop_bottom *'];
        let node = ev.target;
        let insideNonLink = false;
        for (; node && node !== document; node = node.parentNode) {
          if (node.matches && nonLinkSelectors.some(s => node.matches(s))) { insideNonLink = true; break; }
          if (node === aside) break; // stop at aside boundary
        }
        if (!insideNonLink) return;

        // If the click event's composedPath contains a mailto anchor, and that anchor is NOT
        // one of the explicitly allowed anchors, prevent activation.
        const path = ev.composedPath ? ev.composedPath() : (ev.path || []);
        for (const el of path) {
          if (!el || !el.getAttribute) continue;
          const href = el.getAttribute && el.getAttribute('href');
          if (href && href.startsWith && href.startsWith('mailto:')) {
            // allow side menu contact mailto and explicitly allowed anchors
            if (el.closest && el.closest('.side_menu')) {
              return; // allow
            }
            if (el.classList && (el.classList.contains('dir_btn') || el.classList.contains('direct_plan') || el.classList.contains('direct_output') || el.closest && el.closest('.dir_btn'))) {
              return; // allow
            }
            // Otherwise, block the native activation coming from clicks inside aside non-link areas
            console.debug('[mailto-guard] blocking mailto activation from aside non-link click', { href });
            ev.stopPropagation();
            ev.preventDefault();
            return;
          }
        }
      } catch (err) { /* non-fatal guard */ }
    }, true);
  } catch (e) { /* ignore if document not available */ }

  // Safer global capture: block mailto activation when aside is open unless
  // the mailto is inside allowed regions (.side_menu, .dir_btn, .send_e-mail).
  try {
    if (!window._mailtoSafeCaptureInstalled) {
      document.addEventListener('click', function (ev) {
        try {
          const asideEl = document.querySelector('aside');
          if (!asideEl) return;
          const styleDisplay = asideEl.style && asideEl.style.display ? asideEl.style.display : getComputedStyle(asideEl).display;
          const asideVisible = (styleDisplay !== 'none') && asideEl.getAttribute('aria-hidden') !== 'true';
          if (!asideVisible) return;

          const mailA = ev.target && ev.target.closest ? ev.target.closest('a[href^="mailto:"]') : null;
          if (!mailA) return; // not a mailto click
          // allow side menu contact and dir_btn anchors
          if (mailA.closest && (mailA.closest('.side_menu') || mailA.closest('.dir_btn') || mailA.closest('.send-e-mail'))) return;
          // otherwise block
          ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation && ev.stopImmediatePropagation();
          console.debug('[mailto-safe-capture] blocked mailto while aside open:', mailA.getAttribute('href'));
        } catch (e) { /* ignore per-event errors */ }
      }, true);
      window._mailtoSafeCaptureInstalled = true;
      console.debug('[mailto-safe-capture] installed');
    }
  } catch (e) { }

  // Removed global Event.prototype.preventDefault override to avoid side-effects.
  // Use a capture-phase mailto blocker below to prevent unintended mailto activations
  // while aside is open and only when clicks originate from non-link areas.

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

  // Duplicate home-toggle handler removed. Rely on existing openSubmenu/closeSubmenu helpers below.

});

// removed duplicate debug declarations that caused a SyntaxError

