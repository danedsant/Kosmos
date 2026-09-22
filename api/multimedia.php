<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();
$collection = "multimedia";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if (isset($_GET['tipo'])) {
                $filter['tipo'] = $_GET['tipo'];
            }
            if (isset($_GET['referenciaId'])) {
                $filter['referenciaId'] = $_GET['referenciaId'];
            }
            if (isset($_GET['id'])) {
                $filter['_id'] = new MongoDB\BSON\ObjectId($_GET['id']);
            }

            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $items = $cursor->toArray();

            // Si se solicita renderizar la imagen binaria cruda
            if (isset($_GET['raw']) && $_GET['raw'] === '1' && count($items) > 0) {
                $item = current($items);
                $mime = $item->mimeType ?? 'image/png';
                header("Content-Type: $mime");
                
                // Si está guardado en base64 puro o data URI
                $datos = $item->datos ?? '';
                if (strpos($datos, ',') !== false) {
                    $datos = explode(',', $datos)[1];
                }
                echo base64_decode($datos);
                exit;
            }

            // Retorno JSON habitual
            $result = [];
            foreach ($items as $doc) {
                $formatted = (array)$doc;
                if (isset($doc->_id)) {
                    $formatted['id'] = (string)$doc->_id;
                    unset($formatted['_id']);
                }
                if (isset($doc->creado_en) && $doc->creado_en instanceof MongoDB\BSON\UTCDateTime) {
                    $formatted['creado_en'] = $doc->creado_en->toDateTime()->format('Y-m-d\TH:i:s.000\Z');
                }
                $result[] = $formatted;
            }

            header("Content-Type: application/json; charset=UTF-8");
            if (isset($_GET['id']) || (isset($_GET['tipo']) && $_GET['tipo'] === 'logo' && count($result) === 1)) {
                echo json_encode(["status" => "success", "data" => $result[0] ?? null]);
            } else {
                echo json_encode(["status" => "success", "data" => $result]);
            }
        } catch(Exception $e) {
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        header("Content-Type: application/json; charset=UTF-8");
        $data = json_decode(file_get_contents("php://input"));
        
        if (!empty($data->tipo) && !empty($data->nombre) && !empty($data->datos)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $doc = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "tipo" => $data->tipo, // 'logo' | 'qr'
                    "nombre" => $data->nombre,
                    "mimeType" => $data->mimeType ?? 'image/png',
                    "datos" => $data->datos, // Base64
                    "referenciaId" => $data->referenciaId ?? null,
                    "metadatos" => $data->metadatos ?? [],
                    "creado_en" => new MongoDB\BSON\UTCDateTime()
                ];

                // Si es el logo global y ya existe uno, actualizarlo o mantenerlo único
                if ($data->tipo === 'logo') {
                    $bulk->update(['tipo' => 'logo'], ['$set' => $doc], ['upsert' => true]);
                } else {
                    $bulk->insert($doc);
                }

                $db->executeBulkWrite($namespace, $bulk);
                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Activo multimedia registrado exitosamente.",
                    "id" => (string)$doc['_id']
                ]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Datos incompletos (tipo, nombre, datos requeridos)."]);
        }
        break;

    default:
        header("Content-Type: application/json; charset=UTF-8");
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido."]);
        break;
}
?>
