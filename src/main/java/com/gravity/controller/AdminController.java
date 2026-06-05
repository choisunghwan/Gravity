package com.gravity.controller;

import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import com.gravity.repository.CompatibilityResultRepository;
import com.gravity.repository.UserRepository;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final CompatibilityResultRepository compatibilityResultRepository;
    private final UserService userService;

    @GetMapping
    public String dashboard(Model model) {
        List<User> users = userRepository.findAll();
        long totalConnections = compatibilityResultRepository.count();

        model.addAttribute("users", users);
        model.addAttribute("totalUsers", users.size());
        model.addAttribute("totalConnections", totalConnections);
        return "admin/index";
    }

    @PostMapping("/delete-users")
    public String deleteUsers(@RequestParam List<Long> userIds, RedirectAttributes ra) {
        int count = 0;
        for (Long id : userIds) {
            userRepository.findById(id).ifPresent(u -> {
                if (!"ROLE_ADMIN".equals(u.getRole())) userService.deleteUser(u);
            });
            count++;
        }
        ra.addFlashAttribute("successMsg", count + "명의 회원을 탈퇴처리 했습니다.");
        return "redirect:/admin";
    }

    @GetMapping("/user/{id}")
    public String userDetail(@PathVariable Long id, Model model) {
        User user = userRepository.findById(id).orElseThrow();
        List<CompatibilityResult> connections = compatibilityResultRepository.findByUserOrderByScoreDesc(user);

        model.addAttribute("user", user);
        model.addAttribute("connections", connections);
        model.addAttribute("connectionCount", connections.size());
        return "admin/user";
    }
}
