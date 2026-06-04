-- ============================================================
-- DEMO SEED — Finanzas Personales
-- Período: últimos 6 meses | Moneda: ARS | Perfil: individual
--
-- INSTRUCCIONES:
-- 1. Abrí Supabase > SQL Editor
-- 2. Ejecutá este script completo (no requiere reemplazar nada)
-- ============================================================

DO $$
DECLARE
  
  -- Cuentas existentes
  acc_mp    uuid := 'f4d34279-7a73-439a-822c-e354517373ae'; -- MP (digital, ARS) 
  acc_bna   uuid := 'a113ff16-9977-42ba-9be6-9dffc3034e25'; -- BNA (bank, ARS)
  acc_cash  uuid := 'd4e370b3-81ae-40f5-b06d-03f0f7ca9a83'; -- Cash (cash, ARS)

  -- Category IDs
  cat_comida      uuid := 'eca35849-a4ea-4908-b104-7b79a657fd31';
  cat_entret      uuid := '8eecdedb-4d77-4dee-a522-674fb968ae86';
  cat_otros       uuid := '0afa539a-86e6-4952-8154-268e41b30c89';
  cat_ropa        uuid := '99c9b039-c9d5-4437-aff3-542fc1739d86';
  cat_salud       uuid := '09e0fd46-725e-4f01-929a-7149fbb23c78';
  cat_servicios   uuid := '2186a6a1-490c-46da-a778-3cdd6d694ba7';
  cat_super       uuid := '83b818cb-0d02-4754-bf96-9db21cf6234d';
  cat_transporte  uuid := '50c600b1-a960-4da0-96c2-44a01617c9a3';

  hoy date := CURRENT_DATE;

BEGIN

