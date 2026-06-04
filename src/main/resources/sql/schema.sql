-- Gravity DB 초기 스키마 (JPA ddl-auto=update 사용 시 자동 생성)
-- MySQL 8.0+ 기준

CREATE DATABASE IF NOT EXISTS gravity_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE gravity_db;

CREATE TABLE IF NOT EXISTS users (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(50)  UNIQUE NOT NULL COMMENT '아이디',
    password    VARCHAR(255)        NOT NULL COMMENT '암호화된 비밀번호',
    name        VARCHAR(50)         NOT NULL COMMENT '실명',
    birth_date  DATE                NOT NULL COMMENT '생년월일',
    gender      VARCHAR(10)         NOT NULL COMMENT 'MALE / FEMALE',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS compatibility_result (
    id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id             BIGINT  NOT NULL,
    partner_id          BIGINT  NOT NULL,
    score               INT     NOT NULL COMMENT '종합 궁합 점수 (0~100)',
    zodiac_score        INT     COMMENT '띠 궁합 점수',
    numerology_score    INT     COMMENT '수비학 궁합 점수',
    element_score       INT     COMMENT '오행 궁합 점수',
    analysis_text       TEXT    COMMENT 'Claude AI 분석 텍스트',
    payment_key         VARCHAR(255) COMMENT '토스페이먼츠 결제 키',
    order_id            VARCHAR(255) COMMENT '주문 ID',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_partner (user_id, partner_id),
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
