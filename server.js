const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({ origin: '*' }));  // ← Alterado para permitir todos (Render + localhost)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve index.html na raiz (importante para Render)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// SUPABASE
// =============================================
const supabaseUrl = 'https://qgbblhwojxuknlhkeusy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmJsaHdvanh1a25saGtldXN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTc1NjYsImV4cCI6MjA3ODUzMzU2Nn0.YpI8xjMqpwJSjHnrvOHfABnyMeIfxsLGJNeXrFoB3p0';
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================
// MULTER (UPLOADS)
// =============================================
fs.mkdirSync('tmp', { recursive: true });
const upload = multer({ dest: 'tmp/' });

// =============================================
// ROTAS
// =============================================

// 1. LISTAR SERVIÇOS (para dropdown)
app.get('/api/servicos', async (req, res) => {
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

// 2. ENVIO DE PEDIDOS (contactos.html, servicos.html, etc.)
app.post('/submit', async (req, res) => {
  const { nome, email, telefone, mensagem = '', servico_id } = req.body;

  // Validação obrigatória
  if (!nome || !email || !servico_id) {
    return res.status(400).json({ 
      error: 'Nome, email e serviço são obrigatórios' 
    });
  }

  const { data, error } = await supabase
    .from('pedidos')
    .insert([{ 
      nome, 
      email, 
      telefone, 
      mensagem, 
      servico_id, 
      status: 'Pendente' 
    }]);

  if (error) {
    console.error('Erro no insert pedidos:', error);
    return res.status(400).json({ error: error.message });
  }

  console.log('Pedido inserido com sucesso:', { nome, email, servico_id });
  res.json({ success: true, message: 'Solicitação enviada com sucesso!' });
});

// 3. NEWSLETTER
app.post('/subscribe', async (req, res) => {
  const { nome = '', email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }

  const { data, error } = await supabase
    .from('emails')
    .insert([{ nome, email }]);

  if (error) {
    console.error('Erro no insert emails:', error);
    return res.status(400).json({ error: error.message });
  }

  console.log('Email subscrito:', { email });
  res.json({ success: true, message: 'Subscrito com sucesso!' });
});

// =============================================
// ADMIN: PEDIDOS (COM NOME DO SERVIÇO E CATEGORIA)
// =============================================
app.get('/api/pedidos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(`
        id,
        nome,
        email,
        telefone,
        mensagem,
        status,
        created_at,
        servico_id,
        servicos (
          id,
          titulo,
          categoria
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Formata com nome do serviço e categoria
    const pedidosFormatados = data.map(p => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      telefone: p.telefone || '—',
      mensagem: p.mensagem || '—',
      status: p.status,
      created_at: p.created_at,
      servico_nome: p.servicos?.titulo || 'Serviço removido',
      servico_categoria: p.servicos?.categoria || '—'
    }));

    res.json(pedidosFormatados);
  } catch (err) {
    console.error('Erro ao carregar pedidos:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// ATUALIZAR STATUS
app.put('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const { error } = await supabase
      .from('pedidos')
      .update({ status })
      .eq('id', id);

    if (error) throw error;

    console.log('Status atualizado:', { id, status });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    res.status(400).json({ error: err.message });
  }
});

// EXCLUIR PEDIDO DO SUPABASE
app.delete('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('pedidos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('Pedido excluído do Supabase:', id);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir do Supabase:', err);
    res.status(400).json({ error: err.message });
  }
});

// =============================================
// OUTRAS TABELAS (portfolio, blog, etc.)
// =============================================
app.get('/api/portfolio', async (req, res) => {
  const { data, error } = await supabase.from('portfolio').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.get('/api/blog_posts', async (req, res) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('data', { ascending: false });
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.get('/api/testemunhos', async (req, res) => {
  const { data, error } = await supabase.from('testemunhos').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.get('/api/faq', async (req, res) => {
  const { data, error } = await supabase.from('faq').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.get('/api/promocoes', async (req, res) => {
  const { data, error } = await supabase.from('promocoes').select('*');
  if (error) return res.status(400).json(error);
  res.json(data);
});

app.get('/api/sobre', async (req, res) => {
  const { data, error } = await supabase.from('sobre').select('*').limit(1);
  if (error) return res.status(400).json(error);
  res.json(data[0] || {});
});

// =============================================
// ADMIN LOGIN
// =============================================
app.post('/api/admin-login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, session: data.session });
});

// Página Admin
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// =============================================
// INICIA SERVIDOR
// =============================================
app.listen(port, () => {
  console.log(`NextLynx Tech rodando em http://localhost:${port}`);
});