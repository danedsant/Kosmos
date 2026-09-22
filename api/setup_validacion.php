<?php
// Setup Semana III Grupo 4: JSON Schema Validation + indices MongoDB
// Uso: http://kosmos.test/api/setup_validacion.php  (una vez, despues de seed.php)
// Crea colecciones si no existen y aplica validadores BSON + indices.
header("Content-Type: application/json; charset=UTF-8");
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

$log = [];

function aplicarValidador($db, $db_name, $coleccion, $validator, &$log) {
    // 1. Intentar collMod (coleccion existente)
    try {
        $cmd = new MongoDB\Driver\Command([
            'collMod' => $coleccion,
            'validator' => $validator,
            'validationLevel' => 'moderate',
            'validationAction' => 'error'
        ]);
        $db->executeCommand($db_name, $cmd);
        $log[] = "$coleccion: validador aplicado (collMod).";
        return;
    } catch (MongoDB\Driver\Exception\CommandException $e) {
        // NamespaceNotFound (code 26) => crear coleccion con validador
        if (strpos($e->getMessage(), 'NamespaceNotFound') !== false || $e->getCode() == 26) {
            try {
                $cmdCreate = new MongoDB\Driver\Command([
                    'create' => $coleccion,
                    'validator' => $validator,
                    'validationLevel' => 'moderate',
                    'validationAction' => 'error'
                ]);
                $db->executeCommand($db_name, $cmdCreate);
                $log[] = "$coleccion: creada con validador.";
                return;
            } catch (Exception $e2) {
                $log[] = "$coleccion: ERROR creando: " . $e2->getMessage();
                return;
            }
        }
        $log[] = "$coleccion: ERROR collMod: " . $e->getMessage();
    }
}

function crearIndice($db, $db_name, $coleccion, $keys, $options, &$log) {
    try {
        $cmd = new MongoDB\Driver\Command(array_merge(
            ['createIndexes' => $coleccion, 'indexes' => [['key' => $keys, 'name' => ($options['name'] ?? 'idx_' . implode('_', array_keys((array)$keys)))] + $options]],
        ));
        $db->executeCommand($db_name, $cmd);
        $log[] = "$coleccion: indice " . ($options['name'] ?? json_encode($keys)) . " OK.";
    } catch (Exception $e) {
        // Si ya existe, no es error fatal
        if (strpos($e->getMessage(), 'already exists') !== false || strpos($e->getMessage(), 'IndexOptionsConflict') !== false) {
            $log[] = "$coleccion: indice " . ($options['name'] ?? json_encode($keys)) . " ya existia.";
        } else {
            $log[] = "$coleccion: ERROR indice: " . $e->getMessage();
        }
    }
}

// ---------- 1. VALIDADADORES $jsonSchema ----------

$valUsuarios = ['$jsonSchema' => [
    'bsonType' => 'object',
    'required' => ['nombre', 'apellido', 'email', 'password', 'cedula', 'rol', 'estado'],
    'properties' => [
        'nombre' => ['bsonType' => 'string', 'minLength' => 2, 'description' => 'obligatorio'],
        'apellido' => ['bsonType' => 'string', 'minLength' => 2],
        'email' => ['bsonType' => 'string', 'pattern' => '^.+@.+\\..+$', 'description' => 'email valido y unico (ver indice)'],
        'password' => ['bsonType' => 'string', 'minLength' => 6],
        'cedula' => ['bsonType' => 'string', 'minLength' => 5],
        'rol' => ['enum' => ['Admin', 'Organizador', 'Ponente', 'Participante']],
        'estado' => ['enum' => ['activo', 'inactivo']],
        'especialidad' => ['bsonType' => 'string'],
        'profesion' => ['bsonType' => 'string'],
        'institucion' => ['bsonType' => 'string'],
    ],
    // Reglas condicionales por rol (Semana III: negocio a nivel BD)
    'allOf' => [
        ['if' => ['properties' => ['rol' => ['const' => 'Ponente']]], 'then' => ['required' => ['especialidad', 'institucion']]],
        ['if' => ['properties' => ['rol' => ['const' => 'Participante']]], 'then' => ['required' => ['profesion', 'institucion']]],
    ]
]];

$valTipos = ['$jsonSchema' => [
    'bsonType' => 'object',
    'required' => ['nombre', 'activo'],
    'properties' => [
        'nombre' => ['bsonType' => 'string', 'minLength' => 3, 'description' => 'minusculas, unico'],
        'descripcion' => ['bsonType' => 'string'],
        'activo' => ['bsonType' => 'bool'],
    ]
]];

