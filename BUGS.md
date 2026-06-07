# Gravity — 버그 기록

---

## [2025-06] 대시보드 캔버스 초기 렌더링 안 됨

**증상**
- 대시보드 진입 시 캔버스가 완전히 검은 화면 (별, 궤도, 행성 없음)
- 중앙 HTML 행성(center-user div)만 보임
- 창 크기 조절하면 갑자기 정상 렌더링됨

**원인 1 — `isMobile` TDZ (Temporal Dead Zone)**

`const isMobile`이 파일 731번째 줄에 정의되어 있었는데,
`resizeCanvas()`(710번 줄에서 호출)가 내부에서 `isMobile()`을 참조함.

`const`는 선언 전에 접근하면 ReferenceError 발생 (TDZ).
스크립트 실행이 멈춰서 `render()`가 아예 호출되지 않음.
`resize` 이벤트는 에러 이전에 등록되었기 때문에 창 크기 조절 시에만 정상 동작.

```
Uncaught ReferenceError: Cannot access 'isMobile' before initialization
    at dashboard.js:710:1
```

**원인 2 — 브라우저 캐시**

TDZ를 고쳐서 배포해도 브라우저가 이전 `dashboard.js`를 캐싱해 계속 사용.
Spring Boot 정적 파일 기본 캐시 헤더 때문에 URL이 동일하면 서버 요청 없이 로컬 캐시 사용.

**수정**

1. `const isMobile = () => window.innerWidth <= 768;` → 파일 최상단(6번 줄)으로 이동
2. `resizeCanvas()`에서 `canvas.offsetWidth` 대신 `window.innerWidth` 직접 사용
   (offsetWidth는 CSS 레이아웃 타이밍에 따라 0을 반환할 수 있음)
3. `dashboard.js` 스크립트 태그에 `?v=5` 추가해 캐시 무효화

**교훈**
- `const`로 선언된 함수/변수는 반드시 사용 전에 정의해야 함 (호이스팅되지만 초기화 안 됨)
- 정적 파일 수정 후 브라우저 캐시 문제가 생기면 `?v=N` 버전 파라미터로 해결
- 캔버스 크기는 `canvas.offsetWidth` 대신 `window.innerWidth/innerHeight` 사용이 더 안정적

---