-- ── MES -6 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  350000,  'Sueldo',                              NULL,          hoy - interval '6 months' + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '6 months' + interval '3 days',  'manual'),
  (acc_mp,    -4200,  'Rappi - pizza y empanadas',           cat_comida,    hoy - interval '6 months' + interval '4 days',  'manual'),
  (acc_mp,   -12500,  'Supermercado Día',                    cat_super,     hoy - interval '6 months' + interval '5 days',  'manual'),
  (acc_cash,  -1800,  'Colectivo semanal',                   cat_transporte,hoy - interval '6 months' + interval '6 days',  'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '6 months' + interval '7 days',  'manual'),
  (acc_mp,    -6300,  'Farmacity - medicamentos',            cat_salud,     hoy - interval '6 months' + interval '9 days',  'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '6 months' + interval '10 days', 'manual'),
  (acc_mp,    -3500,  'McDonald''s con amigos',              cat_comida,    hoy - interval '6 months' + interval '11 days', 'manual'),
  (acc_cash,  -2200,  'Taxi',                                cat_transporte,hoy - interval '6 months' + interval '12 days', 'manual'),
  (acc_mp,   -15600,  'Supermercado Carrefour',              cat_super,     hoy - interval '6 months' + interval '14 days', 'manual'),
  (acc_mp,    -7200,  'Cine + pochoclos',                    cat_entret,    hoy - interval '6 months' + interval '15 days', 'manual'),
  (acc_bna,   -4500,  'Luz y gas',                           cat_servicios, hoy - interval '6 months' + interval '17 days', 'manual'),
  (acc_mp,    -5100,  'Almuerzos semana',                    cat_comida,    hoy - interval '6 months' + interval '18 days', 'manual'),
  (acc_mp,    25000,  'Venta artículos usados',              cat_otros,     hoy - interval '6 months' + interval '20 days', 'manual');

-- ── MES -5 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  350000,  'Sueldo',                              NULL,          hoy - interval '5 months' + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '5 months' + interval '3 days',  'manual'),
  (acc_mp,   -22000,  'Regalos navidad',                     cat_ropa,      hoy - interval '5 months' + interval '5 days',  'manual'),
  (acc_mp,   -18500,  'Supermercado Coto - despensa navidad',cat_super,     hoy - interval '5 months' + interval '7 days',  'manual'),
  (acc_cash,  -3500,  'Transporte navidad',                  cat_transporte,hoy - interval '5 months' + interval '8 days',  'manual'),
  (acc_mp,   -14000,  'Cena navidad restaurante',            cat_comida,    hoy - interval '5 months' + interval '10 days', 'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '5 months' + interval '11 days', 'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '5 months' + interval '12 days', 'manual'),
  (acc_bna,   45000,  'Aguinaldo (SAC)',                     NULL,          hoy - interval '5 months' + interval '13 days', 'manual'),
  (acc_mp,   -31000,  'Ropa verano - Zara',                  cat_ropa,      hoy - interval '5 months' + interval '15 days', 'manual'),
  (acc_mp,    -8700,  'Supermercado fin de año',             cat_super,     hoy - interval '5 months' + interval '18 days', 'manual'),
  (acc_mp,   -12000,  'Cena año nuevo',                      cat_comida,    hoy - interval '5 months' + interval '20 days', 'manual'),
  (acc_mp,    -5500,  'Farmacia - protector solar',          cat_salud,     hoy - interval '5 months' + interval '22 days', 'manual'),
  (acc_cash,  -4200,  'Cotillón año nuevo',                  cat_entret,    hoy - interval '5 months' + interval '25 days', 'manual');

-- ── MES -4 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  350000,  'Sueldo',                              NULL,          hoy - interval '4 months' + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '4 months' + interval '3 days',  'manual'),
  (acc_mp,    -4800,  'PedidosYa - sushi',                   cat_comida,    hoy - interval '4 months' + interval '4 days',  'manual'),
  (acc_mp,   -13200,  'Supermercado Día',                    cat_super,     hoy - interval '4 months' + interval '6 days',  'manual'),
  (acc_cash,  -1800,  'Colectivo semanal',                   cat_transporte,hoy - interval '4 months' + interval '7 days',  'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '4 months' + interval '8 days',  'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '4 months' + interval '10 days', 'manual'),
  (acc_mp,   -28000,  'Consulta médica + estudios',          cat_salud,     hoy - interval '4 months' + interval '11 days', 'manual'),
  (acc_mp,    -6800,  'Salidas verano',                      cat_entret,    hoy - interval '4 months' + interval '13 days', 'manual'),
  (acc_mp,   -11500,  'Supermercado Carrefour',              cat_super,     hoy - interval '4 months' + interval '15 days', 'manual'),
  (acc_bna,   -4500,  'Luz y gas',                           cat_servicios, hoy - interval '4 months' + interval '17 days', 'manual'),
  (acc_mp,    -5200,  'Almuerzos semana',                    cat_comida,    hoy - interval '4 months' + interval '19 days', 'manual'),
  (acc_mp,   -16500,  'Zapatillas Nike - outlet',            cat_ropa,      hoy - interval '4 months' + interval '21 days', 'manual'),
  (acc_cash,  -2800,  'Nafta moto',                          cat_transporte,hoy - interval '4 months' + interval '23 days', 'manual');

-- ── MES -3 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  375000,  'Sueldo (con aumento)',                NULL,          hoy - interval '3 months' + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '3 months' + interval '3 days',  'manual'),
  (acc_mp,    -4100,  'Rappi - hamburguesas',                cat_comida,    hoy - interval '3 months' + interval '4 days',  'manual'),
  (acc_mp,   -14800,  'Supermercado Coto',                   cat_super,     hoy - interval '3 months' + interval '5 days',  'manual'),
  (acc_cash,  -1800,  'Colectivo semanal',                   cat_transporte,hoy - interval '3 months' + interval '6 days',  'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '3 months' + interval '7 days',  'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '3 months' + interval '9 days',  'manual'),
  (acc_mp,    -8400,  'Teatro + cena',                       cat_entret,    hoy - interval '3 months' + interval '11 days', 'manual'),
  (acc_mp,   -12900,  'Supermercado Día',                    cat_super,     hoy - interval '3 months' + interval '13 days', 'manual'),
  (acc_bna,   -4500,  'Luz y gas',                           cat_servicios, hoy - interval '3 months' + interval '15 days', 'manual'),
  (acc_mp,    -6100,  'Regalo cumpleaños + torta',           cat_otros,     hoy - interval '3 months' + interval '17 days', 'manual'),
  (acc_mp,    -5600,  'Almuerzos semana',                    cat_comida,    hoy - interval '3 months' + interval '19 days', 'manual'),
  (acc_mp,    -9200,  'Farmacia - medicamentos',             cat_salud,     hoy - interval '3 months' + interval '21 days', 'manual'),
  (acc_bna,   30000,  'Reintegro obra social',               cat_salud,     hoy - interval '3 months' + interval '23 days', 'manual');

