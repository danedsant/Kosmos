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
|   +-- certificados.php          (CRUD certificados)
|   +-- consultas.php             (10 preguntas aggregation pipeline)
|   +-- busqueda.php              (busqueda avanzada + paginacion, Semana III)
|   +-- fragmentacion_demo.php    (simulacion fragmentacion horizontal, Semana III)
|   +-- setup_validacion.php      (JSON Schema Validation + indices, Semana III)
|   +-- middleware/
|   |   +-- ReglasNegocio.php     (middleware centralizado, Semana III)
|   +-- exportar_xml.php          (generacion XML dinamico con DTD)
|   +-- seed.php                  (datos iniciales, borrar despues de usar)
+-- public/
|   +-- index.html                (SPA principal)
|   +-- login.html                (login con fondo animado)
|   +-- register.html             (registro de participantes)
|   +-- css/
|   |   +-- style.css             (dark mode, glassmorphism)
|   +-- js/
|       +-- app.js                (logica CRUD y navegacion)
|       +-- auth.js               (manejo de sesiones y permisos)
|       +-- cosmic.js             (animacion de estrellas canvas)
+-- docs/
    +-- README.md                 (este archivo)
    +-- avance_semana_1_corregido.md
    +-- avance_semana_2.md
    +-- semana_3_reglas.md          (Semana III: validacion, pipelines, busqueda, distribucion)
    +-- semana_1_modelado.md
    +-- semana_2_arquitectura.md
    +-- Proyectos_Base_de_Datos_II_CIVA2026.md
```

## Tecnologias

- **Backend**: PHP Vanilla (sin frameworks)
- **Base de Datos**: MongoDB (NoSQL/Documental)
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Comunicacion**: API REST con respuestas JSON
- **XML**: Generacion dinamica con DTD para validacion
- **UI**: Dark mode, glassmorphism, animacion canvas
