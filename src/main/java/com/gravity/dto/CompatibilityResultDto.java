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
    private Integer score;
    private Integer zodiacScore;
    private Integer numerologyScore;
    private Integer elementScore;
    private String analysisText;
    private String createdAt;

    // 궁합 점수에 따라 행성 거리 계산 (높을수록 가깝게)
    // 점수 → 태양계 궤도 매핑
    public double getOrbitRadius() {
        if (score >= 90) return 140;   // 수성
        if (score >= 77) return 200;   // 금성
        if (score >= 63) return 265;   // 화성
        if (score >= 49) return 345;   // 목성
        if (score >= 35) return 430;   // 토성
        if (score >= 20) return 520;   // 천왕성
        return 615;                     // 해왕성
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
                .score(result.getScore())
                .zodiacScore(result.getZodiacScore())
                .numerologyScore(result.getNumerologyScore())
                .elementScore(result.getElementScore())
                .analysisText(result.getAnalysisText())
                .createdAt(result.getCreatedAt().toLocalDate().toString())
                .build();
    }
}
