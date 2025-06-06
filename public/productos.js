document.addEventListener('DOMContentLoaded', () => {
  const categoriasContenedores = {
    belleza: document.getElementById('productos-belleza'),
    tecnologia: document.getElementById('productos-tecnologia'),
    hogar: document.getElementById('productos-hogar'),
    cocina: document.getElementById('productos-cocina'),
    fitness: document.getElementById('productos-fitness'),
  };

  fetch('/api/productos')
    .then(res => res.json())
    .then(productos => {
      // Limpiar los contenedores
      Object.values(categoriasContenedores).forEach(c => c.innerHTML = '');

      // Agrupar productos por categoría
      const productosPorCategoria = {};
      productos.forEach(p => {
        const categoria = p.categoria?.toLowerCase();
        if (!productosPorCategoria[categoria]) productosPorCategoria[categoria] = [];
        productosPorCategoria[categoria].push(p);
      });

      // Mostrar solo 6 productos y el enlace "Ver todos"
      Object.keys(categoriasContenedores).forEach(categoria => {
        const contenedor = categoriasContenedores[categoria];
        const productosCat = productosPorCategoria[categoria] || [];
        productosCat.slice(0, 6).forEach(p => {
          const card = document.createElement('div');
          card.classList.add('producto');
          card.innerHTML = `
            <img src="${p.imagen}" alt="${p.nombre}" width="200">
            <h3>${p.nombre}</h3>
            <p>${p.descripcion}</p>
            <p><strong>$${p.precio}</strong></p>
            <button class="btn" onclick="agregarAlCarrito(${p.id})">Añadir al carrito</button>
          `;
          contenedor.appendChild(card);
        });
        // Enlace "Ver todos"
        if (productosCat.length > 6) {
          const verTodos = document.createElement('a');
          verTodos.href = `categoria.html?cat=${categoria}`;
          verTodos.className = 'ver-todos';
          verTodos.textContent = 'Ver todos los productos';
          contenedor.appendChild(verTodos);
        }
      });
    })
    .catch(err => {
      console.error('Error al cargar productos:', err);
      Object.values(categoriasContenedores).forEach(c => {
        c.innerHTML = `<p>Error al cargar productos.</p>`;
      });
    });
});


function agregarAlCarrito(productoId) {
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    alert('Debes iniciar sesión o registrarte para agregar productos al carrito.');
    return;
  }

  fetch('/api/carrito/agregar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      producto_id: productoId,
      cantidad: 1,
      user_id: userId
    })
  })
    .then(res => res.json())
    .then(data => {
      alert('Producto agregado al carrito');
    })
    .catch(err => {
      console.error('Error al agregar al carrito:', err);
      alert('Hubo un problema al agregar el producto');
    });
}

document.getElementById('busquedaInput').addEventListener('input', (e) => {
  const valor = e.target.value.toLowerCase();
  const productos = document.querySelectorAll('.producto');

  productos.forEach(producto => {
    const nombre = producto.querySelector('h3').textContent.toLowerCase();
    producto.style.display = nombre.includes(valor) ? 'block' : 'none';
  });
});


