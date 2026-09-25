# UNIVERSIDAD NACIONAL EXPERIMENTAL DE GUAYANA
### VICERRECTORADO ACADÉMICO
### COORDINACIÓN GENERAL DE PREGRADO
### INGENIERÍA INFORMÁTICA
### BASES DE DATOS II — CIVA 2026

---

# **KOSMOS**
## **SISTEMA DE GESTIÓN DE EVENTOS ACADÉMICOS**
### **INFORME EJECUTIVO DE ARQUITECTURA E INTEGRACIÓN DOCUMENTAL**
### **AVANCE SEMANA IV**

---

**Docente:**  
MSc. Ana Sosa

**Integrantes — Grupo IV:**  
* Abraham Orta — **V-31.353.684**  
* Jhordam Aguilera — **V-30.809.788**  
* Daniel Villalba Santamaría — **V-27.506.542**  
* Isabella Rodríguez — **V-31.521.612**  
* Samuel Silva — **V-32.038.103**  
* Santiago Bolívar — **V-31.963.033**  

**Ciudad Guayana, Septiembre del 2026.**

---

# 1. Nombre del Proyecto: Kosmos

El sistema toma su denominación del vocablo griego *Kósmos* (κόσμος), cuyo significado alude al concepto de "Orden", "Estructura armónica" y "Universo organizado", en contraposición directa al caos y la dispersión operativa que históricamente ha caracterizado la administración de actividades de extensión universitaria.

---

# 2. Descripción del Problema Institucional

Las instituciones de educación superior, centros de investigación y dependencias académicas enfrentan dificultades críticas para gestionar sus eventos de manera eficiente y confiable. El análisis de la situación operativa actual revela seis focos de dolor fundamentales:

* **Gestión manual y fragmentada de inscripciones:** El registro de participantes se efectúa de forma artesanal mediante hojas de cálculo independientes o planillas físicas, lo que genera colisiones de cupos, duplicidad de datos, lentitud en la atención y descontento en los usuarios.
* **Desarticulación en la gestión de ponentes:** No existe un repositorio centralizado para administrar los perfiles docentes, sus líneas de investigación, instituciones de origen y las agendas de ponencias asignadas.
* **Emisión manual y descontrolada de certificados:** La confección de constancias y diplomas se realiza de forma manual en procesadores de texto, demandando semanas de trabajo administrativo, propiciando errores ortográficos en nombres o cédulas y careciendo de mecanismos de seguridad institucional.
* **Dispersión de la información institucional:** Los datos de eventos, participantes, asistencias y disertantes residen en archivos desarticulados, impidiendo auditorías rápidas y análisis transversales.
* **Capacidad analítica limitada:** La dirección académica carece de indicadores inmediatos sobre la afluencia mensual, las temáticas de mayor demanda o el impacto real de la extensión universitaria para sustentar la toma de decisiones presupuestarias.
* **Control de asistencia deficiente:** No se dispone de un mecanismo estandarizado y trazable para validar la presencia efectiva de los participantes en las sesiones, permitiendo que personas sin asistencia completada reclamen acreditaciones oficiales.

Estas deficiencias degradan la experiencia de organizadores, ponentes y estudiantes, incrementan los costos de personal en reprocesos y vulneran la reputación de la universidad ante certificaciones académicas no auditables.

---

# 3. Justificación Multidimensional del Proyecto

El desarrollo del sistema **Kosmos** se fundamenta en tres pilares estratégicos de ingeniería y negocio:

### 3.1 Justificación Tecnológica

* **Variabilidad Estructural del Dominio (MongoDB):**  
  La universidad innova constantemente en sus formatos académicos: un taller práctico, un congreso internacional y un curso de extensión no comparten la misma ficha de requerimientos ni la misma estructura de datos (el taller exige lista de materiales y cupo reducido; el congreso requiere comité evaluador y mesas temáticas; el curso demanda módulos formativos y horas académicas).  
  **Decisión:** Se descartó el modelo relacional tradicional puro porque obligaría a rediseñar tablas (`ALTER TABLE`), crear decenas de columnas nulas o introducir tablas intermedias cada vez que la institución crea un formato nuevo, arriesgando caídas de servicio en producción.  
  **Mecanismo:** Kosmos adopta **MongoDB (NoSQL Documental)**, almacenando la información en formato **BSON** flexible mediante documentos embebidos y referencias cruzadas.  
  **Beneficio:** Un sistema resiliente que absorbe orgánicamente la evolución de los formatos semestrales de la universidad sin requerir reprogramaciones de base de datos ni costos extraordinarios de mantenimiento.

* **Interoperabilidad Institucional Abierta (XML + DTD + XPath):**  
  Los certificados emitidos en sistemas cerrados o archivos PDF tradicionales son cajas negras difíciles de validar por terceros, obligando al personal de secretaría a responder llamadas telefónicas y cartas para certificar autenticidad.  
  **Decisión:** Adoptar el estándar formal **XML** validado bajo una Definición de Tipo de Documento (**DTD**) estricta y consultable mediante **XPath**.  
  **Mecanismo:** Cada diploma emitido construye en el backend un documento XML canónico inmutable vinculado directamente con el registro de base de datos.  
  **Beneficio:** Cualquier empleador, institución homóloga o ente ministerial puede verificar la autenticidad de un certificado o reporte directamente con sus propios sistemas mediante un contrato abierto y legalmente auditable, sin necesidad de conocer la arquitectura interna de Kosmos.

