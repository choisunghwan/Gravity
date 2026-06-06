package com.gravity.controller;

import com.gravity.entity.Notification;
import com.gravity.entity.User;
import com.gravity.service.NotificationService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final UserService userService;
    private final NotificationService notificationService;

    @GetMapping
    public String notifications(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        List<Notification> notifications = notificationService.getAll(user);
        notificationService.markAllAsRead(user);
        model.addAttribute("notifications", notifications);
        return "notifications/index";
    }

    @ResponseBody
    @GetMapping("/count")
    public long count(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        return notificationService.getUnreadCount(user);
    }
}
