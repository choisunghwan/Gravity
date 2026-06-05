package com.gravity.controller;

import com.gravity.entity.CompatibilityResult;
import com.gravity.entity.User;
import com.gravity.service.CompatibilityService;
import com.gravity.service.TossPaymentService;
import com.gravity.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Controller
@RequestMapping("/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final UserService userService;
    private final CompatibilityService compatibilityService;
    private final TossPaymentService tossPaymentService;

    @Value("${toss.payments.client-key}")
    private String clientKey;

    @GetMapping("/checkout/{partnerId}")
    public String checkoutPage(@PathVariable Long partnerId,
                               @AuthenticationPrincipal UserDetails userDetails,
                               Model model) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User partner = userService.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("상대방을 찾을 수 없습니다."));

        if (compatibilityService.alreadyExists(me, partner) || compatibilityService.alreadyExists(partner, me)) {
            return "redirect:/dashboard?msg=already";
        }

        // 최초 2회 무료
        long usedCount = compatibilityService.countByUser(me);
        if (usedCount < 2) {
            String orderId = "FREE-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
            CompatibilityResult result = compatibilityService.analyzeAndSave(me, partner, "FREE", orderId);
            return "redirect:/dashboard?new=" + result.getId();
        }

        String orderId = "GRAVITY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        model.addAttribute("partner", partner);
        model.addAttribute("currentUser", me);
        model.addAttribute("clientKey", clientKey);
        model.addAttribute("orderId", orderId);
        model.addAttribute("amount", 990);
        model.addAttribute("orderName", me.getName() + " ♡ " + partner.getName() + " 궤도 분석");
        return "payment/checkout";
    }

    @PostMapping("/confirm")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> confirmPayment(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String paymentKey = (String) request.get("paymentKey");
        String orderId = (String) request.get("orderId");
        int amount = (int) request.get("amount");
        Long partnerId = Long.parseLong(request.get("partnerId").toString());

        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User partner = userService.findById(partnerId).orElseThrow();

        boolean confirmed = tossPaymentService.confirmPayment(paymentKey, orderId, amount);

        if (!confirmed) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", "결제 확인에 실패했습니다."));
        }

        try {
            CompatibilityResult result = compatibilityService.analyzeAndSave(me, partner, paymentKey, orderId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "resultId", result.getId(),
                    "redirectUrl", "/dashboard?new=" + result.getId()
            ));
        } catch (Exception e) {
            log.error("궁합 분석 중 오류", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "분석 중 오류가 발생했습니다."));
        }
    }

    // 토스페이먼츠 리다이렉트 성공 콜백
    @GetMapping("/toss-success")
    public String tossSuccess(@RequestParam String paymentKey,
                               @RequestParam String orderId,
                               @RequestParam int amount,
                               @RequestParam Long partnerId,
                               @AuthenticationPrincipal UserDetails userDetails,
                               Model model) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User partner = userService.findById(partnerId).orElseThrow();

        boolean confirmed = tossPaymentService.confirmPayment(paymentKey, orderId, amount);
        if (!confirmed) {
            model.addAttribute("errorMessage", "결제 검증에 실패했습니다.");
            return "payment/fail";
        }

        try {
            CompatibilityResult result = compatibilityService.analyzeAndSave(me, partner, paymentKey, orderId);
            return "redirect:/dashboard?new=" + result.getId();
        } catch (Exception e) {
            log.error("궁합 분석 오류", e);
            model.addAttribute("errorMessage", "분석 중 오류가 발생했습니다.");
            return "payment/fail";
        }
    }

    // 테스트용 결제 우회 (개발/테스트 환경용)
    @GetMapping("/test/{partnerId}")
    public String testBypass(@PathVariable Long partnerId,
                             @AuthenticationPrincipal UserDetails userDetails) {
        User me = userService.findByUsername(userDetails.getUsername()).orElseThrow();
        User partner = userService.findById(partnerId).orElseThrow();

        if (compatibilityService.alreadyExists(me, partner) || compatibilityService.alreadyExists(partner, me)) {
            return "redirect:/dashboard?msg=already";
        }

        String orderId = "TEST-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        CompatibilityResult result = compatibilityService.analyzeAndSave(me, partner, "TEST_PAYMENT", orderId);
        return "redirect:/dashboard?new=" + result.getId();
    }

    @GetMapping("/success")
    public String paymentSuccess(@RequestParam String orderId, Model model) {
        return "payment/success";
    }

    @GetMapping("/fail")
    public String paymentFail(@RequestParam(required = false) String message, Model model) {
        model.addAttribute("errorMessage", message != null ? message : "결제에 실패했습니다.");
        return "payment/fail";
    }
}