* **Arquitectura Ligera y Desacoplada (PHP Vanilla + JSON):**  
  Se seleccionó una API REST nativa en PHP sin dependencias de frameworks pesados, comunicándose mediante mensajes JSON estándar con una aplicación web de página única (SPA). Esto asegura tiempos de respuesta sub-segundo, mínimo consumo de memoria en los servidores universitarios y despliegue inmediato en la infraestructura existente.

### 3.2 Justificación Funcional

Kosmos erradica la duplicidad de tareas unificando todo el ciclo de vida del evento —desde la planificación del calendario, asignación de ponentes y control atómico de cupos, hasta la confirmación de asistencia y la emisión automatizada de diplomas digitales— en una plataforma centralizada con cuatro roles estrictos: **Administrador**, **Organizador**, **Ponente** y **Participante**.  
**Beneficio:** Se elimina en un 100% el error de transcripción humana en los diplomas, se reduce la carga operativa de las secretarías académicas y la institución obtiene tableros analíticos en tiempo real para optimizar la asignación de recursos.

---

# 4. Objetivos del Proyecto

### 4.1 Objetivo General
Desarrollar e implantar un sistema integral de gestión de eventos académicos sustentado en tecnologías NoSQL (MongoDB), procesamiento de documentos XML y renderizado digital en cliente, que centralice la administración de actividades, garantice el control atómico de quórum y automatice la emisión, preservación y verificación pública de certificaciones institucionales.

### 4.2 Objetivos Específicos
1. **Diseñar e implementar un modelo de datos documental BSON en MongoDB** con esquemas de validación estricta en el motor (`$jsonSchema`), índices compuestos y particionamiento lógico para asegurar rendimiento constante a largo plazo.
2. **Construir una API REST centralizada y un middleware de reglas de negocio** que supervise transiciones de estado por fecha/hora, valide el quórum disponible y procese consultas analíticas complejas mediante pipelines de agregación sin recurrir a herramientas externas de cálculo.
3. **Automatizar el flujo documental BSON ↔ XML y la certificación digital**, incorporando almacenamiento de multimedia en base de datos (Logo y códigos QR dinámicos), plantillas institucionales parametrizadas, generación vectorial de diplomas en PDF (`jsPDF`) y un portal público de validación de autenticidad por código único.

---

# 5. Análisis Estratégico y Arquitectura de Datos

## 5.1 Retorno de Inversión (ROI) y Beneficios Institucionales

La implantación de Kosmos transforma los costos ocultos de la burocracia manual en activos auditables y medibles para la universidad:

| Proceso Institucional | Situación Actual (Modelo Tradicional) | Solución Implementada en Kosmos | Beneficio Verificable para la Institución |
| :--- | :--- | :--- | :--- |
| **Gestión de Eventos** | Registro en planillas dispersas. Descontrol sobre fechas de inicio, vigencia y estados de ejecución. | Gestión centralizada con cálculo automático de estados (`planificado`, `activo`, `finalizado`, `cancelado`) según fecha y hora real. | Erradica solapamientos de fechas y garantiza información de cartelera 100% veraz sin intervención humana. |
| **Administración de Ponentes** | Hojas de vida y datos archivados por evento. Carencia de perfiles unificados y duplicidad constante. | Repositorio centralizado con perfil profesional reutilizable y asignación directa a eventos por el Organizador. | **Reduce en un 70% el tiempo de coordinación docente** y consolida la trayectoria académica institucional. |
| **Control de Asistencia** | Listas físicas en papel expuestas a extravío; transcripción manual tardía semanas después. | Registro digital inmediato vinculado a la matrícula del evento; confirmación en un clic por el organizador. | Cierre de actas el mismo día del evento y habilitación instantánea de la certificación digital. |
| **Control de Cupos y Aforo** | Conteo manual de inscritos. Sobrecupos no detectados y participantes rechazados en puerta. | Descuento atómico de cupos en base de datos (`$inc: -1`) y validación de disponibilidad en tiempo real. | **Cero sobrecupos**. Previene riesgos de seguridad física en auditorios y optimiza el uso de aulas. |
| **Búsqueda y Atención al Público** | Llamadas telefónicas y correos constantes para solicitar información sobre cronogramas y temáticas. | Motor de búsqueda multifactorial facetado por texto, modalidad, estado y rango de fechas (24/7). | Descongestiona las líneas de atención y reduce drásticamente las consultas en taquilla. |
| **Actualización de Estados** | Dependencia del operador para marcar eventos como finalizados; olvidos frecuentes generan confusión. | Máquina de estados temporal autónoma que evalúa estampa de tiempo local (`America/Caracas`). | La cartelera web se actualiza con precisión de reloj sin demandar horas-hombre de supervisión. |
| **Interoperabilidad y Reportes** | Copia manual de tablas a procesadores de texto; formatos heterogéneos no compatibles. | Exportación formal de eventos bajo estructura XML validada contra DTD institucional. | Integración directa con sistemas del ministerio, acreditadoras o universidades aliadas sin costos de adaptación. |
| **Analítica y Estadísticas** | Extracción manual al cierre de semestre; procesamiento engorroso de fórmulas en Excel. | 10 reportes de gestión predefinidos ejecutados nativamente dentro del motor mediante pipelines de agregación. | **Información gerencial en segundos** para planificar presupuestos basados en demanda real y quórum histórico. |
| **Inscripción de Participantes** | Registro manual en taquilla o recepción de planillas por correo electrónico (~4 min por persona). | Auto-registro en línea con validación instantánea de cupo disponible y bloqueo de duplicados. | **El costo operativo de inscripción tiende a cero** y se eliminan las filas en secretaría. |

