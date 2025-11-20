// Informações: JS para NextLynx Tech - Handling forms, partilhas, animações e admin com fetch Supabase
document.addEventListener('DOMContentLoaded', () => {
    // Forms Submit: Para contactos, orçamentos, newsletter (POST para /submit ou /subscribe)
    const forms = document.querySelectorAll('form[id^="contact"], .solicitar-form, #newsletter-form, #orcamento-form');
    forms.forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            const endpoint = form.id === 'newsletter-form' ? '/subscribe' : '/submit';
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                alert(result.message || 'Erro: ' + result.error);
                form.reset();
            } catch (err) {
                alert('Erro no envio: ' + err.message);
            }
        });
    });

    // Partilhas Sociais: WhatsApp e Facebook
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = window.location.href;
            const text = document.title;
            if (btn.dataset.platform === 'whatsapp') {
                window.open(`https://wa.me/258841234567?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
            } else if (btn.dataset.platform === 'facebook') {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            }
        });
    });

    // Animações Scroll: Intersection Observer para slide-up/fade
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    });
    document.querySelectorAll('.animate-on-scroll, .animate-slide-up, .animate-fade-in').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(el);
    });

    // Assets Dinâmicos: Carrega uploads do Supabase para serviços/portfolio
    if (document.querySelector('#servicos-page') || document.querySelector('#portfolio-page')) {
        ['Design Gráfico', 'Trabalhos Académicos', 'Serviços de Tecnologia'].forEach(tipo => {
            loadServiceAssets(tipo);
        });
    }
    async function loadServiceAssets(servico_tipo) {
        try {
            const res = await fetch(`/api/assets/${encodeURIComponent(servico_tipo)}`);
            const assets = await res.json();
            const containerId = `assets-${servico_tipo.toLowerCase().replace(/\s+/g, '-')}`;
            const container = document.getElementById(containerId) || document.getElementById(containerId + '-portfolio');
            if (container) {
                assets.forEach(a => {
                    let html = '';
                    if (a.tipo_ficheiro === 'imagem') {
                        html = `<img src="${a.ficheiro_url}" alt="${a.nome_ficheiro}" class="img-fluid mb-2 animate-fade-in" style="max-width: 200px;">`;
                    } else if (a.tipo_ficheiro === 'pdf') {
                        html = `<a href="${a.ficheiro_url}" class="btn btn-outline-primary me-2 btn-bounce" target="_blank">Baixar PDF: ${a.nome_ficheiro}</a>`;
                    } else if (a.tipo_ficheiro === 'video') {
                        html = `<video src="${a.ficheiro_url}" controls class="w-100 mb-2 animate-fade-in" style="max-height: 200px;"></video>`;
                    }
                    container.innerHTML += html;
                });
            }
        } catch (err) {
            console.error('Erro ao carregar assets:', err);
        }
    }

    // Lógica Admin: Se na página admin, carrega dados via fetch
    if (window.location.pathname.includes('admin')) {
        // Load Pedidos (com stats)
        async function loadPedidos() {
            const res = await fetch('/api/pedidos');
            const pedidos = await res.json();
            const tbody = document.querySelector('#tabela-pedidos tbody');
            if (tbody) tbody.innerHTML = '';
            let total = 0, countDesign = 0, countAcademicos = 0, countTech = 0;
            pedidos.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.id.slice(0,8)}...</td>
                    <td>${p.nome}</td>
                    <td>${p.email}</td>
                    <td>${p.servico}</td>
                    <td>${p.mensagem ? p.mensagem.slice(0,50) + '...' : ''}</td>
                    <td><span class="badge bg-${p.status === 'Aprovado' ? 'success' : p.status === 'Concluído' ? 'info' : 'warning'}">${p.status}</span></td>
                    <td>${new Date(p.created_at).toLocaleDateString('pt-PT')}</td>
                    <td>
                        <button class="btn btn-sm btn-info edit-btn" data-id="${p.id}" data-status="${p.status}">Editar</button>
                        <button class="btn btn-sm btn-success approve-btn" data-id="${p.id}">Aprovar</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${p.id}">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
                total++;
                if (p.servico === 'Design Gráfico') countDesign++;
                else if (p.servico === 'Trabalhos Académicos') countAcademicos++;
                else if (p.servico === 'Serviços de Tecnologia') countTech++;
            });
            document.getElementById('total-pedidos').textContent = total;
            document.getElementById('count-design').textContent = countDesign;
            document.getElementById('count-academicos').textContent = countAcademicos;
            document.getElementById('count-tech').textContent = countTech;
        }

        // Editar, Aprovar, Delete Pedidos
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-btn')) {
                document.getElementById('editId').value = e.target.dataset.id;
                document.getElementById('editStatus').value = e.target.dataset.status;
                new bootstrap.Modal(document.getElementById('editModal')).show();
            }
            if (e.target.id === 'saveEdit') {
                const id = document.getElementById('editId').value;
                const status = document.getElementById('editStatus').value;
                await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
                bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
                loadPedidos();
            }
            if (e.target.classList.contains('approve-btn')) {
                const id = e.target.dataset.id;
                await fetch(`/api/pedidos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Aprovado' }) });
                loadPedidos();
            }
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Eliminar este pedido?')) {
                    const id = e.target.dataset.id;
                    await fetch(`/api/pedidos/${id}`, { method: 'DELETE' });
                    loadPedidos();
                }
            }
        });

        // Load Emails e Delete
        async function loadEmails() {
            const res = await fetch('/api/emails');
            const emails = await res.json();
            const tbody = document.querySelector('#tabela-emails tbody');
            if (tbody) tbody.innerHTML = '';
            emails.forEach(e => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${e.id.slice(0,8)}...</td>
                    <td>${e.nome || 'N/A'}</td>
                    <td>${e.email}</td>
                    <td>${new Date(e.subscribed_at).toLocaleDateString('pt-PT')}</td>
                    <td><button class="btn btn-sm btn-danger delete-email-btn" data-id="${e.id}">Eliminar</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-email-btn')) {
                if (confirm('Eliminar este email?')) {
                    const id = e.target.dataset.id;
                    await fetch(`/api/emails/${id}`, { method: 'DELETE' });
                    loadEmails();
                }
            }
        });

        // Uploads Forms (multipart para /api/upload-asset)
        ['#upload-design', '#upload-academicos', '#upload-tech'].forEach(formId => {
            const form = document.querySelector(formId);
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    try {
                        const res = await fetch('/api/upload-asset', { method: 'POST', body: formData });
                        const result = await res.json();
                        if (result.success) {
                            alert('Upload concluído com sucesso! Ficheiro publicado.');
                            e.target.reset();
                            loadAssets();
                        } else {
                            alert('Erro: ' + (result.error?.message || 'Falha no upload'));
                        }
                    } catch (err) {
                        alert('Erro de rede: ' + err.message);
                    }
                });
            }
        });

        // Load e Delete Assets
        async function loadAssets() {
            const res = await fetch('/api/assets');
            const assets = await res.json();
            const tbody = document.querySelector('#tabela-assets tbody');
            if (tbody) tbody.innerHTML = '';
            assets.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${a.servico_tipo}</td>
                    <td>${a.tipo_ficheiro}</td>
                    <td>${a.nome_ficheiro}</td>
                    <td><a href="${a.ficheiro_url}" target="_blank" class="btn btn-sm btn-primary">Ver</a></td>
                    <td>${new Date(a.created_at).toLocaleDateString('pt-PT')}</td>
                    <td><button class="btn btn-sm btn-danger delete-asset-btn" data-id="${a.id}">Eliminar</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-asset-btn')) {
                if (confirm('Eliminar este ficheiro?')) {
                    const id = e.target.dataset.id;
                    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
                    loadAssets();
                }
            }
        });

        // Inicializa Admin
        loadPedidos();
        loadEmails();
        loadAssets();
    }
});