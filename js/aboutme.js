document.addEventListener("DOMContentLoaded", () => {
    // 대상 요소와 계산
    const el = document.getElementById("target");
    if (!el) return;

    // el의 아래(footer 시작) 지점을 뷰포트 상단으로 오도록 스크롤 목표 계산
    // 목표 = el.offsetTop + el.offsetHeight - window.innerHeight
    const targetBottom = el.offsetTop + el.offsetHeight - window.innerHeight;

    // 음수 방지 (작은 컨텐츠일 때)
    const scrollTo = Math.max(0, Math.round(targetBottom));

    // 부드러운 스크롤 호환성: 브라우저가 native smooth를 지원하지 않을 경우 폴리필
    try {
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
    } catch (e) {
        // fallback: 간단한 requestAnimationFrame 애니메이션
        const start = window.scrollY || window.pageYOffset;
        const distance = scrollTo - start;
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
});