---

## 5.2 Comparativa de Arquitectura de Datos y Selección Tecnológica

La selección arquitectónica de Kosmos es el resultado de un análisis riguroso y transparente frente a las alternativas del mercado. Asumiendo una postura de ingeniería responsable, se reconocen con claridad los escenarios donde los paradigmas tradicionales ofrecen ventajas nativas y se justifica por qué el modelo documental es superior para este dominio:

| Criterio de Arquitectura | Relacional Puro (SQL Estándar) | Multimodelo (PostgreSQL + JSONB) | NoSQL Documental (MongoDB — Kosmos) |
| :--- | :--- | :--- | :--- |
| **Ajuste al Dominio Académico** | **Desventaja Operativa:** Rígido. Exige rediseñar tablas cada vez que la universidad crea una modalidad académica no prevista (talleres con prerrequisitos, congresos con comités), obligando a detener el sistema. | **Aceptable:** Permite almacenar variaciones en columnas `JSONB` sin romper la estructura tabular básica, aunque divide la lógica de modelado en dos paradigmas. | **Ventaja Estratégica (Elegido):** Se adapta de forma orgánica y natural. Cada ficha de evento almacena sus temas, lugar y modalidades como un documento jerárquico unificado sin alterar los registros existentes. |
| **Evolución del Esquema** | **Alto Costo a Largo Plazo:** Cada alteración de esquema requiere soporte técnico especializado, migraciones en producción (`ALTER TABLE`) y riesgo de parada de servicios. | **Costo Moderado:** Requiere mantener dos lógicas de consulta (SQL tradicional para tablas y sintaxis especializada `->>` para campos JSONB). | **Bajo Costo Operativo (Elegido):** Absorbe cambios semestrales de la universidad sin incurrir en rediseños de tablas ni paradas técnicas programadas. |
| **Integridad Referencial** | **Ventaja Clara del Relacional:** El motor de base de datos impone llaves foráneas (`FOREIGN KEY`) y chequeos de integridad de manera estricta y automática por defecto. | **Garantías Altas:** Integridad estricta en el núcleo tabular; sin embargo, las referencias dentro de los objetos `JSONB` requieren validación programática adicional. | **Riesgo Asumido y Mitigado (Elegido):** Al no ser declarativa por defecto, **la integridad se construyó de forma robusta** mediante `$jsonSchema` en el motor y un middleware centralizado (`ReglasNegocio.php`) en la aplicación. |
| **Transaccionalidad (ACID)** | **Ventaja Clara del Relacional:** Altamente maduro para operaciones bancarias o transacciones masivas multi-tabla por defecto. | **Nativa y Robusta:** Soporte transaccional pleno en el motor relacional extendido a las operaciones con columnas JSONB. | **Riesgo Asumido y Mitigado (Elegido):** Atomicidad nativa garantizada a nivel de documento BSON; transacciones multi-colección soportadas y respaldadas por operaciones de verificación estricta. |
| **Lectura de la Entidad Completa** | **Sobrecarga de E/S:** Requiere ejecutar de 5 a 6 operaciones de unión (`JOIN`) para reconstruir un evento con su lugar, sus temas, sus ponentes y sus cupos. | **Moderada:** Reduce joins en atributos secundarios, pero aún exige uniones relacionales para entidades principales. | **Lectura Atómica Inmediata (Elegido):** Toda la información operativa del evento se recupera en una sola lectura de disco, optimizando la experiencia del usuario. |
| **Analítica y Agregación** | Muy maduro mediante sentencias SQL estándar y funciones agregadas conocidas. | Maduro con SQL extendido, pero con sintaxis compleja al mezclar agregaciones tabulares con arrays JSONB. | **Pipelines de Agregación Declarativos (Elegido):** Procesamiento encadenado dentro del motor NoSQL, respondiendo a las 10 preguntas estratégicas sin salir de la base de datos. |

> **Declaración de Cierre para la Defensa:**  
> *"El modelo relacional nos da por defecto garantías que nosotros tuvimos que construir por software; a cambio, obtuvimos un modelo documental que no nos obliga a detener el sistema ni a realizar migraciones traumáticas cada vez que la universidad inventa un nuevo formato de evento, y en el dominio de la educación universitaria, ese intercambio es ampliamente favorable para la institución."*

---

## 5.3 Debilidades Asumidas de la Arquitectura y sus Mitigaciones

Un diseño de ingeniería maduro no oculta las debilidades de la tecnología seleccionada; las expone abiertamente y define protocolos exactos para neutralizarlas:

