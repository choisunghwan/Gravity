package com.gravity.controller;

import com.gravity.entity.User;
import com.gravity.service.CompatibilityService;
import com.gravity.service.ClaudeService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class GravityAIController {

    private final UserService userService;
    private final CompatibilityService compatibilityService;
    private final ClaudeService claudeService;

    @PostMapping("/gravity-ai")
    public ResponseEntity<Map<String, String>> ask(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {

        String question = body.get("question");
        if (question == null || question.isBlank()) return ResponseEntity.badRequest().build();

        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();

        String planetsInfo = compatibilityService.getAllCompatibilitiesSimple(user).stream()
                .map(c -> String.format("- %s: 궁합 %d점, %s 궤도, 채팅활동 %d",
                        c.getPartnerName(), c.getScore(), c.getOrbitPlanetName(), c.getChatBonus()))
                .collect(Collectors.joining("\n"));

        String answer = claudeService.askGravityAI(user.getName(), planetsInfo, question);
        return ResponseEntity.ok(Map.of("answer", answer));
    }
}
