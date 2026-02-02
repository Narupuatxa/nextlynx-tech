const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({ origin: '*' }));  // ← permite todos os domínios (Vercel + localhost)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// SUPABASE - usa variáveis de ambiente
// =============================================
const supabaseUrl = process.env.SUPABASE_URL || 'https://qgbblhwojxuknlhkeusy.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmJsaHdvanh1a25saGtldXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTc1NjYsImV4cCI6MjA3ODUzMzU2Nn0.YpI8xjMqpwJSjHnrvOHfABnyMeIfxsLGJNeXrFoB3p0';

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não definidas!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================
// MULTER (UPLOADS)
// =============================================
fs.mkdirSync(path.join(__dirname, 'tmp'), { recursive: true });
const upload = multer({ dest: path.join(__dirname, 'tmp/') });

// =============================================
// ROTAS (mantidas iguais, mas com path correto)
// =============================================

// 1. LISTAR SERVIÇOS
app.get('/servicos', async (req, res) => {
  const { data: servicos, error } = await supabase
    .from('servicos')
    .select('*')
    .order('categoria', { ascending: true })
    .order('titulo', { ascending: true });

  if (error) {
    console.error('Erro ao listar serviços:', error);
    return res.status(400).json({ error: error.message });
  }
  res.json(servicos);
});

// 2. ENVIO DE PEDIDOS
app.post('/submit', async (req, res) => {
  const { nome, email, telefone, mensagem = '', servico_id } = req.body;

  if (!nome || !email || !servico_id) {
    return res.status(400).json({ error: 'Nome, email e serviço são obrigatórios' });
  }

  const { data, error } = await supabase
    .from('pedidos')
    .insert([{ nome, email, telefone, mensagem, servico_id, status: 'Pendente' }]);

  if (error) {
    console.error('Erro no insert pedidos:', error);
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true, message: 'Solicitação enviada com sucesso!' });
});

// ... (mantém todas as outras rotas iguais: /subscribe, /api/pedidos, PUT/DELETE pedidos, /api/portfolio, etc.)

// Página Admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// =============================================
// EXPORTA PARA VERCEL (serverless)
// =============================================
module.exports = app;

// Para rodar localmente
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`NextLynx Tech rodando em http://localhost:${port}`);
  });
}