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

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();
$collection = "plantillas_certificados";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if (isset($_GET['tipoCertificado'])) {
                $filter['tipoCertificado'] = $_GET['tipoCertificado'];
            }
            if (isset($_GET['id'])) {
                $filter['_id'] = new MongoDB\BSON\ObjectId($_GET['id']);
            }

            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $plantillas = [];

            foreach ($cursor as $doc) {
                $item = (array)$doc;
                if (isset($doc->_id)) {
                    $item['id'] = (string)$doc->_id;
                    unset($item['_id']);
                }
                $plantillas[] = $item;
            }

            if (isset($_GET['id']) || (isset($_GET['tipoCertificado']) && count($plantillas) === 1)) {
                echo json_encode(["status" => "success", "data" => $plantillas[0] ?? null]);
            } else {
                echo json_encode(["status" => "success", "data" => $plantillas]);
            }
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->nombre) && !empty($data->tipoCertificado) && !empty($data->titulo)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $doc = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "nombre" => $data->nombre,
                    "tipoCertificado" => $data->tipoCertificado, // participacion, ponente, organizacion
                    "encabezado" => $data->encabezado ?? "KOSMOS EVENTOS ACADÉMICOS",
                    "titulo" => $data->titulo,
                    "subtitulo" => $data->subtitulo ?? "Se otorga el presente reconocimiento a:",
                    "cuerpoTexto" => $data->cuerpoTexto ?? "Por haber asistido y aprobado satisfactoriamente el {{tipo}} titulado:",
                    "pieEmision" => $data->pieEmision ?? "EMISIÓN",
                    "pieCodigo" => $data->pieCodigo ?? "CÓDIGO",
                    "activo" => $data->activo ?? true,
                    "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
                ];
                $bulk->insert($doc);
                $db->executeBulkWrite($namespace, $bulk);

                http_response_code(201);
                echo json_encode(["status" => "success", "message" => "Plantilla creada.", "id" => (string)$doc['_id']]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Faltan campos obligatorios (nombre, tipoCertificado, titulo)."]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            try {
                $id = $data->id;
                unset($data->id);
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->update(
                    ['_id' => new MongoDB\BSON\ObjectId($id)],
                    ['$set' => (array)$data]
                );
                $db->executeBulkWrite($namespace, $bulk);
                echo json_encode(["status" => "success", "message" => "Plantilla actualizada."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta ID de plantilla."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));
        if (!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $db->executeBulkWrite($namespace, $bulk);
                echo json_encode(["status" => "success", "message" => "Plantilla eliminada."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta ID de plantilla."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido."]);
        break;
}
?>
