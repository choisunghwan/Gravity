# Gravity 프로젝트 — Claude 참조 문서

## 개요
Spring Boot 기반 궁합 분석 SNS. 사용자를 행성으로 표현하고, 궁합 점수(0-100점)에 따라 태양계 궤도에 배치하는 서비스.

- **배포**: Railway (GitHub main 브랜치 push 시 자동 배포)
- **스택**: Spring Boot 3.2.5 / Java 17 / Thymeleaf / MySQL / Spring Security / WebFlux(Claude API 호출용)
- **빌드**: Maven (`mvn spring-boot:run`)

---

## 핵심 구조

```
src/main/
├── java/com/gravity/
│   ├── config/          SecurityConfig, WebConfig, ActiveUserInterceptor, NotificationAdvice
│   ├── controller/      11개 컨트롤러 (아래 참조)
│   ├── entity/          8개 JPA 엔티티 (아래 참조)
│   ├── service/         8개 서비스 (아래 참조)
│   ├── dto/             6개 DTO
│   └── repository/      8개 Spring Data JPA 레포지토리
└── resources/
    ├── application.yml
    ├── templates/       Thymeleaf HTML (dashboard, feed, search, mypage 등)
    └── static/
        ├── js/dashboard.js   ← 메인 캔버스 로직 (행성 애니메이션, 채팅)
        ├── js/payment.js
        └── css/             14개 CSS 파일
```

---

## 엔티티 관계

```
User
├── CompatibilityResult (user_id ↔ partner_id, 양방향 쿼리)
│   └── 점수: zodiacScore(40%) + numerologyScore(35%) + elementScore(25%)
│       + analysisText (Claude AI 생성, DB에 캐시)
├── Post (1:M) → PostLike (M:M)
├── ChatMessage (sender_id / receiver_id)
├── Notification (recipient_id)
├── Wish (별똥별 소원, 20초 윈도우)
└── SpecialEffect (BIGBANG/SUPERNOVA, 10초 윈도우)

User 주요 필드: username, password(BCrypt), name, birthDate, gender,
               planetEmoji, planetColor, statusMessage, profileImage,
               role(ROLE_USER/ROLE_ADMIN), lastActiveAt
```

---

## 컨트롤러 & 주요 엔드포인트

| 경로 | 역할 |
|------|------|
| `GET /dashboard` | 메인 캔버스 뷰 (compatibilitiesJson → JS로 전달) |
| `GET /compatibility/{id}` | 궁합 상세 JSON |
| `GET /payment/checkout/{partnerId}` | 결제 (2회 무료, 이후 990원) |
| `POST /payment/confirm` | TossPayments 결제 확인 |
| `GET /feed` | 피드 (본인 + 연결된 파트너) |
| `POST /feed/like/{id}` | 좋아요 토글 |
| `GET /api/chat/{partnerId}` | 대화 이력 |
| `POST /api/chat/{partnerId}` | 메시지 전송 |
| `GET /api/chat/new?since=ISO` | 새 메시지 폴링 |
| `GET /api/chat/online` | 온라인 파트너 (lastActiveAt 3분 이내) |
| `GET /api/wish/active` | 활성 소원 |
| `GET /api/effect/poll` | 특수효과 폴링 |

---

## 서비스 핵심 로직

**CompatibilityService**
- 궁합 점수 = 띠(zodiac 40%) + 수비학(numerology 35%) + 오행(element 25%)
- 행성 궤도: 점수별 수성(90↑)~해왕성(~19점) 할당

**ClaudeService**
- `claude-sonnet-4-6` 호출로 한국어 분석 텍스트 생성
- 실패 시 로컬 템플릿으로 폴백
- 환경변수: `CLAUDE_API_KEY`

**TossPaymentService**
- 환경변수: `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`
- 테스트 우회: `GET /payment/test/{partnerId}`

---

## dashboard.js 구조 (복잡한 파일)

- **HTML5 Canvas** 태양계 시각화 (행성 궤도 애니메이션)
- `compatibilities` 변수: Thymeleaf 인라인으로 HTML에서 주입
- `systemScale`: 줌 배율 (SCALE_MIN=0.25, SCALE_MAX=2.5)
- `resizeCanvas()` → `initPlanets()` → `render()` 순서로 초기화
- 폴링: 채팅 1.5초, 특수효과 3초, 소원 5초, 온라인상태 30초
- 이스터에그: 채팅창에 `/bigbang`, `/supernova` 입력

**주의**: `isMobile`은 파일 상단에 정의되어야 함 (`resizeCanvas()` 내부에서 호출하기 때문)

---

## 설정 (application.yml)

```yaml
datasource: jdbc:mysql://localhost:3306/gravity_db (Railway에서는 환경변수로 오버라이드)
jpa.ddl-auto: update   # 스키마 자동 생성/업데이트
upload.path: /tmp/gravity-uploads/  # 프로필 이미지 저장 경로
```

---

## 자주 발생하는 패턴 & 주의사항

- **CompatibilityResult 조회**: 항상 양방향 (`user=? OR partner=?`) — 단방향 쿼리 주의
- **피드 공개범위**: `isPublic=true` OR 연결된 파트너 — 프라이버시 로직 확인 필요
- **프로필 이미지**: MIME 타입 검증 + 기존 파일 삭제 로직 포함
- **NotificationAdvice**: 모든 컨트롤러에 `unreadNotifCount` 자동 주입
- **ActiveUserInterceptor**: 모든 요청마다 `lastActiveAt` 업데이트
- **Canvas 초기화 순서**: `isMobile()` → `resizeCanvas()` → `render()`, TDZ 주의
