package com.gravity.service;

import com.gravity.dto.CompatibilityResultDto;
import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import com.gravity.repository.ChatMessageRepository;
import com.gravity.repository.CompatibilityResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompatibilityService {

    private final CompatibilityResultRepository compatibilityResultRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ClaudeService claudeService;

    // 이미 등록된 궁합인지 확인
    public boolean alreadyExists(User user, User partner) {
        return compatibilityResultRepository.existsByUserAndPartner(user, partner);
    }

    // 궁합 분석 및 저장
    @Transactional
    public CompatibilityResult analyzeAndSave(User user, User partner, String paymentKey, String orderId) {
        // 이미 있는 경우 기존 결과 반환
        Optional<CompatibilityResult> existing = compatibilityResultRepository.findByUserAndPartner(user, partner);
        if (existing.isPresent()) {
            return existing.get();
        }

        int zodiacScore = calcZodiacScore(user, partner);
        int numerologyScore = calcNumerologyScore(user, partner);
        int elementScore = calcElementScore(user, partner);
        int totalScore = (int) (zodiacScore * 0.4 + numerologyScore * 0.35 + elementScore * 0.25);
        totalScore = Math.min(100, Math.max(0, totalScore));

        String analysisText = claudeService.generateAnalysis(user, partner, totalScore, zodiacScore, numerologyScore, elementScore);

        CompatibilityResult result = CompatibilityResult.builder()
                .user(user)
                .partner(partner)
                .score(totalScore)
                .zodiacScore(zodiacScore)
                .numerologyScore(numerologyScore)
                .elementScore(elementScore)
                .analysisText(analysisText)
                .paymentKey(paymentKey)
                .orderId(orderId)
                .build();

        return compatibilityResultRepository.save(result);
    }

    public List<CompatibilityResultDto> getMyCompatibilities(User user) {
        return compatibilityResultRepository.findByUserOrderByScoreDesc(user)
                .stream()
                .map(CompatibilityResultDto::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CompatibilityResultDto> getAllCompatibilities(User user) {
        LocalDateTime weekAgo = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(7);

        return compatibilityResultRepository.findAllByUserOrPartner(user)
                .stream()
                .map(cr -> {
                    if (cr.getAnalysisText() == null || cr.getAnalysisText().isBlank()) {
                        String text = claudeService.generateAnalysis(
                                cr.getUser(), cr.getPartner(), cr.getScore(),
                                cr.getZodiacScore(), cr.getNumerologyScore(), cr.getElementScore());
                        cr.setAnalysisText(text);
                        compatibilityResultRepository.save(cr);
                    }
                    return cr;
                })
                .map(cr -> {
                    User partner = cr.getUser().getId().equals(user.getId()) ? cr.getPartner() : cr.getUser();
                    int chatBonus = chatMessageRepository.countRecentMessages(user.getId(), partner.getId(), weekAgo);

                    CompatibilityResultDto dto;
                    if (cr.getUser().getId().equals(user.getId())) {
                        dto = CompatibilityResultDto.from(cr);
                    } else {
                        dto = new CompatibilityResultDto();
                        dto.setId(cr.getId());
                        dto.setPartnerId(cr.getUser().getId());
                        dto.setPartnerName(cr.getUser().getName());
                        dto.setPartnerUsername(cr.getUser().getUsername());
                        dto.setPartnerBirthDate(cr.getUser().getBirthDate());
                        dto.setPartnerGender(cr.getUser().getGender());
                        dto.setPartnerZodiac(cr.getUser().getZodiac());
                        dto.setPartnerPlanetEmoji(cr.getUser().getPlanetEmoji());
                        dto.setPartnerPlanetColor(cr.getUser().getPlanetColor());
                        dto.setPartnerStatusMessage(cr.getUser().getStatusMessage());
                        dto.setScore(cr.getScore());
                        dto.setZodiacScore(cr.getZodiacScore());
                        dto.setNumerologyScore(cr.getNumerologyScore());
                        dto.setElementScore(cr.getElementScore());
                        dto.setAnalysisText(cr.getAnalysisText());
                        dto.setCreatedAt(cr.getCreatedAt().toLocalDate().toString());
                    }
                    dto.setChatBonus(chatBonus);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public Optional<CompatibilityResult> findByOrderId(String orderId) {
        return compatibilityResultRepository.findByOrderId(orderId);
    }

    public long countByUser(User user) {
        return compatibilityResultRepository.countByUser(user);
    }


    // 띠 궁합 점수 계산 (0~100)
    private int calcZodiacScore(User a, User b) {
        int yearA = a.getBirthYear() % 12;
        int yearB = b.getBirthYear() % 12;
        int diff = Math.abs(yearA - yearB);

        // 삼합(4칸 차이): 최고 궁합
        if (diff == 4 || diff == 8) return 95;
        // 육합(1칸 차이): 좋음
        if (diff == 1 || diff == 11) return 80;
        // 같은 띠
        if (diff == 0) return 70;
        // 충(6칸 차이): 최악
        if (diff == 6) return 20;
        // 그 외
        int[] scores = {70, 80, 55, 60, 95, 60, 20, 55, 95, 60, 55, 80};
        return scores[Math.min(diff, 11)];
    }

    // 수비학 궁합 점수 (생명수 기반)
    private int calcNumerologyScore(User a, User b) {
        int numA = a.getLifePathNumber();
        int numB = b.getLifePathNumber();

        int[][] compatibilityMatrix = {
            {0, 70, 85, 65, 90, 75, 80, 55, 70, 60},
            {0, 70, 75, 80, 65, 90, 55, 85, 70, 75},
            {0,  0, 75, 70, 80, 85, 90, 60, 75, 70},
            {0,  0,  0, 60, 75, 80, 70, 85, 90, 65},
            {0,  0,  0,  0, 80, 65, 75, 90, 60, 85},
            {0,  0,  0,  0,  0, 70, 85, 70, 80, 90},
            {0,  0,  0,  0,  0,  0, 65, 80, 90, 75},
            {0,  0,  0,  0,  0,  0,  0, 75, 70, 80},
            {0,  0,  0,  0,  0,  0,  0,  0, 85, 65},
            {0,  0,  0,  0,  0,  0,  0,  0,  0, 70}
        };

        int i = Math.min(numA, numB) - 1;
        int j = Math.max(numA, numB) - 1;
        if (i < 0) i = 0;
        if (j > 9) j = 9;
        if (i == j) return compatibilityMatrix[i][i] == 0 ? 70 : compatibilityMatrix[i][j];
        return compatibilityMatrix[i][j] == 0 ? 70 : compatibilityMatrix[i][j];
    }

    // 오행/나이차 기반 점수
    private int calcElementScore(User a, User b) {
        int yearA = a.getBirthYear();
        int yearB = b.getBirthYear();
        int ageDiff = Math.abs(yearA - yearB);

        // 오행: 목화토금수 (년도 끝자리 기준)
        int elementA = yearA % 10;
        int elementB = yearB % 10;

        // 상생 관계
        boolean isHarmony = isElementHarmony(elementA, elementB);
        // 상극 관계
        boolean isConflict = isElementConflict(elementA, elementB);

        int baseScore;
        if (isHarmony) baseScore = 90;
        else if (isConflict) baseScore = 40;
        else baseScore = 65;

        // 나이차 보정
        if (ageDiff <= 3) baseScore += 10;
        else if (ageDiff <= 6) baseScore += 5;
        else if (ageDiff > 10) baseScore -= 5;

        return Math.min(100, Math.max(0, baseScore));
    }

    private boolean isElementHarmony(int a, int b) {
        // 목(4,5)->화(6,7)->토(8,9)->금(0,1)->수(2,3)->목
        int eA = a / 2;
        int eB = b / 2;
        return (eA + 1) % 5 == eB || (eB + 1) % 5 == eA;
    }

    private boolean isElementConflict(int a, int b) {
        int eA = a / 2;
        int eB = b / 2;
        return (eA + 2) % 5 == eB || (eB + 2) % 5 == eA;
    }
}
