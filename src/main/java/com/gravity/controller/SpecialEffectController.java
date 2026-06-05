package com.gravity.controller;

import com.gravity.entity.SpecialEffect;
import com.gravity.entity.User;
import com.gravity.repository.SpecialEffectRepository;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/effect")
@RequiredArgsConstructor
public class SpecialEffectController {

    private final SpecialEffectRepository effectRepository;
    private final UserService userService;

    @PostMapping
    public Map<String, Object> sendEffect(@RequestBody Map<String, Object> body, Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        String type = (String) body.get("type");
        Long receiverId = Long.valueOf(body.get("receiverId").toString());

        effectRepository.save(SpecialEffect.builder()
                .type(type)
                .senderId(me.getId())
                .receiverId(receiverId)
                .build());

        return Map.of("ok", true);
    }

    @GetMapping("/poll")
    public List<Map<String, Object>> pollEffects(Principal principal) {
        User me = userService.findByUsername(principal.getName()).orElseThrow();
        LocalDateTime since = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusSeconds(10);
        List<SpecialEffect> effects = effectRepository.findPendingEffects(me.getId(), since);

        // 오래된 것 정리
        effectRepository.deleteOldEffects(LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusSeconds(30));

        return effects.stream().map(e -> Map.<String, Object>of(
                "type", e.getType(),
                "senderId", e.getSenderId()
        )).collect(Collectors.toList());
    }
}
