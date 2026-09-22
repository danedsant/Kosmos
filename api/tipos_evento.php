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
$collection = "tipos_evento";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if(isset($_GET['activo'])) {
                $filter['activo'] = $_GET['activo'] === 'true';
            }
            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $tipos = [];
            foreach ($cursor as $document) {
                if(isset($document->_id)) {
                    $document->id = (string)$document->_id;
                    unset($document->_id);
                }
                $tipos[] = $document;
            }
            echo json_encode(["status" => "success", "data" => $tipos]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->nombre)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;

                $tipo = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "nombre" => strtolower(trim($data->nombre)),
                    "descripcion" => $data->descripcion ?? "",
                    "activo" => true,
                    "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
                ];

                $bulk->insert($tipo);
                $result = $db->executeBulkWrite($namespace, $bulk);

                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Tipo de evento creado exitosamente.",
                    "id" => (string)$tipo['_id']
                ]);
            } catch(MongoDB\Driver\Exception\BulkWriteException $e) {
                http_response_code(409);
                echo json_encode(["status" => "error", "message" => "Ya existe un tipo de evento con ese nombre."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Datos incompletos. Se requiere nombre."]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;

                $updateData = [];
                if(isset($data->nombre)) $updateData['nombre'] = strtolower(trim($data->nombre));
                if(isset($data->descripcion)) $updateData['descripcion'] = $data->descripcion;
                if(isset($data->activo)) $updateData['activo'] = $data->activo;

                $bulk->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->id)],
                    ['$set' => $updateData]
                );

                $result = $db->executeBulkWrite($namespace, $bulk);

                echo json_encode(["status" => "success", "message" => "Tipo de evento actualizado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del tipo de evento."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $result = $db->executeBulkWrite($namespace, $bulk);

                echo json_encode(["status" => "success", "message" => "Tipo de evento eliminado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del tipo de evento."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
        break;
}
?>
