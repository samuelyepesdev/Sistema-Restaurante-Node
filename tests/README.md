# Tests del proyecto

Carpeta de pruebas unitarias e de integración, con cobertura de código.

## Estructura

```
tests/
├── setup.js                 # Configuración global Jest (env, timeout)
├── README.md                # Este archivo
├── unit/                     # Tests unitarios (lógica aislada, mocks)
│   ├── utils/
│   │   ├── constants.test.js
│   │   └── planPermissions.test.js
│   ├── middleware/
│   │   ├── auth.test.js
│   │   ├── planFeature.test.js
│   │   └── tenant.test.js
│   └── services/
│       ├── AuthService.test.js   # hasRole, hasPermission
│       ├── FacturaService.test.js
│       └── PlanService.test.js
└── integration/              # Tests de integración (app Express, rutas)
    └── api/
        └── app.test.js
```

## Comandos

| Comando | Descripción |
|--------|-------------|
| `npm test` | Ejecuta todos los tests una vez |
| `npm run test:watch` | Ejecuta tests en modo watch (re-ejecuta al guardar) |
| `npm run test:coverage` | Ejecuta tests y genera reporte de cobertura |

## Cobertura

Tras `npm run test:coverage`:

- En consola se muestra un resumen por archivo (líneas, funciones, ramas).
- Se genera la carpeta **`coverage/`** en la raíz del proyecto:
  - `coverage/lcov-report/index.html`: reporte HTML (abrir en el navegador para ver qué líneas están cubiertas).
  - La carpeta `coverage/` está en `.gitignore` y no se sube al repositorio.

Se mide cobertura sobre:

- `services/**/*.js`
- `repositories/**/*.js`
- `middleware/**/*.js`
- `utils/**/*.js`

Los umbrales mínimos en `jest.config.js` están en 0; puedes subirlos cuando tengas más tests (por ejemplo `lines: 50`).

## Entorno de pruebas

- Opcional: crear **`.env.test`** con variables para pruebas (por ejemplo otra base de datos). Si no existe, se usa `.env`.
- Los tests unitarios **no usan base de datos**: los repositorios se mockean con `jest.mock()`.
- Los tests de integración que llaman a la app Express pueden tocar rutas que usan BD; para evitarlo se pueden mockear `config/database` o usar una BD de pruebas en `.env.test`.

## Añadir más tests

1. **Unitario:** crea `tests/unit/<carpeta>/<nombre>.test.js` y mockea las dependencias (repos, BD, etc.).
2. **Integración:** crea `tests/integration/api/<nombre>.test.js` y usa `request(require('../../..').app)` (o el path correcto al `app` exportado).

Ejemplo de test unitario con mock:

```js
jest.mock('../../../repositories/MiRepository');
const MiService = require('../../../services/MiService');
const MiRepository = require('../../../repositories/MiRepository');

test('MiService.metodo llama al repository', async () => {
  MiRepository.find.mockResolvedValue([{ id: 1 }]);
  const result = await MiService.metodo(1);
  expect(MiRepository.find).toHaveBeenCalledWith(1);
  expect(result).toHaveLength(1);
});
```