$valEventos = ['$jsonSchema' => [
    'bsonType' => 'object',
    'required' => ['nombre', 'tipoId', 'organizadorId', 'fechaInicio', 'fechaFin', 'estado'],
    'properties' => [
        'nombre' => ['bsonType' => 'string', 'minLength' => 3],
        'descripcion' => ['bsonType' => 'string'],
        'tipoId' => ['bsonType' => 'string', 'description' => 'ref tipos_evento._id'],
        'fechaInicio' => ['bsonType' => 'string', 'pattern' => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'],
        'fechaFin' => ['bsonType' => 'string', 'pattern' => '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'],
        'estado' => ['enum' => ['planificado', 'activo', 'finalizado', 'cancelado']],
        'organizadorId' => ['bsonType' => 'string'],
        'cuposDisponibles' => ['bsonType' => ['int', 'long', 'double'], 'minimum' => 0],
        'temas' => ['bsonType' => 'array'],
        'ponentes_ids' => ['bsonType' => 'array'],
        'inscripciones_ids' => ['bsonType' => 'array'],
        'lugar' => ['bsonType' => 'object'],
        'horaInicio' => ['bsonType' => 'string'],
        'horaFin' => ['bsonType' => 'string'],
        'horasDuracion' => ['bsonType' => ['int', 'long', 'double'], 'minimum' => 0],
    ]
]];

$valInscripciones = ['$jsonSchema' => [
    'bsonType' => 'object',
    'required' => ['eventoId', 'participanteId', 'estado', 'asistio'],
    'properties' => [
        'eventoId' => ['bsonType' => 'string'],
        'participanteId' => ['bsonType' => 'string'],
        'estado' => ['enum' => ['pendiente', 'confirmada', 'certificado']],
        'asistio' => ['bsonType' => 'bool'],
        'observaciones' => ['bsonType' => 'string'],
    ]
]];

$valCertificados = ['$jsonSchema' => [
    'bsonType' => 'object',
    'required' => ['eventoId', 'codigoCertificado', 'tipo'],
    'properties' => [
        'eventoId' => ['bsonType' => 'string'],
        'participanteId' => ['bsonType' => 'string'],
        'ponenteId' => ['bsonType' => 'string'],
        'codigoCertificado' => ['bsonType' => 'string', 'minLength' => 5],
        'tipo' => ['enum' => ['participacion', 'ponente', 'organizacion']],
        'horasDuracion' => ['bsonType' => ['int', 'long', 'double'], 'minimum' => 0],
        'contenidoXml' => ['bsonType' => 'string'],
    ]
]];

aplicarValidador($db, $db_name, 'usuarios', $valUsuarios, $log);
aplicarValidador($db, $db_name, 'tipos_evento', $valTipos, $log);
aplicarValidador($db, $db_name, 'eventos', $valEventos, $log);
aplicarValidador($db, $db_name, 'inscripciones', $valInscripciones, $log);
aplicarValidador($db, $db_name, 'certificados', $valCertificados, $log);

// ---------- 2. INDICES (busqueda avanzada + integridad) ----------
crearIndice($db, $db_name, 'usuarios', ['email' => 1], ['unique' => true, 'name' => 'uniq_email'], $log);
crearIndice($db, $db_name, 'usuarios', ['cedula' => 1], ['unique' => true, 'name' => 'uniq_cedula'], $log);
crearIndice($db, $db_name, 'usuarios', ['rol' => 1], ['name' => 'idx_rol'], $log);

crearIndice($db, $db_name, 'tipos_evento', ['nombre' => 1], ['unique' => true, 'name' => 'uniq_tipo_nombre'], $log);

crearIndice($db, $db_name, 'eventos', ['tipoId' => 1], ['name' => 'idx_tipoId'], $log);
crearIndice($db, $db_name, 'eventos', ['organizadorId' => 1], ['name' => 'idx_organizador'], $log);
crearIndice($db, $db_name, 'eventos', ['estado' => 1], ['name' => 'idx_estado'], $log);
crearIndice($db, $db_name, 'eventos', ['fechaInicio' => 1], ['name' => 'idx_fechaInicio'], $log);
// Texto para busqueda avanzada (un solo indice text por coleccion)
crearIndice($db, $db_name, 'eventos', ['nombre' => 'text', 'descripcion' => 'text'], ['name' => 'text_evento', 'default_language' => 'spanish'], $log);

crearIndice($db, $db_name, 'inscripciones', ['eventoId' => 1, 'participanteId' => 1], ['unique' => true, 'name' => 'uniq_evento_participante'], $log);
crearIndice($db, $db_name, 'inscripciones', ['eventoId' => 1], ['name' => 'idx_insc_evento'], $log);
crearIndice($db, $db_name, 'inscripciones', ['participanteId' => 1], ['name' => 'idx_insc_participante'], $log);

crearIndice($db, $db_name, 'certificados', ['codigoCertificado' => 1], ['unique' => true, 'name' => 'uniq_codigo'], $log);
crearIndice($db, $db_name, 'certificados', ['eventoId' => 1], ['name' => 'idx_cert_evento'], $log);
crearIndice($db, $db_name, 'certificados', ['participanteId' => 1], ['name' => 'idx_cert_participante'], $log);

echo json_encode(["status" => "success", "message" => "Validacion BSON + indices aplicados (Semana III).", "log" => $log], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
