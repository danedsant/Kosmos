<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
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
$collection = "certificados";
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
            if(isset($_GET['ponenteId'])) {
                $filter['ponenteId'] = $_GET['ponenteId'];
            }
            if(isset($_GET['codigoCertificado'])) {
                $filter['codigoCertificado'] = $_GET['codigoCertificado'];
            }
            
            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $certificados = [];
            foreach ($cursor as $document) {
                if(isset($document->_id)) {
                    $document->id = (string)$document->_id;
                    unset($document->_id);
                }
                if(isset($document->fechaEmision) && $document->fechaEmision instanceof MongoDB\BSON\UTCDateTime) {
                    $document->fechaEmision = $document->fechaEmision->toDateTime()->format('Y-m-d\TH:i:s.000\Z');
                }
                $certificados[] = $document;
            }
            echo json_encode(["status" => "success", "data" => $certificados]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        
        if(!empty($data->eventoId) && !empty($data->tipo)) {
            try {
                $ev0 = ReglasNegocio::eventoPorId($db, $db_name, $data->eventoId);
                if ($ev0) ReglasNegocio::migracionAutomatica($db, $db_name, $ev0);

                $personaId = $data->participanteId ?? $data->ponenteId ?? null;
                if (empty($personaId)) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Falta participanteId o ponenteId."]);
                    break;
                }

                $check = ReglasNegocio::validarCertificado($db, $db_name, $data->eventoId, $personaId, $data->tipo);
                if (!$check['ok']) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => $check['message']]);
                    break;
                }
                $evento = $check['evento'];

                $bulk = new MongoDB\Driver\BulkWrite;
                
                $codigo = "KOSMOS-" . date("Y") . "-" . strtoupper(substr(md5(uniqid()), 0, 8));
                
                $certificado = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "eventoId" => $data->eventoId,
                    "codigoCertificado" => $data->codigoCertificado ?? $codigo,
                    "fechaEmision" => new MongoDB\BSON\UTCDateTime(),
                    "tipo" => $data->tipo,
                    "horasDuracion" => $data->horasDuracion ?? ($evento->horasDuracion ?? 0),
                    "contenidoXml" => $data->contenidoXml ?? ""
                ];

                if ($data->tipo === 'ponente') {
                    $certificado['ponenteId'] = $personaId;
                } else {
                    $certificado['participanteId'] = $personaId;
                }
                
                $bulk->insert($certificado);
                $db->executeBulkWrite($namespace, $bulk);

                if ($data->tipo !== 'ponente' && !empty($data->participanteId)) {
                    $bulkInsc = new MongoDB\Driver\BulkWrite;
                    $bulkInsc->update(
                        ['eventoId' => $data->eventoId, 'participanteId' => $data->participanteId],
                        ['$set' => ['estado' => 'certificado']]
                    );
                    $db->executeBulkWrite("$db_name.inscripciones", $bulkInsc);
                }
                
                http_response_code(201);
                echo json_encode([
                    "status" => "success", 
                    "message" => "Certificado generado exitosamente.", 
                    "id" => (string)$certificado['_id'],
                    "codigoCertificado" => $certificado['codigoCertificado']
                ]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Faltan datos requeridos (eventoId, participanteId, tipo)."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        
        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $db->executeBulkWrite($namespace, $bulk);
                
                echo json_encode(["status" => "success", "message" => "Certificado eliminado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del certificado."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        break;
}
?>