-- ── MES -2 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  375000,  'Sueldo',                              NULL,          hoy - interval '2 months' + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '2 months' + interval '3 days',  'manual'),
  (acc_mp,    -5300,  'PedidosYa - comida china',            cat_comida,    hoy - interval '2 months' + interval '4 days',  'manual'),
  (acc_mp,   -16200,  'Supermercado Carrefour',              cat_super,     hoy - interval '2 months' + interval '5 days',  'manual'),
  (acc_cash,  -1800,  'Colectivo semanal',                   cat_transporte,hoy - interval '2 months' + interval '7 days',  'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '2 months' + interval '8 days',  'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '2 months' + interval '9 days',  'manual'),
  (acc_mp,   -42000,  'Viaje fin de semana - alojamiento',   cat_entret,    hoy - interval '2 months' + interval '11 days', 'manual'),
  (acc_mp,    -7800,  'Comidas durante el viaje',            cat_comida,    hoy - interval '2 months' + interval '12 days', 'manual'),
  (acc_cash,  -5500,  'Nafta viaje',                         cat_transporte,hoy - interval '2 months' + interval '13 days', 'manual'),
  (acc_mp,   -13500,  'Supermercado Día',                    cat_super,     hoy - interval '2 months' + interval '16 days', 'manual'),
  (acc_bna,   -4500,  'Luz y gas',                           cat_servicios, hoy - interval '2 months' + interval '17 days', 'manual'),
  (acc_mp,   -24000,  'Campera invierno',                    cat_ropa,      hoy - interval '2 months' + interval '19 days', 'manual'),
  (acc_mp,    -6200,  'Almuerzos semana',                    cat_comida,    hoy - interval '2 months' + interval '21 days', 'manual'),
  (acc_bna,   20000,  'Transferencia recibida',              cat_otros,     hoy - interval '2 months' + interval '24 days', 'manual');

-- ── MES -1 ──────────────────────────────────────────────────
INSERT INTO transactions (account_id, amount, description, category_id, date, source) VALUES
  (acc_bna,  375000,  'Sueldo',                              NULL,          hoy - interval '1 month'  + interval '2 days',  'manual'),
  (acc_bna,  -85000,  'Alquiler',                            cat_servicios, hoy - interval '1 month'  + interval '3 days',  'manual'),
  (acc_mp,    -4700,  'Rappi - pizza',                       cat_comida,    hoy - interval '1 month'  + interval '4 days',  'manual'),
  (acc_mp,   -15100,  'Supermercado Coto',                   cat_super,     hoy - interval '1 month'  + interval '5 days',  'manual'),
  (acc_cash,  -1800,  'Colectivo semanal',                   cat_transporte,hoy - interval '1 month'  + interval '6 days',  'manual'),
  (acc_mp,    -9800,  'Netflix + Spotify',                   cat_entret,    hoy - interval '1 month'  + interval '7 days',  'manual'),
  (acc_bna,  -18000,  'Expensas',                            cat_servicios, hoy - interval '1 month'  + interval '9 days',  'manual'),
  (acc_mp,   -11200,  'Dentista',                            cat_salud,     hoy - interval '1 month'  + interval '11 days', 'manual'),
  (acc_mp,    -5800,  'Bar con amigos',                      cat_entret,    hoy - interval '1 month'  + interval '13 days', 'manual'),
  (acc_mp,   -12400,  'Supermercado Carrefour',              cat_super,     hoy - interval '1 month'  + interval '15 days', 'manual'),
  (acc_bna,   -4500,  'Luz y gas',                           cat_servicios, hoy - interval '1 month'  + interval '16 days', 'manual'),
  (acc_mp,   -18500,  'Pantalones y remeras',                cat_ropa,      hoy - interval '1 month'  + interval '18 days', 'manual'),
  (acc_mp,    -5900,  'Almuerzos semana',                    cat_comida,    hoy - interval '1 month'  + interval '20 days', 'manual'),
  (acc_cash,  -3200,  'Taxi noche',                          cat_transporte,hoy - interval '1 month'  + interval '22 days', 'manual'),
  (acc_mp,    -7600,  'Libros y papelería',                  cat_otros,     hoy - interval '1 month'  + interval '24 days', 'manual');

END $$;
