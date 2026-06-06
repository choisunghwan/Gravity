package com.gravity.controller;

import com.gravity.dto.CompatibilityResultDto;
import com.gravity.dto.PostDto;
import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import com.gravity.repository.CompatibilityResultRepository;
import com.gravity.service.PostService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Controller
@RequestMapping("/planet")
@RequiredArgsConstructor
public class PlanetController {

    private final UserService userService;
    private final PostService postService;
    private final CompatibilityResultRepository compatibilityResultRepository;

    @GetMapping("/{id}")
    public String planetProfile(@PathVariable Long id,
                                @AuthenticationPrincipal UserDetails userDetails,
                                Model model) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User planet = userService.findById(id).orElseThrow();

        // 연결 여부 + 점수
        Optional<CompatibilityResult> connection = compatibilityResultRepository.findByUserAndPartner(me, planet);
        if (connection.isEmpty()) {
            connection = compatibilityResultRepository.findByUserAndPartner(planet, me);
        }

        CompatibilityResultDto connectionDto = null;
        Long daysSinceConnection = null;
        if (connection.isPresent()) {
            CompatibilityResult cr = connection.get();
            connectionDto = CompatibilityResultDto.from(
                cr.getUser().getId().equals(me.getId()) ? cr : invertCr(cr)
            );
            if (cr.getCreatedAt() != null) {
                daysSinceConnection = ChronoUnit.DAYS.between(
                    cr.getCreatedAt().toLocalDate(), LocalDate.now()
                );
            }
        }

        List<PostDto> posts = postService.getPostsByAuthor(planet, me);

        model.addAttribute("planet", planet);
        model.addAttribute("connection", connectionDto);
        model.addAttribute("daysSince", daysSinceConnection);
        model.addAttribute("posts", posts);
        model.addAttribute("isMe", me.getId().equals(planet.getId()));
        model.addAttribute("isConnected", connection.isPresent());
        return "planet/index";
    }

    private CompatibilityResult invertCr(CompatibilityResult cr) {
        CompatibilityResult inv = new CompatibilityResult();
        inv.setId(cr.getId());
        inv.setUser(cr.getPartner());
        inv.setPartner(cr.getUser());
        inv.setScore(cr.getScore());
        inv.setZodiacScore(cr.getZodiacScore());
        inv.setNumerologyScore(cr.getNumerologyScore());
        inv.setElementScore(cr.getElementScore());
        inv.setAnalysisText(cr.getAnalysisText());
        inv.setCreatedAt(cr.getCreatedAt());
        return inv;
    }
}
