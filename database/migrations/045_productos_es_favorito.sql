-- Migration: 045_productos_es_favorito.sql
-- Adds es_favorito column to productos table
ALTER TABLE productos ADD COLUMN es_favorito BOOLEAN DEFAULT FALSE;
