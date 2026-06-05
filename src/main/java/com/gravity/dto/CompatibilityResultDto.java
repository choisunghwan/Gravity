package com.gravity.dto;

import com.gravity.entity.CompatibilityResult;
import lombok.*;
import java.time.LocalDate;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompatibilityResultDto {

    private Long id;
    private Integer rank;
    private Long partnerId;
    private String partnerName;
    private String partnerUsername;
    private LocalDate partnerBirthDate;
    private String partnerGender;
    private String partnerZodiac;
    private String partnerProfileImage;
    private String partnerPlanetEmoji;
    private String partnerPlanetColor;
    private String partnerStatusMessage;
    private int chatBonus;
    private Integer score;
    private Integer zodiacScore;
    private Integer numerologyScore;
    private Integer elementScore;
    private String analysisText;
    private String createdAt;

    // 궁합 점수 기반 기본 궤도 + 채팅 빈도 보너스 반영
    public double getOrbitRadius() {
        double base;
        if (score >= 90) base = 140;
        else if (score >= 77) base = 200;
        else if (score >= 63) base = 265;
        else if (score >= 49) base = 345;
        else if (score >= 35) base = 430;
        else if (score >= 20) base = 520;
        else base = 615;
        double bonus = Math.min(chatBonus * 8.0, base * 0.35);
        return Math.max(80, base - bonus);
    }

    public String getOrbitPlanetName() {
        if (score >= 90) return "수성";
        if (score >= 77) return "금성";
        if (score >= 63) return "화성";
        if (score >= 49) return "목성";
        if (score >= 35) return "토성";
        if (score >= 20) return "천왕성";
        return "해왕성";
    }

    public String getPlanetColor() {
        if (partnerPlanetColor != null && !partnerPlanetColor.isBlank()) return partnerPlanetColor;
        if ("FEMALE".equals(partnerGender)) return "#F9A8C9";
        return "#7DD3FC";
    }

    public String getPlanetSize() {
        if (score >= 90) return "58";
        if (score >= 77) return "50";
        if (score >= 63) return "43";
        if (score >= 49) return "37";
        if (score >= 35) return "32";
        if (score >= 20) return "28";
        return "24";
    }

    public String getScoreLabel() {
        if (score >= 90) return "천생연분 (수성 궤도)";
        if (score >= 77) return "아주 좋음 (금성 궤도)";
        if (score >= 63) return "좋음 (화성 궤도)";
        if (score >= 49) return "보통 (목성 궤도)";
        if (score >= 35) return "낮음 (토성 궤도)";
        if (score >= 20) return "매우 낮음 (천왕성 궤도)";
        return "인연 없음 (해왕성 궤도)";
    }

    public static CompatibilityResultDto from(CompatibilityResult result) {
        return CompatibilityResultDto.builder()
                .id(result.getId())
                .partnerId(result.getPartner().getId())
                .partnerName(result.getPartner().getName())
                .partnerUsername(result.getPartner().getUsername())
                .partnerBirthDate(result.getPartner().getBirthDate())
                .partnerGender(result.getPartner().getGender())
                .partnerZodiac(result.getPartner().getZodiac())
                .partnerProfileImage(result.getPartner().getProfileImage())
                .partnerPlanetEmoji(result.getPartner().getPlanetEmoji())
                .partnerPlanetColor(result.getPartner().getPlanetColor())
                .partnerStatusMessage(result.getPartner().getStatusMessage())
                .score(result.getScore())
                .zodiacScore(result.getZodiacScore())
                .numerologyScore(result.getNumerologyScore())
                .elementScore(result.getElementScore())
                .analysisText(result.getAnalysisText())
                .createdAt(result.getCreatedAt().toLocalDate().toString())
                .build();
    }
}