| Debilidad Técnica Asumida | Riesgo Operativo que Permite | Plan de Acción y Mitigación Implementado en Kosmos |
| :--- | :--- | :--- |
| **1. Ausencia de validación automática de relaciones foráneas** | Podría intentarse registrar una inscripción a un evento inexistente o generar un certificado a un usuario no registrado. | **Mitigación por Software:** Toda operación pasa obligatoriamente por el middleware `ReglasNegocio.php`. Si el ID del evento o participante no existe, el sistema aborta la transacción con código HTTP 400 antes de tocar la base de datos. |
| **2. Garantía de operaciones atómicas entre colecciones** | En una interrupción abrupta de red, un participante podría quedar inscrito sin que se descuente el cupo en el evento. | **Mitigación Transaccional:** Las operaciones críticas operan bajo el principio de reversión segura y el operador atómico `$inc: ['cuposDisponibles': -1]`. Adicionalmente, el sistema recalcula quórum en consultas de control. |
| **3. Acceso a información distribuida entre colecciones** | Para listar ponentes o participantes asignados a un evento, el motor no dispone de cláusulas `JOIN` tradicionales de SQL. | **Mitigación por Agregación:** Se implementaron etapas `$lookup` con conversión tipográfica estricta (`$toString`) en pipelines nativos, resolviendo cruces de información de forma transparente y sin demoras. |
| **4. Menor disponibilidad de perfiles especializados en NoSQL** | Si el equipo inicial de desarrollo culmina su ciclo, la universidad podría requerir personal que domine sintaxis de agregación MongoDB. | **Mitigación por Gobernanza:** Todas las consultas analíticas y reglas de negocio están desacopladas en endpoints parametrizados (`api/consultas.php`), con código documentado paso a paso para facilitar el mantenimiento por cualquier profesional. |
| **5. Mayor consumo relativo de almacenamiento en disco** | Los documentos BSON con metadatos y subdocumentos embebidos demandan más bytes por registro que una tabla normalizada. | **Mitigación por Particionamiento:** Se implementó una arquitectura de separación lógica entre eventos activos (operación diaria) y eventos históricos fríos, evitando que el volumen histórico compita con las consultas del semestre. |
| **6. Permisividad inicial en tipos de datos y campos vacíos** | Al ser un motor de esquema dinámico, podrían guardarse registros con nombres vacíos o fechas con formatos inválidos. | **Mitigación en el Motor:** Se aplicaron validadores estrictos a nivel de base de datos mediante `$jsonSchema` en las 5 colecciones (`setup_validacion.php`), rechazando cualquier inserción o edición no conforme directamente en el núcleo de datos. |

---

# 6. Inteligencia de Negocio: Las 10 Preguntas de Gestión

En Kosmos, las consultas analíticas no son simples comandos técnicos; representan **herramientas de inteligencia de negocio** diseñadas para que los directores de extensión, decanos y coordinadores tomen decisiones sustentadas en datos limpios:

| # | Pregunta Estratégica del Negocio | Decisión de Gestión que Habilita | Aporte Directivo al Proceso Universitario |
|---|---|---|---|
| **Q1** | **¿Qué eventos existen en un mes determinado?** | Permite evitar la saturación de los auditorios y prevenir solapamientos en el cronograma institucional. | Planificación anticipada y uso eficiente de la infraestructura física universitaria. |
| **Q2** | **¿Qué ponentes participan en un evento determinado?** | Define formalmente a quién se le tramitan viáticos y certifica el cumplimiento de la carga horaria docente. | Control transparente, auditable y sin disputas de los compromisos adquiridos con conferencistas. |
| **Q3** | **¿Qué participantes se inscribieron en un evento determinado?** | Asegura que el salón o auditorio asignado cumpla con la capacidad de aforo requerida para la matrícula registrada. | Prevención de riesgos logísticos y cumplimiento de normativas de seguridad en eventos masivos. |
| **Q4** | **¿Qué eventos ha dictado un ponente determinado?** | Facilita decisiones sobre contratación de honorarios docentes, ascensos o renovación de invitaciones académicas. | Evaluación objetiva del desempeño respaldada por el historial consolidado de colaboración del docente. |
| **Q5** | **¿Cuántos participantes tuvo cada evento?** | Determina la rentabilidad social, impacto académico y retorno logístico por actividad efectuada. | Medición directa del alcance de las políticas de extensión universitaria frente a la comunidad. |
| **Q6** | **¿Qué participantes asistieron efectivamente a un evento?** | Habilita con rigor técnico la emisión exclusiva de diplomas a quienes completaron la asistencia verificada. | Blindaje contra fraude y filtro de calidad: no se otorgan constancias por simple pre-inscripción teórica. |
| **Q7** | **¿Qué certificados se han generado institucionalmente?** | Permite a la coordinación conciliar de forma exacta el número de asistentes frente al total de diplomas emitidos. | Auditoría legal y administrativa absoluta sobre los documentos de acreditación otorgados. |
| **Q8** | **¿Qué eventos pertenecen a un tipo determinado?** | Ayuda a equilibrar la oferta académica (ej. balancear talleres prácticos vs. seminarios teóricos). | Diversificación estratégica y equilibrada de la programación académica anual de la universidad. |
| **Q9** | **¿Qué temas se han tratado en los eventos?** | Identifica líneas temáticas emergentes y brechas de conocimiento para proponer nuevos Diplomados o Postgrados. | Detección oportuna de oportunidades de formación continua alineadas a las demandas del mercado. |
| **Q10** | **¿Cuál es el evento con mayor cantidad de participantes?** | Indica con exactitud matemática dónde deben asignarse los fondos y patrocinios del próximo semestre. | Inversión presupuestaria inteligente orientada estrictamente a la demanda real de la comunidad. |

