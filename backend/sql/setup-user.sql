-- Usuario del API (mínimos privilegios solo sobre recibo_box).
-- Cambia el password si quieres; debe coincidir con backend/.env (DB_PASSWORD).
CREATE USER IF NOT EXISTS 'recibo_api'@'localhost' IDENTIFIED BY 'recibo_dev_2026';
GRANT SELECT, INSERT, UPDATE, DELETE, ALTER ON recibo_box.* TO 'recibo_api'@'localhost';
FLUSH PRIVILEGES;
