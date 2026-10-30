-- ============================================================
-- recibo-box · Esquema inicial MySQL 8.x
-- Uso: mysql -u root -p < backend/sql/schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS recibo_box
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recibo_box;

-- ------------------------------------------------------------
-- tenants · Inquilinos
-- ------------------------------------------------------------
CREATE TABLE tenants (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(150)      NOT NULL COMMENT 'Nombres y apellidos o razón social',
  doc_type      ENUM('V','E','J','G','R') NOT NULL DEFAULT 'V' COMMENT 'Tipo de documento/RIF',
  doc_number    VARCHAR(20)       NOT NULL COMMENT 'CI/RIF',
  phone         VARCHAR(20)       NOT NULL COMMENT 'N.º WhatsApp/eófono (formato E.164: +58...)',
  local_number  VARCHAR(20)       NOT NULL COMMENT 'N.º de local comercial',
  is_active     TINYINT(1)        NOT NULL DEFAULT 1,
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tenant_doc   (doc_type, doc_number),
  UNIQUE KEY uq_tenant_local (local_number),
  KEY idx_tenant_name (full_name)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- receipts · Recibos de pago
-- ------------------------------------------------------------
CREATE TABLE receipts (
  id                INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  receipt_number    INT UNSIGNED      NOT NULL DEFAULT 0 COMMENT 'N.º de recibo incremental automático (trigger)',
  tenant_id         INT UNSIGNED      NOT NULL,
  period_month      TINYINT UNSIGNED  NOT NULL COMMENT 'Mes correspondiente al pago (1-12)',
  period_year       SMALLINT UNSIGNED NOT NULL,
  issue_date        DATE              NOT NULL COMMENT 'Fecha de generación',

  amount_bs         DECIMAL(14,2)     NOT NULL DEFAULT 0.00 COMMENT 'Monto en Bolívares',
  amount_usd        DECIMAL(14,2)     NOT NULL DEFAULT 0.00 COMMENT 'Monto en Dólares',
  exchange_rate     DECIMAL(12,4)     NULL COMMENT 'Tasa de cambio Bs/USD aplicada',

  iva_rate          DECIMAL(5,2)      NOT NULL DEFAULT 16.00 COMMENT '% IVA (calculado sobre Bs.)',
  iva_amount        DECIMAL(14,2)     GENERATED ALWAYS AS (ROUND(amount_bs * iva_rate / 100, 2)) STORED,
  total_received    DECIMAL(14,2)     GENERATED ALWAYS AS (ROUND(amount_bs + ROUND(amount_bs * iva_rate / 100, 2), 2)) STORED COMMENT 'Total Recibido',

  payment_reference VARCHAR(50)       NULL COMMENT 'Referencia de pago bancario',
  whatsapp_sent     TINYINT(1)        NOT NULL DEFAULT 0,
  whatsapp_sent_at  DATETIME          NULL,
  created_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_receipt_number (receipt_number),
  KEY idx_receipt_tenant (tenant_id),
  KEY idx_receipt_period (period_year, period_month),
  KEY idx_receipt_issue  (issue_date),
  CONSTRAINT fk_receipts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_period_month CHECK (period_month BETWEEN 1 AND 12)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Trigger: asigna receipt_number (= id) si no se envía
-- ------------------------------------------------------------
DELIMITER //
CREATE TRIGGER trg_receipts_number BEFORE INSERT ON receipts
FOR EACH ROW
BEGIN
  IF NEW.receipt_number = 0 THEN
    SET NEW.receipt_number = COALESCE((
      SELECT AUTO_INCREMENT
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'receipts'
    ), 1);
  END IF;
END//
DELIMITER ;