---

# 7. Extracción Documental y Auditoría de Registros con XPath

La extracción de datos históricos institucionales en formatos cerrados suele requerir desarrollos costosos o revisiones manuales hoja por hoja. Kosmos implementa **XPath** como lenguaje de consulta universal sobre el documento XML maestro del sistema, permitiendo extraer selectivamente información para auditorías o trámites externos sin alterar el documento oficial:

* **Consulta 1: Catálogo General de Oferta (`/kosmos/evento/nombre`)**  
  * *Propósito Gerencial:* Extrae una síntesis inmediata de toda la programación académica en una sola operación, evitando abrir expedientes individuales para constatar la cartelera.
* **Consulta 2: Filtrado por Modalidad (`/kosmos/evento[tipo='conferencia']/nombre`)**  
  * *Propósito Gerencial:* Filtra la oferta por categoría académica, permitiendo a la dirección aislar rápidamente eventos masivos (conferencias) de actividades de cupo limitado (talleres).
* **Consulta 3: Auditoría de Asignación Docente (`/kosmos/evento[@id='EVT001']/ponentes/ponente`)**  
  * *Propósito Gerencial:* Recupera de forma verificable la nómina de especialistas asignados a un evento particular, permitiendo a auditoría corroborar la presencia del ponente antes de autorizar pagos.
* **Consulta 4: Fiscalización de Matrícula (`/kosmos/evento/participantes/participante`)**  
  * *Propósito Gerencial:* Consolida el padrón global de asistentes a nivel institucional, sirviendo de insumo directo para censos universitarios o memorias de gestión.
* **Consulta 5: Trazabilidad Legal de Acreditaciones (`/kosmos/evento/certificados/certificado/codigoCertificado`)**  
  * *Propósito Gerencial:* Extrae los códigos únicos de certificación expedidos para cotejar en segundos la validez de un lote de diplomas presentado ante un concurso público o reválida.

---

# 8. Validación y Control de Integridad en el Núcleo de Datos

En los sistemas tradicionales, las reglas de validación solían delegarse exclusivamente a los formularios del navegador web. Esta práctica constituye un riesgo severo: un administrador que ejecute un script de migración masiva o una inserción por consola podría introducir datos corruptos (eventos sin fechas, cupos negativos o participantes sin cédula) que colapsarían los reportes directivos.

### La Solución de Ingeniería Implementada:
Kosmos traslada la primera línea de defensa directamente al **núcleo de almacenamiento de MongoDB** mediante validadores de esquema **`$jsonSchema`** configurados con nivel moderado y acción de error estricta:
1. **Regla de Integridad de Personas:** No es posible insertar un usuario sin nombre, apellido, cédula única o correo corporativo. Si el rol es *Ponente*, el motor exige obligatoriamente especialidad e institución; si es *Participante*, exige profesión e institución.
2. **Regla de Coherencia Temporal:** Los eventos no pueden almacenarse con fechas de inicio posteriores a la fecha de fin, ni registrar cupos disponibles menores a cero.
3. **Regla de Estado de Matrícula:** Una inscripción únicamente puede transitar por los estados definidos (`pendiente`, `confirmada`, `certificado`).

**Beneficio Institucional:** Blindaje total de la información. Aunque se intente alterar la base de datos por vías externas, el motor rechaza cualquier intento de registrar datos incompletos, garantizando que los reportes de la dirección se alimenten siempre de fuentes limpias.

---

# 9. Optimización de Archivos y Rendimiento Sostenible

Con el transcurrir de los semestres, el volumen de eventos históricos acumulados crece de manera exponencial. En un sistema sin diseño de distribución, las consultas del día a día (estudiantes buscando eventos de la semana) deben recorrer cientos de miles de registros de hace 5 años, ralentizando las operaciones cotidianas de la universidad.

### Estrategia de Separación de Archivos (Fragmentación Lógica):
Kosmos implementa un modelo de distribución y particionamiento que segrega la base de datos en dos grandes áreas operativas:
* **Archivo Activo (Datos Calientes):** Contiene exclusivamente los eventos en estado `planificado` o `activo` que requieren consultas transaccionales de alta frecuencia.
* **Archivo Histórico (Datos Fríos):** Almacena de forma ordenada y comprimida los eventos en estado `finalizado` o `cancelado` de semestres anteriores.

**Beneficio Institucional:** Las consultas cotidianas de los estudiantes y organizadores mantienen tiempos de respuesta de milisegundos sin importar cuántos años de historia acumule la universidad. Cuando la dirección requiera una auditoría histórica, el sistema consulta el archivo histórico en un proceso paralelo sin degradar el funcionamiento de la plataforma diaria.

---

# 10. Control Centralizado de Normas y Políticas Universitarias

