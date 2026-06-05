package com.gravity.controller;

import com.gravity.dto.CompatibilityResultDto;
import com.gravity.entity.User;
import com.gravity.service.CompatibilityService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final UserService userService;
    private final CompatibilityService compatibilityService;

    @GetMapping("/")
    public String root() {
        return "redirect:/dashboard";
    }

    @GetMapping("/dashboard")
    public String dashboard(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        User user = userService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        List<CompatibilityResultDto> compatibilities = compatibilityService.getAllCompatibilities(user);
        assignRanks(compatibilities);

        model.addAttribute("currentUser", user);
        model.addAttribute("compatibilities", compatibilities);
        model.addAttribute("compatibilitiesJson", toJson(compatibilities));
        return "dashboard/index";
    }

    @GetMapping("/compatibility/{id}")
    @ResponseBody
    public CompatibilityResultDto getCompatibilityDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();

        List<CompatibilityResultDto> all = compatibilityService.getAllCompatibilities(user);
        assignRanks(all);

        return all.stream()
                .filter(c -> c.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("궁합 결과를 찾을 수 없습니다."));
    }

    // 동점 시 공동 순위 (표준 경쟁 랭킹: 1,2,2,4)
    private void assignRanks(List<CompatibilityResultDto> list) {
        for (CompatibilityResultDto dto : list) {
            int rank = 1;
            for (CompatibilityResultDto other : list) {
                if (other.getScore() > dto.getScore()) rank++;
            }
            dto.setRank(rank);
        }
    }

    private String toJson(List<CompatibilityResultDto> list) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < list.size(); i++) {
            CompatibilityResultDto dto = list.get(i);
            if (i > 0) sb.append(",");
            sb.append("{");
            sb.append("\"id\":").append(dto.getId()).append(",");
            sb.append("\"partnerId\":").append(dto.getPartnerId()).append(",");
            sb.append("\"rank\":").append(dto.getRank()).append(",");
            sb.append("\"partnerName\":\"").append(escapeJson(dto.getPartnerName())).append("\",");
            sb.append("\"partnerZodiac\":\"").append(escapeJson(dto.getPartnerZodiac())).append("\",");
            sb.append("\"score\":").append(dto.getScore()).append(",");
            sb.append("\"orbitRadius\":").append(dto.getOrbitRadius()).append(",");
            sb.append("\"planetColor\":\"").append(dto.getPlanetColor()).append("\",");
            sb.append("\"planetSize\":").append(dto.getPlanetSize()).append(",");
            sb.append("\"scoreLabel\":\"").append(dto.getScoreLabel()).append("\",");
            sb.append("\"orbitPlanet\":\"").append(dto.getOrbitPlanetName()).append("\",");
            sb.append("\"gender\":\"").append(dto.getPartnerGender() != null ? dto.getPartnerGender() : "").append("\",");
            String img = dto.getPartnerProfileImage();
            sb.append("\"profileImage\":").append(img != null ? "\"" + escapeJson(img) + "\"" : "null").append(",");
            sb.append("\"partnerEmoji\":\"").append(escapeJson(dto.getPartnerPlanetEmoji())).append("\",");
            String status = dto.getPartnerStatusMessage();
            sb.append("\"partnerStatus\":").append(status != null ? "\"" + escapeJson(status) + "\"" : "null").append(",");
            sb.append("\"chatBonus\":").append(dto.getChatBonus());
            sb.append("}");
        }
        sb.append("]");
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
