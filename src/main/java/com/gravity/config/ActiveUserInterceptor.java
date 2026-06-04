package com.gravity.config;

import com.gravity.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class ActiveUserInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String uri = request.getRequestURI();
            // 정적 파일, API 폴링 요청은 제외
            if (!uri.startsWith("/css") && !uri.startsWith("/js") && !uri.startsWith("/images")
                    && !uri.equals("/api/chat/new")) {
                userRepository.updateLastActive(auth.getName(), LocalDateTime.now());
            }
        }
        return true;
    }
}