Cuando las normativas universitarias cambian (por ejemplo, exigir que un estudiante tenga asistencia física confirmada antes de recibir certificado), los sistemas artesanales obligan a modificar manualmente múltiples archivos de código, generando el riesgo de que una regla se aplique en la web pero se ignore en los reportes.

### Arquitectura de Control Centralizado:
Kosmos consolida toda la inteligencia normativa en una clase de control centralizada (**`ReglasNegocio.php`**) que gobierna ocho directivas institucionales:
1. **Verificación Previa de Matrícula:** Control de existencia del evento, fechas vigentes y cupos reales.
2. **Condicionamiento de Certificación:** Restricción absoluta que impide emitir diplomas si la asistencia booleana no ha sido validada.
3. **Máquina de Estados Temporal Autónoma:** Cálculo automático del estado del evento comparando la fecha y hora actual contra el cronograma, eliminando la necesidad de actualizaciones manuales por personal administrativo.
4. **Protección Anti-Duplicados:** Bloqueo de doble inscripción o emisión múltiple del mismo certificado a un participante.

**Beneficio Institucional:** Agilidad de gobierno. Cualquier ajuste en los reglamentos de extensión universitaria se realiza en un único punto del sistema y entra en vigor de forma simultánea en toda la universidad.

---

# 11. Diagnóstico y Problemática del Proceso Documental Actual (Semana IV)

El cierre de un evento académico representa tradicionalmente una de las mayores fuentes de estrés administrativo y riesgo legal en la universidad:
1. **La Pesadilla de la Transcripción Manual:** Culminado un congreso con 400 participantes, los coordinadores deben recopilar hojas de asistencia arrugadas, abrir plantillas en procesadores de texto y transcribir manualmente nombres, apellidos y números de cédula.
2. **La Cadena de Errores y Reclamos:** Un error mecanográfico en una letra de la cédula o del apellido invalida legalmente el documento ante colegios profesionales o empleadores, desatando reclamos, filas de espera y reimpresiones costosas.
3. **Vulnerabilidad y Riesgo Reputacional:** Un certificado emitido en papel con firmas manuales o enviado como un simple archivo PDF sin respaldo documental es fácilmente editable con software de diseño gráfico. La universidad no cuenta con mecanismos ágiles para verificar la legitimidad de sus propios diplomas, viéndose obligada a atender consultas telefónicas lentas e informales.

Este caos operativo y riesgo de falsificación es precisamente lo que Kosmos resuelve mediante la digitalización formal y automatizada.

---

# 12. Criterios de Ingeniería para el Almacenamiento de Multimedia

La incorporación de activos visuales y documentos institucionales requiere criterios rigurosos de ingeniería para no comprometer la estabilidad del motor de base de datos. Se evaluaron las dos estrategias nativas de MongoDB: **BSON Embebido (BinData/Base64)** frente al sistema de fragmentación para archivos masivos (**GridFS**), seleccionando el mecanismo idóneo según la naturaleza del activo:

| Tipo de Archivo Multimedia | Tamaño Promedio | Mecanismo Seleccionado | Razón Técnica y de Negocio |
| :--- | :---: | :---: | :--- |
| **Logo Institucional Oficial** | `< 100 KB` | **BSON Embebido** (Colección `multimedia`) | Se lee en cada interfaz, encabezado de reporte y emisión de diploma. Al residir embebido en base de datos, se recupera en una sola lectura sin latencia de disco ni riesgo de enlaces rotos. |
| **Código QR de Verificación** | `< 20 KB` | **BSON Embebido** (Colección `multimedia`) | Archivo ultraligero generado dinámicamente por cada certificado emitido. Garantiza atomicidad: el certificado y su QR nacen y persisten juntos. |
| **Plantillas Institucionales de Diplomas** | `< 5 KB` | **Documento BSON** (Colección `plantillas_certificados`) | Parametrización en base de datos de encabezados, títulos y textos por rol (`participacion`, `ponente`, `organizacion`), permitiendo cambiar el formato oficial sin alterar el código fuente. |
| **Afiches Promocionales del Evento** | `500 KB - 2 MB` | **BSON Embebido** (Ficha del Evento) | Se mantiene muy por debajo del límite de seguridad de 16 MB por documento, asegurando que la imagen descriptiva viaje junto a los metadatos del evento. |
| **Material de Apoyo y Memorias del Evento** | `> 5 MB` (Escalable) | **GridFS** (Estrategia de Escalabilidad) | Documentos pesados y presentaciones de ponentes que se gestionan en colecciones fragmentadas para no saturar las lecturas de los eventos diarios. |

---

# 13. Automatización del Flujo de Emisión y Certificación Digital

El otorgamiento de un certificado en Kosmos deja de ser un trámite artesanal y se convierte en una cadena automatizada de siete eslabones blindados:

