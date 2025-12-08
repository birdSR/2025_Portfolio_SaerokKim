document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.horizontal-scroll');

  container.addEventListener('wheel', (event) => {
    // 세로 스크롤을 막고
    event.preventDefault();

    // deltaY 값을 가로 스크롤로 사용
    container.scrollLeft += event.deltaY;
  }, { passive: false });
});