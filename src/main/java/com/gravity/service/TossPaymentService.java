package com.gravity.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TossPaymentService {

    @Value("${toss.payments.secret-key}")
    private String secretKey;

    @Value("${toss.payments.api-url}")
    private String apiUrl;

    public boolean confirmPayment(String paymentKey, String orderId, int amount) {
        try {
            String encodedKey = Base64.getEncoder()
                    .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

            WebClient webClient = WebClient.builder()
                    .baseUrl(apiUrl)
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + encodedKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build();

            Map<String, Object> requestBody = Map.of(
                    "paymentKey", paymentKey,
                    "orderId", orderId,
                    "amount", amount
            );

            Map response = webClient.post()
                    .uri("/payments/confirm")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null) {
                String status = (String) response.get("status");
                log.info("토스페이먼츠 결제 확인 완료: orderId={}, status={}", orderId, status);
                return "DONE".equals(status);
            }
            return false;

        } catch (WebClientResponseException e) {
            log.error("토스페이먼츠 결제 확인 실패: {}", e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("토스페이먼츠 API 호출 오류: {}", e.getMessage());
            return false;
        }
    }
}