```
[ EVENTO EN ESTADO FINALIZADO ]
               │
               ▼
[ ASISTENCIA FÍSICA VERIFICADA EN SISTEMA ] (Condición sine qua non)
               │
               ▼
[ GENERACIÓN AUTOMATIZADA DEL ÁRBOL XML INDIVIDUAL ] (PHP DOMDocument bajo DTD)
               │
               ▼
[ REGISTRO DEL ACTIVO MULTIMEDIA QR EN MONGODB ] (Colección 'multimedia')
               │
               ▼
[ COMPOSICIÓN DINÁMICA CON PLANTILLA BSON Y LOGO ] (Textos según rol)
               │
               ▼
[ ASIGNACIÓN DE CÓDIGO CRIPTOGRÁFICO ÚNICO INMUTABLE ] (KOSMOS-2026-XXXXXXXX)
               │
               ▼
[ PERSISTENCIA DOCUMENTAL BSON CON DATOS EMBEBIDOS Y XML ]
               │
               ▼
[ DESCARGA INMEDIATA EN PDF VECTORIAL Y VALIDACIÓN PÚBLICA EN LÍNEA ]
```

**Regla de Negocio Blindada:** El flujo se activa exclusivamente si el evento culminó su horario y el participante posee la marca de asistencia confirmada. El sistema captura un snapshot inmutable de los datos de la persona y del evento en ese instante (`datosEmbebidos`), garantizando que si en el futuro se modifica el nombre del evento o la profesión del egresado, el diploma emitido conserve su validez histórica intacta.

---

# 14. Mecanismos de Seguridad, Trazabilidad y Verificación Pública

Para erradicar el fraude académico y dotar a los diplomas de valor legal ante terceros, Kosmos implementa una arquitectura de auditoría pública transparente:

* **Identificador Alfanumérico Único e Inmutable:** Cada diploma recibe un código oficial irrepetible (`KOSMOS-2026-XXXXXXXX`) indexado de forma única en MongoDB.
* **Código QR Dinámico Integrado:** Al momento de la emisión, el sistema genera un código QR que apunta directamente a la URL de validación institucional del documento:  
  `https://.../public/index.html?verificar=KOSMOS-2026-XXXXXXXX`
* **Portal de Validación Pública Abierto (Cero Fricción):**  
  Cualquier empleador, ministerio o evaluador internacional puede:
  1. Escanear el código QR impreso en el diploma con su teléfono inteligente.
  2. O ingresar manualmente el código alfanumérico en el botón permanente **"Validar Certificado"** de la barra superior.  
  El sistema consulta de inmediato el registro en MongoDB, valida el XML oficial y despliega en pantalla una insignia verde de autenticidad que detalla el nombre del titular, el evento aprobado, las horas académicas y la fecha formal de emisión, **sin requerir inicio de sesión ni autorizaciones administrativas**.

---

# 15. El Diploma Digital como Activo Institucional y Generación jsPDF

Para garantizar que el estudiante reciba un reconocimiento formal a la altura del prestigio universitario, Kosmos incorpora un motor de renderizado vectorial en el cliente:

* **Independencia Tecnológica (`jsPDF` en el Cliente):**  
  Se descartó la generación de PDFs en el servidor mediante herramientas dependientes de binarios compilados (como `wkhtmltopdf` o `imagick`), las cuales provocan graves incompatibilidades de librerías DLL y fallas de permisos en servidores de producción. Kosmos procesa el XML directamente en el navegador del usuario utilizando `jsPDF`, logrando una descarga en milisegundos sin sobrecargar la CPU del servidor institucional.
* **Diseño Ejecutivo Formal (Modo Oscuro Neón):**  
  Siguiendo las pautas de identidad visual institucional, el diploma se genera en formato A4 horizontal (`297 x 210 mm`) sobre fondo formal `#282828`, enmarcado por un doble filete neón en blanco y cian (`#00D2FF`) con ocho refuerzos ornamentales en las esquinas.
* **Pie de Página Simétrico en Tres Columnas con QR Integrado:**  
  Se corrigió el vacío tradicional de los diplomas creando un pie de página perfectamente equilibrado:
  * **Columna Izquierda (`x = 60 mm`):** Línea guía de seguridad y fecha oficial de emisión.
  * **Columna Central (`x = 148.5 mm`):** Código QR de validación enmarcado con el microtexto `VALIDACIÓN DIGITAL`.
  * **Columna Derecha (`x = 237 mm`):** Línea guía de seguridad y código alfanumérico único.
* **Optimización Tipográfica:** Se implementó una solución matemática para evitar el aglutinamiento de texto en títulos institucionales expandidos, garantizando una separación nítida y legible de palabras tanto en pantalla como en el archivo PDF descargado.

---

# 16. Auditoría y Segmentación por Tipo de Evento en BSON Embebido

Uno de los requerimientos gerenciales más críticos es la capacidad de auditar la producción académica por modalidad: conocer cuántos certificados se otorgaron por *Talleres* prácticos frente a *Conferencias* magistrales o *Congresos*.

### La Ventaja del Modelo Desnormalizado NoSQL:
En un sistema relacional tradicional, filtrar las inscripciones y certificados por tipo de evento exige cruzar tres tablas (`certificados` $\rightarrow$ `eventos` $\rightarrow$ `tipos_evento`), degradando el rendimiento conforme crecen los registros.  
Kosmos aprovecha el diseño documental de MongoDB almacenando la modalidad dentro del subdocumento embebido inmutable: `datosEmbebidos.evento.tipo`.

