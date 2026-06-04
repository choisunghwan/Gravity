package com.gravity.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaymentRequestDto {
    private String paymentKey;
    private String orderId;
    private Integer amount;
    private Long partnerId;
}
