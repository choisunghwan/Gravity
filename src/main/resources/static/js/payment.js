async function requestPayment() {
    const btn = document.getElementById('payment-button');
    btn.disabled = true;
    btn.textContent = '결제창 열는 중...';

    try {
        const tossPayments = TossPayments(CLIENT_KEY);

        await tossPayments.requestPayment('카드', {
            amount: AMOUNT,
            orderId: ORDER_ID,
            orderName: ORDER_NAME,
            customerName: CUSTOMER_NAME,
            successUrl: window.location.origin + '/payment/toss-success?partnerId=' + PARTNER_ID,
            failUrl: window.location.origin + '/payment/fail'
        });

    } catch (err) {
        console.error('결제 오류:', err);
        btn.disabled = false;
        btn.textContent = '💳 990원 결제하기';

        if (err.code === 'USER_CANCEL') {
            alert('결제가 취소되었습니다.');
        } else {
            alert('결제 중 오류가 발생했습니다: ' + (err.message || err.code));
        }
    }
}
