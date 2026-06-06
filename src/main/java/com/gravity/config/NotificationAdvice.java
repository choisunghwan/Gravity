package com.gravity.config;

import com.gravity.entity.User;
import com.gravity.service.NotificationService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

import java.security.Principal;

@ControllerAdvice
@RequiredArgsConstructor
public class NotificationAdvice {

    private final UserService userService;
    private final NotificationService notificationService;

    @ModelAttribute("unreadNotifCount")
    public long unreadNotifCount(Principal principal) {
        if (principal == null) return 0;
        User user = userService.findByUsername(principal.getName()).orElse(null);
        if (user == null) return 0;
        return notificationService.getUnreadCount(user);
    }
}
