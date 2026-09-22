<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once 'config/database.php';
include_once 'middleware/ReglasNegocio.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();
$collection = "inscripciones";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if(isset($_GET['eventoId'])) {
                $filter['eventoId'] = $_GET['eventoId'];
            }
            if(isset($_GET['participanteId'])) {
                $filter['participanteId'] = $_GET['participanteId'];
            }
            if(!empty($_GET['tipoEvento'])) {
                $tipoNombre = trim($_GET['tipoEvento']);
                if (preg_match('/^[a-f\d]{24}$/i', $tipoNombre)) {
                    try {
                        $qT = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($tipoNombre)]);
                        $cT = $db->executeQuery("$db_name.tipos_evento", $qT)->toArray();
                        if (!empty($cT)) $tipoNombre = $cT[0]->nombre ?? $tipoNombre;
                    } catch(Exception $eT) {}
                }

                $evIds = [];
                try {
                    $qTipos = new MongoDB\Driver\Query(['nombre' => new MongoDB\BSON\Regex('^' . preg_quote($tipoNombre) . '$', 'i')]);
                    $cTipos = $db->executeQuery("$db_name.tipos_evento", $qTipos)->toArray();
                    if (!empty($cTipos)) {
                        $tipoObjId = (string)$cTipos[0]->_id;
                        $qEv = new MongoDB\Driver\Query(['tipoId' => $tipoObjId]);
                        $cEv = $db->executeQuery("$db_name.eventos", $qEv);
                        foreach ($cEv as $evDoc) {
                            $evIds[] = (string)$evDoc->_id;
                        }
                    }
                } catch(Exception $e) {}

                if (isset($filter['eventoId'])) {
                    if (!in_array($filter['eventoId'], $evIds)) {
                        $filter['eventoId'] = '__none__';
                    }
                } else {
                    $filter['eventoId'] = ['$in' => $evIds];
                }
            }
            
            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $inscripciones = [];
            foreach ($cursor as $document) {
                if(isset($document->_id)) {
                    $document->id = (string)$document->_id;
                    unset($document->_id);
                }
                if(isset($document->fechaInscripcion) && $document->fechaInscripcion instanceof MongoDB\BSON\UTCDateTime) {
                    $document->fechaInscripcion = $document->fechaInscripcion->toDateTime()->format('Y-m-d\TH:i:s.000\Z');
                }
                $inscripciones[] = $document;
            }
            echo json_encode(["status" => "success", "data" => $inscripciones]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        
        if(!empty($data->eventoId) && !empty($data->participanteId)) {
            try {
                // Migrar estado automaticamente antes de validar (planificado->activo->finalizado)
                $ev0 = ReglasNegocio::eventoPorId($db, $db_name, $data->eventoId);
                if ($ev0) ReglasNegocio::migracionAutomatica($db, $db_name, $ev0);
                // Semana III: middleware centralizado (5 reglas en un solo punto)
                $check = ReglasNegocio::validarInscripcion($db, $db_name, $data->eventoId, $data->participanteId);
                if (!$check['ok']) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => $check['message']]);
                    break;
                }
                $evento = $check['evento'];

                // Inscripcion validada, proceder
                $bulk = new MongoDB\Driver\BulkWrite;
                
                $inscripcion_id = new MongoDB\BSON\ObjectId();
                
                $inscripcion = [
                    "_id" => $inscripcion_id,
                    "eventoId" => $data->eventoId,
                    "participanteId" => $data->participanteId,
                    "fechaInscripcion" => new MongoDB\BSON\UTCDateTime(),
                    "estado" => $data->estado ?? "pendiente",
                    "asistio" => false,
                    "calificacion" => null,
                    "observaciones" => $data->observaciones ?? ""
                ];
                
                $bulk->insert($inscripcion);
                $db->executeBulkWrite($namespace, $bulk);
                
                // Actualizar el evento: agregar inscripcion y decrementar cupos
                $bulkEvento = new MongoDB\Driver\BulkWrite;
                $bulkEvento->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->eventoId)],
                    [
                        '$push' => ['inscripciones_ids' => (string)$inscripcion_id],
                        '$inc' => ['cuposDisponibles' => -1]
                    ]
                );
                $db->executeBulkWrite("$db_name.eventos", $bulkEvento);
                
                http_response_code(201);
                echo json_encode([
                    "status" => "success", 
                    "message" => "Inscripcion creada exitosamente.", 
                    "id" => (string)$inscripcion_id
                ]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Faltan datos requeridos (eventoId, participanteId)."]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        
        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                
                $updateData = [];
                if(isset($data->asistio) && $data->asistio === true) {
                    $updateData['asistio'] = true;
                    $updateData['estado'] = 'confirmada';
                }
                if(isset($data->estado)) $updateData['estado'] = $data->estado;
                if(isset($data->calificacion)) $updateData['calificacion'] = $data->calificacion;
                if(isset($data->observaciones)) $updateData['observaciones'] = $data->observaciones;
                
                $bulk->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->id)],
                    ['$set' => $updateData]
                );
                
                $db->executeBulkWrite($namespace, $bulk);
                echo json_encode(["status" => "success", "message" => "Inscripción actualizada."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID de la inscripción."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        
        if(!empty($data->id) && !empty($data->eventoId)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $db->executeBulkWrite($namespace, $bulk);
                
                // Quitar la inscripción del evento
                $bulkEvento = new MongoDB\Driver\BulkWrite;
                $bulkEvento->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->eventoId)],
                    ['$pull' => ['inscripciones_ids' => $data->id]]
                );
                $db->executeBulkWrite("$db_name.eventos", $bulkEvento);
                
                echo json_encode(["status" => "success", "message" => "Inscripción eliminada."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID de la inscripción o el eventoId asociado."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        break;
}
?>
