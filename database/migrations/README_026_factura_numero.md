# Migración 026: Número de factura por restaurante (producción)

## Qué hace

- Añade la columna `numero` a `facturas`.
- **Facturas ya existentes**: se renumeran a **1, 2, 3, 4…** por restaurante (orden por `id`). Así la lista deja de verse con huecos (22, 21, 20, 15, 10, 8, 7) y pasa a verse en orden: **1, 2, 3, 4, 5, 6, 7**. La siguiente factura que emitan será la #8.
- **Facturas nuevas**: cada restaurante sigue su propia secuencia (`MAX(numero) + 1` por tenant).

## Pasos recomendados en producción

1. **Respaldo**  
   Hacer backup de la base de datos antes de ejecutar la migración:
   ```bash
   mysqldump -u USUARIO -p restaurante > backup_antes_026_YYYYMMDD.sql
   ```

2. **Ventana de mantenimiento (opcional)**  
   Si quieres evitar facturas creadas justo durante el cambio, programa la migración en un momento de poco uso o avisa a los usuarios.

3. **Ejecutar la migración**  
   Desde la carpeta del proyecto o con la ruta correcta a la migración:
   ```bash
   mysql -u USUARIO -p restaurante < database/migrations/026_factura_numero_por_tenant.sql
   ```
   O desde el cliente MySQL:
   ```sql
   SOURCE /ruta/completa/database/migrations/026_factura_numero_por_tenant.sql
   ```

4. **Comprobar**  
   - No debe haber filas con `numero` NULL:
     ```sql
     SELECT COUNT(*) FROM facturas WHERE numero IS NULL;
     -- Debe ser 0
     ```
   - Por tenant, los números no deben repetirse:
     ```sql
     SELECT tenant_id, numero, COUNT(*) 
     FROM facturas 
     GROUP BY tenant_id, numero 
     HAVING COUNT(*) > 1;
     -- Sin filas
     ```

5. **Desplegar código**  
   Subir/desplegar la nueva versión de la aplicación (repositorio y rutas que usan `numero`).

## Si algo sale mal

- Restaurar el backup:
  ```bash
  mysql -u USUARIO -p restaurante < backup_antes_026_YYYYMMDD.sql
  ```
- Si solo llegaste a ejecutar el `ALTER TABLE ... ADD COLUMN` y la tabla tiene ya la columna `numero` con NULLs, puedes completar a mano:
  ```sql
  UPDATE facturas SET numero = id WHERE numero IS NULL;
  ALTER TABLE facturas MODIFY COLUMN numero INT NOT NULL;
  ALTER TABLE facturas ADD UNIQUE KEY unique_factura_tenant_numero (tenant_id, numero);
  ```

## Compatibilidad

- La migración usa solo `UPDATE facturas SET numero = id`, sin funciones como `ROW_NUMBER()`.  
- Válida para **MySQL 5.7** y **MySQL 8+** (y MariaDB equivalente).
