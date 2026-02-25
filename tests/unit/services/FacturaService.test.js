/**
 * Tests unitarios para FacturaService (repository mockeado)
 */

const FacturaService = require('../../../services/FacturaService');

jest.mock('../../../repositories/FacturaRepository', () => ({
  createWithDetails: jest.fn(),
  findByIdWithClient: jest.fn(),
  getDetailsByFacturaId: jest.fn(),
  getDetailsForAPI: jest.fn()
}));

const FacturaRepository = require('../../../repositories/FacturaRepository');

describe('FacturaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const tenantId = 1;
    const facturaValida = {
      cliente_id: 10,
      total: 50000,
      forma_pago: 'efectivo',
      productos: [
        { producto_id: 1, cantidad: 2, precio: 10000, unidad: 'UND', subtotal: 20000 }
      ]
    };

    it('lanza "Datos incompletos" si falta cliente_id', async () => {
      await expect(
        FacturaService.create(tenantId, { ...facturaValida, cliente_id: null })
      ).rejects.toThrow('Datos incompletos');

      await expect(
        FacturaService.create(tenantId, { ...facturaValida, cliente_id: '' })
      ).rejects.toThrow('Datos incompletos');

      expect(FacturaRepository.createWithDetails).not.toHaveBeenCalled();
    });

    it('lanza "Datos incompletos" si productos está vacío o no existe', async () => {
      await expect(
        FacturaService.create(tenantId, { ...facturaValida, productos: [] })
      ).rejects.toThrow('Datos incompletos');

      await expect(
        FacturaService.create(tenantId, { cliente_id: 10, total: 100 })
      ).rejects.toThrow('Datos incompletos');

      expect(FacturaRepository.createWithDetails).not.toHaveBeenCalled();
    });

    it('llama al repository y devuelve { id } con datos válidos', async () => {
      FacturaRepository.createWithDetails.mockResolvedValue({ insertId: 99 });

      const result = await FacturaService.create(tenantId, facturaValida);

      expect(FacturaRepository.createWithDetails).toHaveBeenCalledTimes(1);
      expect(FacturaRepository.createWithDetails).toHaveBeenCalledWith(tenantId, {
        cliente_id: facturaValida.cliente_id,
        total: facturaValida.total,
        forma_pago: facturaValida.forma_pago,
        productos: facturaValida.productos,
        evento_id: null
      });
      expect(result).toEqual({ id: 99 });
    });

    it('pasa evento_id cuando viene en los datos', async () => {
      FacturaRepository.createWithDetails.mockResolvedValue({ insertId: 1 });

      await FacturaService.create(tenantId, { ...facturaValida, evento_id: 5 });

      expect(FacturaRepository.createWithDetails).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({ evento_id: 5 })
      );
    });
  });

  describe('getByIdForPrint', () => {
    const tenantId = 1;
    const facturaId = 10;

    it('lanza "Factura no encontrada" si el repository devuelve null', async () => {
      FacturaRepository.findByIdWithClient.mockResolvedValue(null);

      await expect(FacturaService.getByIdForPrint(facturaId, tenantId)).rejects.toThrow(
        'Factura no encontrada'
      );

      expect(FacturaRepository.findByIdWithClient).toHaveBeenCalledWith(facturaId, tenantId);
    });

    it('lanza error si no hay detalles', async () => {
      FacturaRepository.findByIdWithClient.mockResolvedValue({ id: facturaId });
      FacturaRepository.getDetailsByFacturaId.mockResolvedValue([]);

      await expect(FacturaService.getByIdForPrint(facturaId, tenantId)).rejects.toThrow(
        'No se encontraron detalles de la factura'
      );
    });

    it('devuelve { factura, detalles } cuando hay datos', async () => {
      const factura = { id: facturaId, cliente_nombre: 'Test' };
      const detalles = [{ producto_nombre: 'Café', cantidad: 1, subtotal: 5000 }];
      FacturaRepository.findByIdWithClient.mockResolvedValue(factura);
      FacturaRepository.getDetailsByFacturaId.mockResolvedValue(detalles);

      const result = await FacturaService.getByIdForPrint(facturaId, tenantId);

      expect(result).toEqual({ factura, detalles });
    });
  });

  describe('getDetails', () => {
    const tenantId = 1;
    const facturaId = 10;

    it('lanza "Factura no encontrada" si no existe', async () => {
      FacturaRepository.getDetailsForAPI.mockResolvedValue(null);

      await expect(FacturaService.getDetails(facturaId, tenantId)).rejects.toThrow(
        'Factura no encontrada'
      );
    });

    it('devuelve los detalles cuando existen', async () => {
      const details = { factura: { id: facturaId }, cliente: {}, productos: [] };
      FacturaRepository.getDetailsForAPI.mockResolvedValue(details);

      const result = await FacturaService.getDetails(facturaId, tenantId);

      expect(result).toEqual(details);
    });
  });
});
