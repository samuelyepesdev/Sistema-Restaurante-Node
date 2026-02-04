-- Costos adicionales por receta (repostería): mano de obra, desgaste, servicios, empaque, envío.
-- Permite guardar en cada receta: horas_trabajo, valor_hora, desgaste_pct, servicios, empaque, envio.

USE restaurante;

ALTER TABLE recetas ADD COLUMN costos_adicionales JSON NULL AFTER porciones;
