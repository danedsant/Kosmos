<?php
// Kosmos Semana III: Motor de Aggregation Pipeline (10 preguntas oficiales Grupo 4)
// Todas las consultas usan comando aggregate con $match/$lookup/$unwind/$group/$sort/$project.
//
// PATRON DE IDs EN EL SISTEMA:
// - MongoDB genera automaticamente _id como ObjectId (ej: eventos._id, usuarios._id)
// - Las colecciones secundarias (inscripciones, certificados) almacenan referencias como STRING
//   para facilitar el manejo desde JavaScript y la API REST
// - Cuando se busca por _id de una coleccion principal: new MongoDB\BSON\ObjectId($id)
//   Ejemplo: eventos._id, usuarios._id, tipos_evento._id
// - Cuando se busca por referencia en secundarias: directamente como string
//   Ejemplo: inscripciones.eventoId, certificados.eventoId
// - En $lookup: se usa $toString para convertir _id a string y comparar con referencias
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

if (!isset($_GET['q'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Debe especificar el numero de consulta (q=1..10)"]);
    exit;
}

$q = intval($_GET['q']);
$result = [];

function ejecutarPipeline($db, $db_name, $coleccion, $pipeline) {
    $command = new MongoDB\Driver\Command([
        'aggregate' => $coleccion,
        'pipeline' => $pipeline,
        'cursor' => new stdClass
    ]);
    $cursor = $db->executeCommand($db_name, $command);
    $out = [];
    foreach ($cursor as $doc) $out[] = $doc;
    return $out;
}

try {
    switch ($q) {

        case 1:
            // 1. Que eventos existen en un mes determinado? ($match por mes + $lookup tipo)
            if (!isset($_GET['mes'])) throw new Exception("Falta parametro 'mes' (formato: YYYY-MM)");
            $mes = trim($_GET['mes']);
            $result = ejecutarPipeline($db, $db_name, 'eventos', [
                ['$addFields' => ['mes' => ['$substr' => [['$ifNull' => ['$fechaInicio', '']], 0, 7]]]],
                ['$match' => ['mes' => $mes]],
                ['$lookup' => [
                    'from' => 'tipos_evento',
                    'let' => ['tid' => '$tipoId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$tid']]]],
                        ['$project' => ['nombre' => 1]]
                    ],
                    'as' => 'tipo'
                ]],
                ['$unwind' => ['path' => '$tipo', 'preserveNullAndEmptyArrays' => true]],
                ['$sort' => ['fechaInicio' => 1]],
                ['$project' => ['ponentes_ids' => 0, 'inscripciones_ids' => 0, 'mes' => 0]]
            ]);
            break;

        case 2:
            // 2. Que ponentes participan en un evento? (eventos -> usuarios via $toString)
            // NOTA: eventos._id es ObjectId, por eso se convierte con new ObjectId()
            if (!isset($_GET['eventoId'])) throw new Exception("Falta parametro 'eventoId'");
            $oid = new MongoDB\BSON\ObjectId($_GET['eventoId']);
            $result = ejecutarPipeline($db, $db_name, 'eventos', [
                ['$match' => ['_id' => $oid]],
                ['$lookup' => [
                    'from' => 'usuarios',
                    'let' => ['pids' => '$ponentes_ids'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$in' => [['$toString' => '$_id'], '$$pids']]]],
                        ['$project' => ['password' => 0]]
                    ],
                    'as' => 'ponentes'
                ]],
                ['$unwind' => '$ponentes'],
                ['$replaceRoot' => ['newRoot' => '$ponentes']]
            ]);
            break;

        case 3:
            // 3. Que participantes se inscribieron en un evento? (inscripciones -> usuarios)
            // NOTA: inscripciones.eventoId es STRING (no ObjectId), por eso se busca directo
            if (!isset($_GET['eventoId'])) throw new Exception("Falta parametro 'eventoId'");
            $result = ejecutarPipeline($db, $db_name, 'inscripciones', [
                ['$match' => ['eventoId' => $_GET['eventoId']]],
                ['$lookup' => [
                    'from' => 'usuarios',
                    'let' => ['pid' => '$participanteId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$pid']]]],
                        ['$project' => ['password' => 0]]
                    ],
                    'as' => 'participante'
                ]],
                ['$unwind' => '$participante'],
                ['$replaceRoot' => ['newRoot' => '$participante']]
            ]);
            break;

        case 4:
            // 4. Que eventos ha dictado un ponente? ($match en array + $lookup tipo)
            if (!isset($_GET['ponenteId'])) throw new Exception("Falta parametro 'ponenteId'");
            $result = ejecutarPipeline($db, $db_name, 'eventos', [
                ['$match' => ['ponentes_ids' => $_GET['ponenteId']]],
                ['$lookup' => [
                    'from' => 'tipos_evento',
                    'let' => ['tid' => '$tipoId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$tid']]]]
                    ],
                    'as' => 'tipo'
                ]],
                ['$unwind' => ['path' => '$tipo', 'preserveNullAndEmptyArrays' => true]],
                ['$project' => ['ponentes_ids' => 0, 'inscripciones_ids' => 0]]
            ]);
            break;

        case 5:
            // 5. Cuantos participantes inscritos tiene cada evento? ($group + $lookup evento + $sort)
            $result = ejecutarPipeline($db, $db_name, 'inscripciones', [
                ['$group' => ['_id' => '$eventoId', 'totalParticipantes' => ['$sum' => 1]]],
                ['$sort' => ['totalParticipantes' => -1]],
                ['$lookup' => [
                    'from' => 'eventos',
                    'let' => ['eid' => '$_id'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$eid']]]],
                        ['$project' => ['nombre' => 1]]
                    ],
                    'as' => 'evento'
                ]],
                ['$unwind' => ['path' => '$evento', 'preserveNullAndEmptyArrays' => true]],
                ['$project' => [
                    '_id' => 0,
                    'eventoId' => '$_id',
                    'eventoNombre' => ['$ifNull' => ['$evento.nombre', 'N/A']],
                    'totalParticipantes' => 1
                ]]
            ]);
            break;

        case 6:
            // 6. Que participantes asistieron a un evento? (filtro asistio=true + join)
            // NOTA: inscripciones.eventoId es STRING (no ObjectId), por eso se busca directo
            if (!isset($_GET['eventoId'])) throw new Exception("Falta parametro 'eventoId'");
            $result = ejecutarPipeline($db, $db_name, 'inscripciones', [
                ['$match' => ['eventoId' => $_GET['eventoId'], 'asistio' => true]],
                ['$lookup' => [
                    'from' => 'usuarios',
                    'let' => ['pid' => '$participanteId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$pid']]]],
                        ['$project' => ['password' => 0]]
                    ],
                    'as' => 'participante'
                ]],
                ['$unwind' => '$participante'],
                ['$replaceRoot' => ['newRoot' => '$participante']]
            ]);
            break;

        case 7:
            // 7. Que certificados se han generado? (certificados -> eventos, join por $toString)
            $result = ejecutarPipeline($db, $db_name, 'certificados', [
                ['$lookup' => [
                    'from' => 'eventos',
                    'let' => ['eid' => '$eventoId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$eid']]]],
                        ['$project' => ['nombre' => 1]]
                    ],
                    'as' => 'evento'
                ]],
                ['$unwind' => ['path' => '$evento', 'preserveNullAndEmptyArrays' => true]],
                ['$project' => [
                    '_id' => 0,
                    'codigo' => '$codigoCertificado',
                    'eventoNombre' => ['$ifNull' => ['$evento.nombre', 'N/A']],
                    'fechaEmision' => 1,
                    'tipo' => 1
                ]]
            ]);
            break;

        case 8:
            // 8. Que eventos pertenecen a un tipo? ($match + $lookup tipo)
            if (!isset($_GET['tipoId'])) throw new Exception("Falta parametro 'tipoId'");
            $result = ejecutarPipeline($db, $db_name, 'eventos', [
                ['$match' => ['tipoId' => $_GET['tipoId']]],
                ['$lookup' => [
                    'from' => 'tipos_evento',
                    'let' => ['tid' => '$tipoId'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$tid']]]],
                        ['$project' => ['nombre' => 1]]
                    ],
                    'as' => 'tipo'
                ]],
                ['$unwind' => ['path' => '$tipo', 'preserveNullAndEmptyArrays' => true]],
                ['$sort' => ['fechaInicio' => 1]],
                ['$project' => [
                    'nombre' => 1,
                    'fechaInicio' => 1,
                    'fechaFin' => 1,
                    'estado' => 1,
                    'tipoNombre' => ['$ifNull' => ['$tipo.nombre', 'N/A']],
                    'lugar' => 1
                ]]
            ]);
            break;

        case 9:
            // 9. Que temas se han tratado? ($unwind + $group + $sort)
            $result = ejecutarPipeline($db, $db_name, 'eventos', [
                ['$unwind' => '$temas'],
                ['$group' => ['_id' => '$temas', 'eventos' => ['$addToSet' => '$nombre'], 'totalEventos' => ['$sum' => 1]]],
                ['$sort' => ['totalEventos' => -1]],
                ['$project' => ['_id' => 0, 'tema' => '$_id', 'eventos' => 1, 'totalEventos' => 1]]
            ]);
            break;

        case 10:
            // 10. Evento con mayor cantidad de participantes ($group + $sort + $limit + $lookup)
            $result = ejecutarPipeline($db, $db_name, 'inscripciones', [
                ['$group' => ['_id' => '$eventoId', 'totalParticipantes' => ['$sum' => 1]]],
                ['$sort' => ['totalParticipantes' => -1]],
                ['$limit' => 1],
                ['$lookup' => [
                    'from' => 'eventos',
                    'let' => ['eid' => '$_id'],
                    'pipeline' => [
                        ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$eid']]]],
                        ['$project' => ['nombre' => 1]]
                    ],
                    'as' => 'evento'
                ]],
                ['$unwind' => '$evento'],
                ['$project' => [
                    '_id' => 0,
                    'eventoId' => '$_id',
                    'nombreEvento' => '$evento.nombre',
                    'totalParticipantes' => 1
                ]]
            ]);
            break;

        default:
            throw new Exception("Consulta no valida.");
    }

    foreach ($result as &$doc) {
        if (isset($doc->_id) && $doc->_id instanceof MongoDB\BSON\ObjectId) {
            $doc->id = (string) $doc->_id;
            unset($doc->_id);
        }
    }

    echo json_encode(["status" => "success", "pregunta" => $q, "motor" => "aggregation-pipeline", "data" => $result]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>