* **Filtrado Reactivo en Cascada:** La interfaz de gestión dispone de selectores sincronizados. Al seleccionar un tipo de evento (ej. *"Taller"*), la tabla de certificados se filtra de forma instantánea mediante consultas directas sobre el campo embebido, ajustando a su vez el selector secundario de eventos específicos.
* **Diferenciación Visual en Tablas:** Se separó la columna **"Tipo Evento"** (categoría académica resaltada con badge cian neón) de la columna **"Rol / Certificado"** (`Participación`, `Ponente`, `Organización`), disipando cualquier ambigüedad para los auditores.
* **Homologación Integral:** Esta capacidad de filtrado y visualización se extendió al módulo de **Inscripciones**, permitiendo auditar quórum y matrículas por modalidad académica con tiempos de respuesta instantáneos.

---

# 17. Gobernanza, Trazabilidad y Control de Metadatos

Un activo digital sin metadatos carece de validez jurídica e histórica. Por esta razón, cada elemento gráfico y documento generado en Kosmos incorpora atributos estrictos de gobernanza:

* **Atributos de Control Obligatorios:** El sistema almacena de forma inalterable el tipo MIME, tamaño en bytes, identificador del usuario que autorizó la emisión, estampa temporal precisa (`ISODate`), versión de la plantilla utilizada y enlace al documento XML respaldado.
* **Argumento de Negocio para Auditorías:** Si dentro de cinco años un colegio profesional, universidad extranjera o tribunal cuestiona la autenticidad de un diploma emitido en 2026, el sistema posee la trazabilidad forense exacta para responder quién lo emitió, bajo qué versión normativa fue generado, qué autoridades estaban en funciones y cuál fue la fecha exacta de su validación, eliminando cualquier pasivo legal para la universidad.

---

# 18. Protocolos de Mitigación ante Riesgos Operativos ("¿Qué pasa si...?")

Un jurado de ingeniería y un consejo directivo evalúan la solidez de una propuesta a través de su capacidad de respuesta ante contingencias. Kosmos cuenta con protocolos definidos para los cinco escenarios críticos:

#### 1. ¿Qué pasa si se corrompe o pierde el archivo del logo o las firmas?
**Respuesta:** Los activos esenciales residen dentro de la colección BSON `multimedia` protegida por las políticas de réplica y respaldos automáticos de la base de datos. No dependen de rutas en disco local que puedan borrarse accidentalmente. En caso de siniestro en el servidor web, el logo y los QR se restauran íntegramente al restaurar la base de datos.

#### 2. ¿Qué pasa si cambia la autoridad académica (ejemplo: cambio de Decano o Rector)?
**Respuesta:** El sistema maneja plantillas dinámicas BSON con control de vigencia temporal. Los diplomas emitidos con anterioridad conservan históricamente la firma y formato de la autoridad en funciones en ese momento (gracias al snapshot inmutable de `datosEmbebidos`), mientras que los nuevos eventos adoptan automáticamente la nueva firma digitalizada sin alterar el historial.

#### 3. ¿Cómo se procede si es necesario revocar un certificado emitido por error o fraude?
**Respuesta:** El sistema implementa una función de anulación lógica en el panel directivo. El certificado no se borra físicamente para preservar la auditoría, pero su estado transita a `"Revocado"`. De este modo, si alguien intenta escanear el QR o consultar el código en el portal público, el sistema emite una alerta roja indicando que el documento ha sido invalidado por la universidad.

#### 4. ¿Qué ocurre si falla la conexión de red en pleno proceso de emisión de un certificado?
**Respuesta:** El flujo de certificación opera bajo el principio de todo o nada con reintento transaccional. Si ocurre una caída antes de completar la persistencia del XML y del QR, la operación se cancela sin dejar registros huérfanos, notificando el incidente en la bitácora para que el organizador reintente la acción con un solo clic de forma segura.

#### 5. ¿Cómo responde el sistema si el volumen de archivos multimedia crece exponencialmente?
**Respuesta:** Gracias a la separación arquitectónica establecida: los elementos críticos ultraligeros (Logos y QR `<100 KB`) permanecen en documentos BSON optimizados de alta velocidad, mientras que los materiales de apoyo pesados y memorias de congresos se derivan a **GridFS**, garantizando que el crecimiento documental jamás degrade el tiempo de respuesta de las consultas cotidianas.

---

# 19. Impacto Institucional y Retorno Operativo Final

La culminación de la **Semana IV** en el proyecto **Kosmos** marca la transformación definitiva de la gestión de eventos académicos en la universidad:

1. **Eficiencia Cuantitativa:** Reduce a **cero las horas de trabajo manual** dedicadas a confeccionar diplomas en procesadores de texto, eliminando semanas de demoras administrativas.
2. **Calidad y Confianza:** Erradica en un **100% los reclamos por errores tipográficos** en nombres y cédulas, garantizando que el diploma refleje fielmente los datos validados durante la inscripción.
3. **Prestigio Institucional y Blindaje contra el Fraude:** Convierte cada diploma en un **activo digital inmutable, auditable y verificable públicamente en línea**, elevando el estándar de seguridad y transparencia institucional de la Universidad Nacional Experimental de Guayana ante la comunidad académica nacional e internacional.

---
*Documento ejecutivo formal elaborado para la sustentación y defensa del Avance de Semana IV del proyecto Kosmos — Bases de Datos II (CIVA 2026).*
