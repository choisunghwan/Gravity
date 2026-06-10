package com.gravity.service;

import com.gravity.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClaudeService {

    @Value("${claude.api.key}")
    private String apiKey;

    @Value("${claude.api.url}")
    private String apiUrl;

    @Value("${claude.api.model}")
    private String model;

    public String generateAnalysis(User user, User partner, int totalScore,
                                   int zodiacScore, int numerologyScore, int elementScore) {

        // API 키 미설정 시 바로 fallback
        if (apiKey == null || apiKey.startsWith("your_")) {
            log.info("Claude API 키 미설정 - 자체 분석 사용");
            return generateLocalAnalysis(user, partner, totalScore, zodiacScore, numerologyScore, elementScore);
        }

        try {
            WebClient webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("x-api-key", apiKey)
                    .defaultHeader("anthropic-version", "2023-06-01")
                    .build();

            String prompt = buildPrompt(user, partner, totalScore, zodiacScore, numerologyScore, elementScore);

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "max_tokens", 800,
                    "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("content")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> contents = (List<Map<String, Object>>) response.get("content");
                if (!contents.isEmpty()) {
                    String text = (String) contents.get(0).get("text");
                    if (text != null && text.length() > 20) return text;
                }
            }
        } catch (Exception e) {
            log.warn("Claude API 호출 실패: {}", e.getMessage());
        }

        return generateLocalAnalysis(user, partner, totalScore, zodiacScore, numerologyScore, elementScore);
    }

    public String translateToEnglish(String text) {
        try {
            WebClient webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .defaultHeader("x-api-key", apiKey)
                    .defaultHeader("anthropic-version", "2023-06-01")
                    .build();

            Map<String, Object> requestBody = Map.of(
                    "model", model,
                    "max_tokens", 200,
                    "messages", List.of(Map.of("role", "user", "content",
                            "Translate to English. Return ONLY the translation, no explanation:\n" + text))
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> response = webClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("content")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> contents = (List<Map<String, Object>>) response.get("content");
                if (!contents.isEmpty()) return (String) contents.get(0).get("text");
            }
        } catch (Exception e) {
            log.warn("번역 실패: {}", e.getMessage());
        }
        return text;
    }

    private String buildPrompt(User user, User partner, int totalScore,
                                int zodiacScore, int numerologyScore, int elementScore) {
        return String.format("""
                당신은 두 사람의 데이터를 분석해 끌림 지수를 산출하는 전문가입니다.
                두 사람의 끌림 지수를 분석해주세요. 반드시 두 사람의 실제 데이터를 바탕으로 구체적으로 작성하세요.

                [%s님]
                - 생년월일: %s | 띠: %s | 생명수: %d | 성별: %s

                [%s님]
                - 생년월일: %s | 띠: %s | 생명수: %d | 성별: %s

                [분석 점수]
                - 종합: %d점 | 띠 점수: %d점 | 수비학: %d점 | 오행: %d점

                아래 형식으로 작성해주세요 (총 250자 내외, 친근한 말투):

                두 분의 띠(%s띠 × %s띠)와 생명수(%d × %d)를 바탕으로 실제 특징을 언급하며 분석하세요.
                점수가 높으면 구체적인 강점, 낮으면 보완할 점을 솔직하게 써주세요.
                마지막은 따뜻한 응원 메시지로 마무리하세요.
                """,
                user.getName(), user.getBirthDate(), user.getZodiac(), user.getLifePathNumber(),
                user.getGender().equals("MALE") ? "남성" : "여성",
                partner.getName(), partner.getBirthDate(), partner.getZodiac(), partner.getLifePathNumber(),
                partner.getGender().equals("MALE") ? "남성" : "여성",
                totalScore, zodiacScore, numerologyScore, elementScore,
                user.getZodiac(), partner.getZodiac(),
                user.getLifePathNumber(), partner.getLifePathNumber()
        );
    }

    // ── Claude API 없이 자체 생성하는 분석 ──────────────────────────
    private String generateLocalAnalysis(User user, User partner, int totalScore,
                                          int zodiacScore, int numerologyScore, int elementScore) {
        String myZodiac   = user.getZodiac();
        String herZodiac  = partner.getZodiac();
        int myNum         = user.getLifePathNumber();
        int herNum        = partner.getLifePathNumber();
        String myName     = user.getName();
        String herName    = partner.getName();

        // 띠별 성격 특성
        String myTrait   = getZodiacTrait(myZodiac);
        String herTrait  = getZodiacTrait(herZodiac);


        // 궁합 수준별 문구
        String opening, strength, caution, closing;

        if (totalScore >= 90) {
            opening  = String.format("%s님(%s띠)과 %s님(%s띠)은 그야말로 천생연분입니다! 띠 점수(%d점)가 삼합에 가까워 서로의 에너지가 완벽하게 맞물립니다.",
                    myName, myZodiac, herName, herZodiac, zodiacScore);
            strength = String.format("%s의 기질과 %s의 성향이 서로를 완벽하게 보완하며, 생명수 %d와 %d의 조화도 뛰어납니다.", myTrait, herTrait, myNum, herNum);
            caution  = "다만 너무 잘 맞다 보니 서로에게 기대는 의존도가 높아질 수 있어요. 각자의 독립적인 공간도 소중히 지켜주세요.";
            closing  = "두 분의 만남은 우주가 특별히 준비한 인연입니다. 오래오래 빛나는 관계로 이어가세요! ✨";
        } else if (totalScore >= 75) {
            opening  = String.format("%s님(%s띠)과 %s님(%s띠)의 끌림이 매우 강합니다! 오행 조화(%d점)가 뛰어나 함께할수록 서로 성장하는 관계예요.",
                    myName, myZodiac, herName, herZodiac, elementScore);
            strength = String.format("%s 기질을 가진 %s님은 %s 성향의 %s님과 잘 어우러집니다. 생명수 %d와 %d의 조합도 안정적인 신뢰를 만들어냅니다.",
                    myTrait, myName, herTrait, herName, myNum, herNum);
            caution  = "가끔 의사소통 방식의 차이로 오해가 생길 수 있으니, 서로의 표현 방식을 이해하려는 노력이 필요합니다.";
            closing  = "두 분이 함께라면 서로의 부족한 부분을 채우며 멋진 팀이 될 수 있어요. 응원합니다! 💫";
        } else if (totalScore >= 60) {
            opening  = String.format("%s님(%s띠)과 %s님(%s띠)은 노력하면 강한 끌림으로 발전할 수 있는 사이입니다. 수비학 점수(%d점)에서 흥미로운 조화가 보입니다.",
                    myName, myZodiac, herName, herZodiac, numerologyScore);
            strength = String.format("%s 기질의 %s님은 %s 성향의 %s님에게 새로운 시각을 열어줄 수 있어요. 서로 배울 점이 많은 관계입니다.",
                    myTrait, myName, herTrait, herName);
            caution  = String.format("생명수 %d와 %d의 조합은 때로 방향성 차이를 만들 수 있어요. 큰 결정을 할 때는 충분한 대화가 중요합니다.", myNum, herNum);
            closing  = "완벽한 끌림은 타고나는 게 아니라 만들어가는 것! 두 분의 노력이 빛날 거예요. 🌟";
        } else if (totalScore >= 45) {
            opening  = String.format("%s님(%s띠)과 %s님(%s띠)은 서로 다른 에너지를 가진 사이입니다. 차이점이 많지만, 그만큼 서로에게서 배울 것도 많아요.",
                    myName, myZodiac, herName, herZodiac);
            strength = String.format("%s 기질과 %s 성향은 언뜻 달라 보이지만, 서로의 약점을 보완할 수 있는 잠재력이 있습니다.", myTrait, herTrait);
            caution  = String.format("띠 점수(%d점)에서 에너지 충돌이 예상되니, 감정이 격해질 때는 한발 물러서는 여유가 필요해요.", zodiacScore);
            closing  = "다름을 인정하는 것이 첫걸음입니다. 서로를 이해하려는 마음만 있다면 충분해요! 🌙";
        } else {
            opening  = String.format("%s님(%s띠)과 %s님(%s띠)은 매우 다른 에너지를 가지고 있어요. 솔직히 쉽지 않은 조합이지만, 반대 에너지가 서로를 완성시킬 수도 있습니다.",
                    myName, myZodiac, herName, herZodiac);
            strength = String.format("%s 기질의 %s님이 %s 성향의 %s님의 부족한 면을 채워줄 수 있는 독특한 관계예요.",
                    myTrait, myName, herTrait, herName);
            caution  = "서로의 차이를 단점으로 보기보다 다양성으로 받아들이는 연습이 필요합니다. 인내심이 이 관계의 열쇠입니다.";
            closing  = "거리가 멀어도 함께 가까워질 때의 기쁨이 더 큽니다. 포기하지 마세요! ⭐";
        }

        return opening + "\n\n" + strength + "\n\n" + caution + "\n\n" + closing;
    }

    private String getZodiacTrait(String zodiac) {
        return switch (zodiac) {
            case "쥐"   -> "영리하고 재치 있는";
            case "소"   -> "성실하고 묵묵한";
            case "호랑이" -> "용감하고 카리스마 넘치는";
            case "토끼"  -> "온화하고 섬세한";
            case "용"   -> "열정적이고 강인한";
            case "뱀"   -> "직관적이고 신중한";
            case "말"   -> "자유롭고 활발한";
            case "양"   -> "따뜻하고 예술적인";
            case "원숭이" -> "유쾌하고 창의적인";
            case "닭"   -> "부지런하고 완벽주의적인";
            case "개"   -> "충직하고 솔직한";
            case "돼지"  -> "너그럽고 인정 많은";
            default     -> "독특한";
        };
    }
}
