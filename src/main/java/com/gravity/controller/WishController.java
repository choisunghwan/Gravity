package com.gravity.controller;

import com.gravity.entity.Wish;
import com.gravity.repository.WishRepository;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/wish")
@RequiredArgsConstructor
public class WishController {

    private final WishRepository wishRepository;
    private final UserService userService;

    @PostMapping
    public Map<String, Object> postWish(@RequestBody Map<String, String> body, Principal principal) {
        String text = body.get("text");
        if (text == null || text.isBlank() || text.length() > 100) {
            return Map.of("ok", false);
        }
        String userName = userService.findByUsername(principal.getName())
                .map(u -> u.getName()).orElse("익명");

        wishRepository.save(Wish.builder().text(text).userName(userName).build());
        return Map.of("ok", true);
    }

    @GetMapping("/active")
    public List<Map<String, String>> getActiveWishes() {
        LocalDateTime since = LocalDateTime.now().minusSeconds(20);
        return wishRepository.findActiveWishes(since).stream()
                .map(w -> Map.of("text", w.getText(), "userName", w.getUserName()))
                .collect(Collectors.toList());
    }
}
