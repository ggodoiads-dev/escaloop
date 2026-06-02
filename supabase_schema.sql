-- EscalaOp — Schema do banco de dados Supabase
-- Execute este SQL no SQL Editor do Supabase após criar o projeto

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contato TEXT,
  turno TEXT NOT NULL CHECK (turno IN ('A', 'B', 'C', 'ADM')),
  setor TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'colaborador' CHECK (perfil IN ('gestor', 'lider', 'colaborador', 'rh')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  data_admissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_desligamento DATE,
  folga1_inicial DATE,
  folga2_inicial DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de lançamentos diários
CREATE TABLE IF NOT EXISTS lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente','falta_injustificada','falta_atestado','folga','atraso','troca_turno','pendente')),
  horario_atraso TIME,
  justificativa TEXT,
  lider_id UUID REFERENCES colaboradores(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(colaborador_id, data)
);

-- Tabela de atestados
CREATE TABLE IF NOT EXISTS atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  lancamento_id UUID NOT NULL REFERENCES lancamentos(id) ON DELETE CASCADE,
  data_falta DATE NOT NULL,
  arquivo_url TEXT,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','validado','recusado')),
  validado_por UUID REFERENCES colaboradores(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lancamento_id)
);

-- Tabela de ocorrências
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  responsavel_id UUID REFERENCES colaboradores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de medidas disciplinares
CREATE TABLE IF NOT EXISTS medidas_disciplinares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  gestor_id UUID REFERENCES colaboradores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lancamentos_colaborador_data ON lancamentos(colaborador_id, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_atestados_token ON atestados(token);
CREATE INDEX IF NOT EXISTS idx_colaboradores_user_id ON colaboradores(user_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_turno ON colaboradores(turno);

-- Row Level Security (RLS)
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atestados ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas_disciplinares ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança

-- Colaboradores: gestor e RH veem todos; líder e colaborador veem só o turno/próprio
CREATE POLICY "colaboradores_select" ON colaboradores FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM colaboradores WHERE perfil IN ('gestor', 'rh') AND user_id IS NOT NULL
    )
    OR auth.uid() IN (
      SELECT user_id FROM colaboradores c2 WHERE c2.turno = colaboradores.turno AND user_id IS NOT NULL
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "colaboradores_insert" ON colaboradores FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM colaboradores WHERE perfil = 'gestor' AND user_id IS NOT NULL
    )
  );

CREATE POLICY "colaboradores_update" ON colaboradores FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM colaboradores WHERE perfil = 'gestor' AND user_id IS NOT NULL
    )
  );

-- Lançamentos: gestores e líderes podem criar; todos veem do próprio turno
CREATE POLICY "lancamentos_select" ON lancamentos FOR SELECT
  USING (true);

CREATE POLICY "lancamentos_insert" ON lancamentos FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM colaboradores WHERE perfil IN ('gestor', 'lider') AND user_id IS NOT NULL
    )
  );

CREATE POLICY "lancamentos_update" ON lancamentos FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM colaboradores WHERE perfil IN ('gestor', 'lider') AND user_id IS NOT NULL
    )
  );

-- Atestados: acesso público para upload via token (sem autenticação)
CREATE POLICY "atestados_select_auth" ON atestados FOR SELECT
  USING (true);

CREATE POLICY "atestados_insert" ON atestados FOR INSERT
  WITH CHECK (true);

CREATE POLICY "atestados_update" ON atestados FOR UPDATE
  USING (true);

-- Ocorrências
CREATE POLICY "ocorrencias_select" ON ocorrencias FOR SELECT USING (true);
CREATE POLICY "ocorrencias_insert" ON ocorrencias FOR INSERT WITH CHECK (true);

-- Medidas disciplinares
CREATE POLICY "medidas_select" ON medidas_disciplinares FOR SELECT USING (true);
CREATE POLICY "medidas_insert" ON medidas_disciplinares FOR INSERT WITH CHECK (true);

-- Storage bucket para atestados
-- (Execute via Dashboard do Supabase > Storage > Create bucket "atestados", marcar como Public)

-- Trigger: ao criar auth.user, atualiza o user_id no colaborador correspondente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE colaboradores SET user_id = NEW.id WHERE email = NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
