require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');
const authRoutes = require('./routes/authRoutes');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

const pedidosRoutes = require('./routes/pedidosRoutes');

app.use(bodyParser.json());
app.use('/api/pedidos', pedidosRoutes);
app.use(cors());
app.use(express.static('public'));
app.use('/api/auth', authRoutes);
app.use(session({
    secret: 'clave-super-secreta',
    resave: false,
    saveUninitialized: false
}));


// Registro de usuario
app.post('/api/register', async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const userExists = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)',
            [nombre, email, hashedPassword]
        );


        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// Inicio de sesión
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (!result || result.rows.length === 0) {
            return res.status(401).json({ message: 'Correo no registrado' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ message: 'Contraseña incorrecta' });
        }

        res.status(200).json({ message: 'Inicio de sesión exitoso', user });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


// Obtener todos los productos en admin
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error al obtener productos' });
    }
});

// Agregar nuevo producto en admin
app.post('/api/productos', async (req, res) => {
    const { nombre, descripcion, precio, imagen, userId } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO productos (nombre, descripcion, precio, imagen) VALUES ($1, $2, $3, $4)',
            [nombre, descripcion, precio, imagen]
        );

        res.status(201).json({ message: 'Producto agregado con éxito' });
    } catch (err) {
        res.status(500).json({ message: 'Error al agregar producto' });
    }
});

// Eliminar producto en admin
app.delete('/api/productos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM productos WHERE id = $1', [id]);
        res.json({ message: 'Producto eliminado con éxito' });
    } catch (err) {
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
});

// Editar producto en admin
app.put('/api/productos/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, precio, imagen } = req.body;

    try {
        await pool.query(
            'UPDATE productos SET nombre = $1, descripcion = $2, precio = $3, imagen = $4 WHERE id = $5',
            [nombre, descripcion, precio, imagen, id]
        );
        res.json({ message: 'Producto actualizado con éxito' });
    } catch (err) {
        res.status(500).json({ message: 'Error al actualizar producto' });
    }
});

//agrgar producto al carrito
app.post('/api/carrito/agregar', async (req, res) => {
    const { producto_id, cantidad, user_id } = req.body;

    try {
        await pool.query(
            'INSERT INTO carrito (producto_id, cantidad, user_id) VALUES ($1, $2, $3)',
            [producto_id, cantidad, user_id]
        );
        res.status(200).json({ message: 'Producto agregado al carrito' });
    } catch (error) {
        console.error('Error al agregar al carrito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener carrito de un usuario
app.get('/api/carrito/:user_id', async (req, res) => {
    const { user_id } = req.params;
    try {
        const result = await pool.query(`
        SELECT c.producto_id AS id, p.nombre, p.precio, p.imagen, c.cantidad
        FROM carrito c
        JOIN productos p ON c.producto_id = p.id
        WHERE c.user_id = $1
      `, [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener carrito:', error);
        res.status(500).json({ message: 'Error al obtener carrito' });
    }
});

// Actualizar cantidad de producto
app.put('/api/carrito/actualizar', async (req, res) => {
    const { user_id, producto_id, cantidad } = req.body;
    try {
        await pool.query(`
        UPDATE carrito
        SET cantidad = $1
        WHERE user_id = $2 AND producto_id = $3
      `, [cantidad, user_id, producto_id]);
        res.json({ message: 'Cantidad actualizada' });
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        res.status(500).json({ message: 'Error al actualizar cantidad' });
    }
});

// Eliminar un producto del carrito
app.delete('/api/carrito/:user_id/:producto_id', async (req, res) => {
    const { user_id, producto_id } = req.params;
    try {
        await pool.query(`
        DELETE FROM carrito
        WHERE user_id = $1 AND producto_id = $2
      `, [user_id, producto_id]);
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ message: 'Error al eliminar producto' });
    }
});

// Vaciar carrito de un usuario
app.delete('/api/carrito/vaciar/:user_id', async (req, res) => {
    const { user_id } = req.params;
    try {
        await pool.query(`
        DELETE FROM carrito
        WHERE user_id = $1
      `, [user_id]);
        res.json({ message: 'Carrito vaciado' });
    } catch (error) {
        console.error('Error al vaciar carrito:', error);
        res.status(500).json({ message: 'Error al vaciar carrito' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
