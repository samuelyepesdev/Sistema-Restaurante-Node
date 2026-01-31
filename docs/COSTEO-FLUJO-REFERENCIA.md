# Flujo de costeo (referencia: COSTES-PLATO-RESTAURANTE.xlsx)

Este documento resume la lógica del archivo Excel de referencia para alinear el módulo de costeo.

## Resumen rápido (qué hace cada cosa)

| Paso | Qué es | Dónde se configura / usa |
|------|--------|---------------------------|
| **Insumos** | Materia prima con **precio unitario** (por kg, L, UND…) | Tab Insumos: código, nombre, unidad de compra, costo unitario |
| **Recetas** | Por producto: porciones + lista de ingredientes (insumo, cantidad, unidad) | Tab Recetas: crear/editar receta, agregar ingredientes |
| **Costo materia prima por porción** | Suma (cantidad × precio unitario) de cada ingrediente ÷ porciones | Se calcula solo con los datos de insumos y receta |
| **Costos indirectos** | Merma o gastos del local repartidos | Config: método (porcentaje / costo fijo / factor) |
| **Costo total porción** | Costo materia prima + costo indirecto | Resultado del cálculo |
| **Precio sugerido** | Costo total ÷ (1 − Margen) | Config: Margen de ganancia esperado (%) |
| **Alertas** | Productos con margen bajo o precio bajo costo | Config: Margen mínimo para alerta (%) |

## 1. Coste técnico (ingredientes del plato)

- **Columnas**: Ingredientes, Cantidad, Unidad de medida, Presentación de compra, Precio de compra, Precio por porción.
- **Fórmula**:  
  `Costo por porción = (Cantidad usada × Precio compra) / Cantidad total del empaque`
- **Ejemplo (pollo)**: Compra 1 kg → $3.5; uso 300 g → `300 × 3.5 / 1000 = 1.05`
- **Resultado**: Costo total de ingredientes del plato (ej: 2.809).

En el sistema: el insumo tiene **unidad de compra** y **costo unitario** (precio por esa unidad). En la receta se usa **cantidad** y **unidad** (la del insumo). El costo del ingrediente = cantidad convertida a unidad de compra × costo unitario.

## 2. Costos totales del restaurante (indirectos mensuales)

- Alquiler, Personal, Agua, Luz, Impuestos, Otros.
- **Total mensual** (ej: 7.670).

En el sistema: configuración “Costo fijo mensual” y/o “Porcentaje merma” según el método elegido.

## 3. Prorrateo por plato

- **Costo diario** = Costo mensual / Días de trabajo → `7.670 / 30 = 255.66`
- **Platos vendidos por día** (ej: 150).
- **Costo indirecto por plato** = Costo diario / Platos diarios → `255.66 / 150 = 1.704`

En el sistema: método “costo fijo” → costo_fijo_mensual / platos_estimados_mes (o por día si se implementa).

## 4. Costo total del plato

- **Costo total** = Costo ingredientes + Costo restaurante por plato  
  Ej: `2.809 + 1.704 = 4.513`

## 5. Margen de utilidad

- **Margen deseado** (ej: 10%).
- **Utilidad** = Costo total × Margen → `4.513 × 0.10 = 0.451`
- **Precio antes de impuestos** = Costo total + Utilidad → `4.513 + 0.451 = 4.964`

En el sistema: Precio sugerido = Costo total / (1 − Margen). Ej: margen 65% → precio = costo / 0.35.

## 6. Impuesto a la venta

- **Impuesto** (ej: 15%) = Precio base × 15% → `4.964 × 0.15 = 0.744`
- **Precio final** = Precio base + Impuesto → `4.964 + 0.744 = 5.709`

Pendiente en el sistema: campo opcional “% IVA” y precio final con impuesto para mostrar al cliente.

## Resumen lógico

1. Costear cada ingrediente (cantidad × precio unitario en unidad de compra).
2. Sumar costo de la receta (por porción).
3. Incluir costos fijos mensuales (configuración).
4. Prorratear por días y platos (costo indirecto por plato).
5. Costo total porción = costo ingredientes + costo indirecto porción.
6. Aplicar margen de ganancia → precio base.
7. (Opcional) Aplicar impuestos → precio final de venta.
