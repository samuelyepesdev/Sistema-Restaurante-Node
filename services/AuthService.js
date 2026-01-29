const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_CONFIG, ROLES } = require('../utils/constants');

// Authentication service
// Handles user authentication, token generation and password management

/**
 * Authenticate user with username and password
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} User object with token or null if invalid
 */
async function authenticateUser(username, password) {
    try {
        // Get user with role and permissions (incl. tenant_id for multi-tenancy)
        const [users] = await db.query(`
            SELECT u.*, r.nombre AS rol_nombre, r.descripcion AS rol_descripcion
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.username = ? AND u.activo = TRUE
        `, [username]);

        if (users.length === 0) {
            return { success: false, message: 'Usuario o contraseña incorrectos' };
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return { success: false, message: 'Usuario o contraseña incorrectos' };
        }

        // Get user permissions
        const [permissions] = await db.query(`
            SELECT p.nombre
            FROM permisos p
            INNER JOIN rol_permisos rp ON p.id = rp.permiso_id
            WHERE rp.rol_id = ?
        `, [user.rol_id]);

        const userPermissions = permissions.map(p => p.nombre);

        // Generate JWT token (include tenant_id for multi-tenancy)
        const token = generateToken({
            id: user.id,
            username: user.username,
            rol: user.rol_nombre,
            permisos: userPermissions,
            tenant_id: user.tenant_id
        });

        // Return user data without password
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                nombre_completo: user.nombre_completo,
                rol: user.rol_nombre,
                permisos: userPermissions,
                tenant_id: user.tenant_id
            },
            token
        };
    } catch (error) {
        console.error('Error in authenticateUser:', error);
        throw new Error('Error al autenticar usuario');
    }
}

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_CONFIG.SECRET, {
        expiresIn: JWT_CONFIG.EXPIRES_IN
    });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_CONFIG.SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Get user by ID with role and permissions
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserById(userId) {
    try {
        const [users] = await db.query(`
            SELECT u.id, u.username, u.email, u.nombre_completo, u.rol_id, u.tenant_id,
                   r.nombre AS rol_nombre, r.descripcion AS rol_descripcion
            FROM usuarios u
            INNER JOIN roles r ON u.rol_id = r.id
            WHERE u.id = ? AND u.activo = TRUE
        `, [userId]);

        if (users.length === 0) {
            return null;
        }

        const user = users[0];

        // Get permissions
        const [permissions] = await db.query(`
            SELECT p.nombre
            FROM permisos p
            INNER JOIN rol_permisos rp ON p.id = rp.permiso_id
            WHERE rp.rol_id = ?
        `, [user.rol_id]);

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            nombre_completo: user.nombre_completo,
            rol: user.rol_nombre,
            permisos: permissions.map(p => p.nombre),
            tenant_id: user.tenant_id
        };
    } catch (error) {
        console.error('Error in getUserById:', error);
        return null;
    }
}

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Check if user has permission
 * @param {Array<string>} userPermissions - User permissions array
 * @param {string} requiredPermission - Required permission
 * @returns {boolean} True if user has permission
 */
function hasPermission(userPermissions, requiredPermission) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
        return false;
    }
    return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has any of the required roles
 * @param {string} userRole - User role
 * @param {Array<string>} requiredRoles - Required roles array
 * @returns {boolean} True if user has one of the required roles
 */
function hasRole(userRole, requiredRoles) {
    if (!userRole || !requiredRoles || !Array.isArray(requiredRoles)) {
        return false;
    }
    const roleLower = String(userRole).toLowerCase();
    return requiredRoles.some(r => String(r).toLowerCase() === roleLower);
}

module.exports = {
    authenticateUser,
    generateToken,
    verifyToken,
    getUserById,
    hashPassword,
    hasPermission,
    hasRole
};

