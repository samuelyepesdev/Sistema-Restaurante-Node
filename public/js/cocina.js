// JS de Cocina: muestra cola y permite avanzar estados
// Relacionado con: views/cocina.ejs, routes/cocina.js, routes/mesas.js

$(function(){
  // Permitir abrir directamente pestaña con ?tab=listos
  function activarTabDesdeQuery(){
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if(tab === 'listos'){
      const triggerEl = document.querySelector('#tabListos-tab');
      if(triggerEl){
        const tabObj = new bootstrap.Tab(triggerEl);
        tabObj.show();
      }
    }
  }
  async function cargarCola(){
    const resp = await fetch('/api/cocina/cola');
    const items = await resp.json();
    render(items);
  }

  function cardItem(it){
    const badge = it.estado === 'preparando' ? 'warning' : (it.estado === 'listo' ? 'success' : 'secondary');
    const headerLeft = `
      <div>
        <div class="small text-muted">Mesa ${it.mesa_numero}</div>
        <div class="producto">${it.producto_nombre}</div>
        ${it.nota ? `<div class="mt-1 fw-bold text-danger">${it.nota}</div>`: ''}
        <div class="small">${new Date(it.created_at).toLocaleTimeString()}</div>
      </div>`;
    const qtyBadge = `<span class="badge text-bg-dark cantidad-badge">${it.cantidad}</span>`;
    const actions = `
      <div class="mt-2 d-flex gap-2">
        ${it.estado==='enviado' ? `<button class="btn btn-sm btn-primary" data-action="prep" data-id="${it.id}"><i class="bi bi-play"></i> Preparar</button>`:''}
        ${it.estado==='preparando' ? `<button class="btn btn-sm btn-success" data-action="listo" data-id="${it.id}"><i class="bi bi-check2"></i> Listo</button>`:''}
        ${it.estado==='listo' ? `<button class="btn btn-sm btn-outline-dark" data-action="servido" data-id="${it.id}"><i class="bi bi-box-seam"></i> Recogido</button>`:''}
      </div>`;
    return `
      <div class="card card-cocina">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center">
            ${headerLeft}
            ${qtyBadge}
          </div>
          ${actions}
        </div>
      </div>`;
  }

  function render(items){
    const cola = $('#listaCola').empty();
    const listos = $('#listaListos').empty();
    // En cocina: muestra ítems no listos
    items.filter(it => it.estado !== 'listo').forEach(it => cola.append(cardItem(it)));

    // Listos: agrupar por mesa
    const porMesa = new Map();
    items.filter(it => it.estado === 'listo').forEach(it => {
      if(!porMesa.has(it.mesa_numero)) porMesa.set(it.mesa_numero, []);
      porMesa.get(it.mesa_numero).push(it);
    });
    [...porMesa.entries()].sort((a,b)=> String(a[0]).localeCompare(String(b[0]))).forEach(([mesa, arr]) => {
      listos.append(`<div class="mesa-heading">Mesa ${mesa}</div>`);
      arr.forEach(it => listos.append(`<div class="item-row">${cardItem(it)}</div>`));
    });
  }

  // Acciones
  $(document).on('click','[data-action="prep"]', async function(){
    const id = this.dataset.id;
    await fetch(`/api/cocina/item/${id}/estado`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ estado:'preparando' }) });
    await cargarCola();
  });
  $(document).on('click','[data-action="listo"]', async function(){
    const id = this.dataset.id;
    await fetch(`/api/cocina/item/${id}/estado`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ estado:'listo' }) });
    await cargarCola();
  });

  $(document).on('click','[data-action="servido"]', async function(){
    const id = this.dataset.id;
    await fetch(`/api/mesas/items/${id}/estado`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ estado:'servido' }) });
    await cargarCola();
  });

  // Auto-refresh
  cargarCola();
  setInterval(cargarCola, 5000);
  activarTabDesdeQuery();
});


