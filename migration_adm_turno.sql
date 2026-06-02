-- Migração: Adicionar turno ADM e tornar folgas opcionais
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Adicionar 'ADM' ao check de turno
ALTER TABLE colaboradores DROP CONSTRAINT IF EXISTS colaboradores_turno_check;
ALTER TABLE colaboradores ADD CONSTRAINT colaboradores_turno_check
  CHECK (turno IN ('A', 'B', 'C', 'ADM'));

-- 2. Tornar folgas opcionais (colaboradores ADM não têm ciclo 6x2)
ALTER TABLE colaboradores ALTER COLUMN folga1_inicial DROP NOT NULL;
ALTER TABLE colaboradores ALTER COLUMN folga2_inicial DROP NOT NULL;
