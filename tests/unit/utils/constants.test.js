/**
 * Tests unitarios para utils/constants.js
 */

const {
  ROLES,
  PERMISSIONS,
  ESTADO_MESA,
  ESTADO_PEDIDO,
  FORMA_PAGO,
  UNIDAD_MEDIDA,
  JWT_CONFIG
} = require('../../../utils/constants');

describe('utils/constants', () => {
  describe('ROLES', () => {
    it('define los roles esperados', () => {
      expect(ROLES.SUPERADMIN).toBe('superadmin');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.MESERO).toBe('mesero');
      expect(ROLES.COCINERO).toBe('cocinero');
      expect(ROLES.CAJERO).toBe('cajero');
    });

    it('tiene exactamente 5 roles', () => {
      expect(Object.keys(ROLES).length).toBe(5);
    });
  });

  describe('PERMISSIONS', () => {
    it('incluye permisos de productos y clientes', () => {
      expect(PERMISSIONS.PRODUCTOS_VER).toBe('productos.ver');
      expect(PERMISSIONS.CLIENTES_CREAR).toBe('clientes.crear');
    });

    it('los valores tienen formato prefijo.accion', () => {
      Object.values(PERMISSIONS).forEach((val) => {
        expect(val).toMatch(/^[a-z_]+\.[a-z_]+$/);
      });
    });
  });

  describe('ESTADO_MESA', () => {
    it('define estados de mesa', () => {
      expect(ESTADO_MESA.LIBRE).toBe('libre');
      expect(ESTADO_MESA.OCUPADA).toBe('ocupada');
    });
  });

  describe('ESTADO_PEDIDO', () => {
    it('incluye CERRADO y ABIERTO', () => {
      expect(ESTADO_PEDIDO.ABIERTO).toBe('abierto');
      expect(ESTADO_PEDIDO.CERRADO).toBe('cerrado');
    });
  });

  describe('FORMA_PAGO', () => {
    it('define efectivo y transferencia', () => {
      expect(FORMA_PAGO.EFECTIVO).toBe('efectivo');
      expect(FORMA_PAGO.TRANSFERENCIA).toBe('transferencia');
    });
  });

  describe('UNIDAD_MEDIDA', () => {
    it('define KG, UND, LB', () => {
      expect(UNIDAD_MEDIDA.KG).toBe('KG');
      expect(UNIDAD_MEDIDA.UND).toBe('UND');
      expect(UNIDAD_MEDIDA.LB).toBe('LB');
    });
  });

  describe('JWT_CONFIG', () => {
    it('tiene SECRET y EXPIRES_IN', () => {
      expect(JWT_CONFIG.SECRET).toBeDefined();
      expect(typeof JWT_CONFIG.SECRET).toBe('string');
      expect(JWT_CONFIG.EXPIRES_IN).toBeDefined();
      expect(JWT_CONFIG.COOKIE_NAME).toBe('auth_token');
    });
  });
});
