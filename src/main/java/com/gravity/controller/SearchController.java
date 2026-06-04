package com.gravity.controller;

import com.gravity.entity.User;
import com.gravity.service.CompatibilityService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class SearchController {

    private final UserService userService;
    private final CompatibilityService compatibilityService;

    @GetMapping("/search")
    public String searchPage(@RequestParam(required = false) String keyword,
                             @AuthenticationPrincipal UserDetails userDetails,
                             Model model) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        model.addAttribute("keyword", keyword);

        if (keyword != null && !keyword.isBlank()) {
            List<User> results = userService.searchUsers(keyword)
                    .stream()
                    .filter(u -> !u.getId().equals(me.getId()))
                    .collect(Collectors.toList());

            List<Map<String, Object>> resultWithStatus = results.stream().map(u -> {
                boolean alreadyRegistered = compatibilityService.alreadyExists(me, u)
                        || compatibilityService.alreadyExists(u, me);
                return Map.of(
                        "user", u,
                        "alreadyRegistered", alreadyRegistered
                );
            }).collect(Collectors.toList());

            model.addAttribute("results", resultWithStatus);
        }

        return "search/search";
    }

    @GetMapping("/search/user/{id}")
    @ResponseBody
    public Map<String, Object> getUserInfo(@PathVariable Long id,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User target = userService.findById(id).orElseThrow();

        boolean alreadyRegistered = compatibilityService.alreadyExists(me, target)
                || compatibilityService.alreadyExists(target, me);

        return Map.of(
                "id", target.getId(),
                "name", target.getName(),
                "username", target.getUsername(),
                "gender", target.getGender(),
                "zodiac", target.getZodiac(),
                "alreadyRegistered", alreadyRegistered
        );
    }
}
