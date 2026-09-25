<p align="center">
  <img src="img/logo.png" width="120" alt="Kosmos Logo" style="filter: drop-shadow(0 0 15px rgba(0, 210, 255, 0.4));">
</p>

<h1 align="center">Kosmos — Sistema de Gestión de Eventos Académicos</h1>

<p align="center">
  <em>Plataforma integral para la administración, control y certificación automatizada de eventos académicos con enfoque NoSQL Documental e integración XML.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MongoDB-NoSQL%20BSON-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/PHP-8.3%20Vanilla-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla%20SPA-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/jsPDF-Certificados%20Vectoriales-FF3E00?style=for-the-badge&logo=adobeacrobatreader&logoColor=white" alt="jsPDF">
  <img src="https://img.shields.io/badge/XML-DTD%20%26%20XPath-0060AA?style=for-the-badge&logo=xml&logoColor=white" alt="XML">

</p>

---

## 📋 Requisitos del Sistema

| Componente | Versión / Detalle | Notas |
| :--- | :--- | :--- |
| **[Laragon](https://laragon.org/download/)** | Full o WAMP | Incluye Apache y PHP |
| **PHP** | 8.3 | Nativo con Laragon |
| **MongoDB Community** | 6.0+ | Corriendo en `localhost:27017` |
| **Extensión `php_mongodb`** | 2.5.2 | Habilitada en `php.ini` |

---

## 🚀 Instalación y Puesta en Marcha

### 1. Iniciar Servicios
1. Iniciar MongoDB Community Server en el puerto por defecto (`27017`).
2. Abrir **Laragon** y presionar **Start All**.

### 2. Habilitar la Extensión MongoDB en PHP
1. En Laragon: clic derecho > **PHP** > **php.ini**.
2. Asegurar que la directiva esté activa:
   ```ini
   extension=mongodb
   ```
3. Reiniciar los servicios de Laragon (**Stop** y luego **Start All**).

### 3. Carga de Datos y Validaciones BSON
1. Abrir en el navegador para sembrar datos, logo en BSON y plantillas:
   ```
   http://localhost/kosmos/api/seed.php
   ```
   *(O `http://kosmos.test/api/seed.php` si se usa host virtual de Laragon)*.

2. Aplicar validadores `$jsonSchema` e índices en MongoDB:
   ```
   http://localhost/kosmos/api/setup_validacion.php
   ```

### 4. Acceder a la Aplicación Web
Abrir en el navegador:
```
http://localhost/kosmos/public/
```

---

## 🔑 Credenciales de Acceso

| Rol | Correo Electrónico | Contraseña | Permisos Principales |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@kosmos.com` | `admin123` | Gestión total de usuarios, eventos, reportes y certificados |
| **Organizador** | `organizador@kosmos.com` | `org123` | Único que crea eventos, asigna ponentes y emite certificados |
| **Ponente** | `ponente@kosmos.com` | `pon123` | Consulta de eventos asignados y emisión de diploma al finalizar |
| **Participante** | `participante@kosmos.com` | `par123` | Auto-registro, inscripción, visualización y descarga de diplomas |

---

## 🛡️ Matriz de Permisos por Rol

| Funcionalidad | Admin | Organizador | Ponente | Participante | Público |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Ver / Inscribirse en Eventos** | Sí | Sí | Asignados | Sí | No |
| **Crear Nuevos Eventos** | No | **Sí** | No | No | No |
| **Editar / Cancelar Eventos** | Sí | Sí | No | No | No |
| **Asignar Ponentes** | Sí | Sí | No | No | No |
| **Confirmar Asistencia** | Sí | Sí | No | No | No |
| **Generar Certificados** | Sí | Sí | Finalizados | No | No |
| **Ver Diploma / Exportar PDF (jsPDF)** | Sí | Sí | Propios | Propios | Con Código |
| **Descargar XML Individual** | Sí | Sí | Propios | Propios | Sí |
| **Validar Autenticidad (QR / Código)** | Sí | Sí | Sí | Sí | **Sí** |

---

## 📡 Catálogo de Endpoints de la API REST

| Endpoint | Métodos | Descripción |
| :--- | :---: | :--- |
| `/api/certificados.php` | `GET`, `POST`, `DELETE` | Emisión con generación XML individual, consulta pública por `?codigoCertificado=...` y descarga directa en `?formato=xml&download=1`. |
| `/api/multimedia.php` | `GET`, `POST` | Gestión de activos BSON (Logo institucional y códigos QR). Soporta retorno en JSON o imagen binaria cruda con `?raw=1`. |
| `/api/plantillas.php` | `GET`, `POST`, `PUT`, `DELETE` | Catálogo documental de plantillas de certificados configurables en BSON. |
| `/api/eventos.php` | `GET`, `POST`, `PUT`, `DELETE` | CRUD de eventos con auto-ajuste de estados en tiempo real (`planificado` → `activo` → `finalizado`). |
| `/api/inscripciones.php` | `GET`, `POST`, `PUT`, `DELETE` | Inscripción con control de cupos y confirmación de asistencia para certificación. |
| `/api/consultas.php` | `GET` | 10 Aggregation Pipelines oficiales que responden a las preguntas del dominio académico. |
| `/api/busqueda.php` | `GET` | Búsqueda avanzada con índice textual, filtros por estado/rango de fechas y paginación facetada. |
| `/api/exportar_xml.php` | `GET` | Exportación completa del árbol de eventos en XML con validación DTD. |
| `/api/auth.php` | `POST`, `GET` | Autenticación, registro público de participantes y gestión de sesiones. |

---

## 📁 Estructura del Repositorio

```
Kosmos/
+-- api/
|   +-- config/
|   |   +-- database.php          (Conexión nativa a MongoDB)
|   +-- auth.php                  (Login, registro, sesiones)
|   +-- usuarios.php              (CRUD de usuarios con 4 roles)
|   +-- eventos.php               (CRUD de eventos con control de estados)
|   +-- tipos_evento.php          (Catálogo de tipos de evento)
|   +-- inscripciones.php         (Gestión de inscripciones y asistencia)
|   +-- certificados.php          (Generación y vinculación automatizada BSON/XML individual)
|   +-- multimedia.php            (Gestión de activos BSON: Logo y QR)
|   +-- plantillas.php            (Catálogo BSON de plantillas de certificados)
|   +-- consultas.php             (10 pipelines de agregación oficiales)
|   +-- busqueda.php              (Búsqueda avanzada de eventos)
|   +-- fragmentacion_demo.php    (Simulación de fragmentación horizontal de datos)
|   +-- setup_validacion.php      (Esquemas $jsonSchema e índices para todas las colecciones)
|   +-- middleware/
|   |   +-- ReglasNegocio.php     (Validaciones centralizadas y máquina de estados)
|   +-- exportar_xml.php          (Exportación de evento global con DTD)
|   +-- seed.php                  (Siembra de usuarios, tipos, logo BSON y plantillas)
+-- public/
|   +-- index.html                (SPA principal + visor de diploma y verificador público)
|   +-- login.html                (Inicio de sesión)
|   +-- register.html             (Registro de participantes)
|   +-- css/
|   |   +-- style.css             (Dark mode, glassmorphism y estilos del diploma neón)
|   +-- js/
|       +-- app.js                (Lógica frontend, visor de diploma, jsPDF y validación)
|       +-- auth.js               (Control de permisos por rol)
|       +-- cosmic.js             (Fondo canvas animado)
|       +-- lib/
|           +-- jspdf.umd.min.js  (Librería client-side para diplomas en PDF)
|           +-- qrcode.min.js     (Generador de códigos QR para diplomas)
+-- docs/
    +-- README.md                 (Documentación general)
    +-- avance_semana_1_corregido.md (Semana I: Modelado, DTD y XPath)
    +-- avance_semana_2.md          (Semana II: Persistencia NoSQL e Interfaz Web)
    +-- avance_semana_3.md          (Semana III: Reglas de Negocio, Agregaciones y Búsqueda)
    +-- semana_3_reglas.md          (Detalle de validaciones BSON y pipelines)
    +-- avance_semana_4.md          (Semana IV: Multimedia BSON, XML individual y jsPDF)
    +-- pruebas_semana_4.md         (Guía y matriz de casos de prueba de Semana IV)
    +-- idea plantilla certificado.md (Especificación estética de diplomas en PDF)
```

---

## 📄 Documentación

| Documento | Descripción |
| :--- | :--- |
| [Informe Técnico](Documentacion/Informe_Tecnico.md) | Arquitectura, diseño de base de datos, endpoints y estructura del código |
| [Informe Ejecutivo](Documentacion/Informe%20Ejecutivo.md) | Resumen gerencial, objetivos del proyecto y alcance funcional |

---

## 💻 Tecnologías Utilizadas

* **Motor de Base de Datos:** MongoDB Community Server (NoSQL / Documental) utilizando formato BSON para documentos jerárquicos y activos multimedia en Base64.
* **Backend:** PHP 8.3 Vanilla (sin dependencias de frameworks ni librerías externas de Composer).
* **Frontend:** Single Page Application (SPA) en HTML5, CSS3 moderno (Dark mode `#282828` con acentos neón `#00D2FF` y glassmorphism) y JavaScript Vanilla.
* **Motor de Generacion de Certificados:** `jsPDF` en cliente para renderizado vectorial en formato A4 horizontal y `QRCode.js` para validación digital autónoma.
* **Integración Documental:** XML con especificación DTD y consultas XPath para interoperabilidad documental.
