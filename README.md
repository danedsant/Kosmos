# Kosmos - Sistema de Gestion de Eventos Academicos

Sistema integral para la gestion de eventos academicos (congresos, seminarios, talleres, conferencias y cursos de extension) desarrollado con MongoDB, PHP Vanilla y JavaScript.

## Requisitos

| Componente | Version minima | Notas |
|------------|---------------|-------|
| [Laragon](https://laragon.org/download/) | Full o WAMP | Incluye PHP y Apache |
| PHP | 8.3 | Viene con Laragon |
| MongoDB Community Server | 6.0+ | Debe correr en `localhost:27017` |
| Extension `php_mongodb` | 2.5.2 | Ver instrucciones abajo |

## Instalacion

### 1. Instalar MongoDB

1. Descargar MongoDB Community Server desde https://www.mongodb.com/try/download/community
2. Instalar como servicio de Windows en el puerto por defecto (`27017`)
3. Verificar que este corriendo: abrir `services.msc` y buscar "MongoDB"

### 2. Configurar Laragon

1. Instalar Laragon y abrirlo
2. Copiar la carpeta del proyecto dentro de `C:\laragon\www\` (resultado: `C:\laragon\www\kosmos\`)
3. Iniciar servicios: boton **Start All**

### 3. Habilitar extension MongoDB en PHP

1. En Laragon, clic derecho > **PHP** > **dir: ext** (abre la carpeta de extensiones)
2. Descargar `php_mongodb.dll` desde https://pecl.php.net/package/mongodb (version Thread Safe 'TS' que coincida con PHP 8.3 y arquitectura x64)
3. Pegar `php_mongodb.dll` en la carpeta de extensiones
4. En Laragon, clic derecho > **PHP** > **php.ini**
5. Buscar o agregar al final la seccion de extensiones [mongodb] y agregar:
   ```
   extension=mongodb
   ```
6. Guardar y reiniciar Laragon (boton **Stop** y luego **Start All**)
7. Verificar: crear un archivo `phpinfo.php` con `<?php phpinfo(); ?>` y buscar "mongodb"

### 4. Cargar datos iniciales

1. Abrir en el navegador: `http://kosmos.test/api/seed.php`
2. Verificar que aparezca "SEED COMPLETADO"
3. **Eliminar** `seed.php` despues de ejecutarlo (por seguridad para version final)

### 5. Acceder al sistema

Abrir en el navegador:

```
http://kosmos.test/public/
```

O alternativamente:

```
http://localhost/kosmos/public/
```

## Credenciales de Login

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@kosmos.com | admin123 |
| Organizador | organizador@kosmos.com | org123 |
| Ponente | ponente@kosmos.com | pon123 |
| Participante | participante@kosmos.com | par123 |

## Permisos por Rol

| Funcionalidad | Admin | Organizador | Ponente | Participante |
|---------------|:-----:|:-----------:|:-------:|:------------:|
| Ver Eventos | Si | Si | Solo asignados | Si |
| Crear Eventos | No | Si | No | No |
| Editar/Eliminar Eventos | Si | Si | No | No |
| Asignar Ponentes | Si | Si | No | No |
| Exportar XML | Si | Si | No | No |
| CRUD Usuarios | Si | Solo Ponentes | No | No |
| Ver Inscripciones | Si | Si | No | No |
| Ver Certificados | Si | Si | No | Si (propios) |
| Reportes | Si | Si | No | No |
| Editar Perfil | Si | Si | Si | Si |
| Auto-registro | No | No | No | Si |

## Estructura del Proyecto

```
Kosmos/
+-- api/
|   +-- config/
|   |   +-- database.php          (conexion MongoDB)
|   +-- auth.php                  (login, registro, logout, sesion)
|   +-- usuarios.php              (CRUD usuarios con 4 roles)
|   +-- eventos.php               (CRUD eventos con tipoId)
|   +-- tipos_evento.php          (catalogo de tipos de evento)
|   +-- inscripciones.php         (CRUD inscripciones)
|   +-- certificados.php          (CRUD certificados + vinculacion automatizada XML individual, Semana IV)
|   +-- multimedia.php            (gestion de activos BSON: logo y QR, Semana IV)
|   +-- plantillas.php            (catalogo BSON de plantillas de certificados, Semana IV)
|   +-- consultas.php             (10 preguntas aggregation pipeline)
|   +-- busqueda.php              (busqueda avanzada + paginacion, Semana III)
|   +-- fragmentacion_demo.php    (simulacion fragmentacion horizontal, Semana III)
|   +-- setup_validacion.php      (JSON Schema Validation + indices, Semanas III y IV)
|   +-- middleware/
|   |   +-- ReglasNegocio.php     (middleware centralizado, Semana III)
|   +-- exportar_xml.php          (generacion XML dinamico de eventos con DTD)
|   +-- seed.php                  (datos iniciales + logo BSON y plantillas)
+-- public/
|   +-- index.html                (SPA principal + visor diploma y verificador publico)
|   +-- login.html                (login con fondo animado)
|   +-- register.html             (registro de participantes)
|   +-- css/
|   |   +-- style.css             (dark mode, glassmorphism, estilos diploma neon)
|   +-- js/
|       +-- app.js                (logica CRUD, visor diploma, jsPDF y validacion)
|       +-- auth.js               (manejo de sesiones y permisos)
|       +-- cosmic.js             (animacion de estrellas canvas)
|       +-- lib/
|           +-- jspdf.umd.min.js  (generador de diplomas PDF en cliente, Semana IV)
|           +-- qrcode.min.js     (generador de codigos QR para diplomas, Semana IV)
+-- docs/
    +-- README.md
    +-- avance_semana_1_corregido.md
    +-- avance_semana_2.md
    +-- semana_3_reglas.md          (Semana III: validacion, pipelines, busqueda, distribucion)
    +-- avance_semana_3.md
    +-- avance_semana_4.md          (Semana IV: multimedia BSON, plantillas, XML y jsPDF)
    +-- pruebas_semana_4.md         (Guía y matriz de pruebas para validar Semana IV)
    +-- idea plantilla certificado.md (especificacion estetica del diploma jsPDF)
    +-- semana_1_modelado.md
    +-- semana_2_arquitectura.md
    +-- Proyectos_Base_de_Datos_II_CIVA2026.md
```

## Tecnologias

- **Backend**: PHP Vanilla (sin frameworks)
- **Base de Datos**: MongoDB (NoSQL/Documental) con BSON para documentos y activos multimedia
- **Frontend**: HTML5, CSS3, JavaScript vanilla (SPA)
- **PDF & Multimedia**: jsPDF (generación client-side de diplomas vectoriales) y QRCode.js
- **Comunicacion**: API REST con respuestas JSON
- **XML**: Generación dinámica con DTD para eventos y certificados individuales vinculados
- **UI**: Dark mode (#282828), acentos neón (#00D2FF), glassmorphism, animación canvas
