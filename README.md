# 🪐 Gravity - 별자리가 이어주는 인연

Spring Boot + Thymeleaf + MySQL 기반 궁합 서비스

## 실행 전 준비

### 1. MySQL DB 생성
```sql
CREATE DATABASE gravity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. `application.yml` 수정
```yaml
spring.datasource.password: 실제_MySQL_비밀번호

claude.api.key: Anthropic_Console에서_발급받은_키

toss.payments.client-key: 토스페이먼츠_테스트_클라이언트키
toss.payments.secret-key: 토스페이먼츠_테스트_시크릿키
```

### 3. API 키 발급처
- Claude API: https://console.anthropic.com
- 토스페이먼츠: https://developers.tosspayments.com (테스트 키 무료)

## 실행
```bash
./mvnw spring-boot:run
# 또는
mvn spring-boot:run
```
브라우저에서 http://localhost:8080 접속

## 주요 기능
| 기능 | 경로 |
|---|---|
| 회원가입 | /auth/register |
| 로그인 | /auth/login |
| 우주 대시보드 | /dashboard |
| 파트너 검색 | /search |
| 결제 (990원) | /payment/checkout/{partnerId} |

## 궁합 점수 계산
- **띠 궁합** (40%): 삼합/육합 등 12지 궁합 매트릭스
- **수비학** (35%): 생년월일 생명수 기반 궁합
- **오행** (25%): 출생년도 오행 상생/상극 + 나이차

Claude AI가 점수를 바탕으로 맞춤 분석 텍스트를 생성하며, DB에 저장되어 재호출 없이 불러옵니다.

## 기술 스택
- Java 17, Spring Boot 3.2
- Spring Security (BCrypt + Form Login)
- Spring Data JPA + MySQL
- Thymeleaf + HTML5 Canvas
- TossPayments SDK
- Claude API (WebClient)
