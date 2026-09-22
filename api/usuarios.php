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
$collection = "usuarios";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if(isset($_GET['rol'])) {
                $filter['rol'] = $_GET['rol'];
            }
            if(isset($_GET['email'])) {
                $filter['email'] = $_GET['email'];
            }
            if(isset($_GET['id'])) {
                $filter['_id'] = new MongoDB\BSON\ObjectId($_GET['id']);
            }

            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $usuarios = [];
            foreach ($cursor as $document) {
                if(isset($document->_id)) {
                    $document->id = (string)$document->_id;
                    unset($document->_id);
                }
                if(isset($document->password)) {
                    unset($document->password);
                }
                $usuarios[] = $document;
            }
            echo json_encode(["status" => "success", "data" => $usuarios]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->nombre) && !empty($data->apellido) && !empty($data->rol) && !empty($data->email) && !empty($data->password) && !empty($data->cedula)) {
            $rolesPermitidos = ['Admin', 'Organizador', 'Ponente', 'Participante'];
            if (!in_array($data->rol, $rolesPermitidos)) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Rol no valido."]);
                exit;
            }

            if($data->rol === 'Ponente' && (empty($data->especialidad) || empty($data->institucion))) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Para el rol Ponente se requiere especialidad e institucion."]);
                exit;
            }

            if($data->rol === 'Participante' && (empty($data->profesion) || empty($data->institucion))) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Para el rol Participante se requiere profesion e institucion."]);
                exit;
            }

            try {
                $bulk = new MongoDB\Driver\BulkWrite;

                $usuario = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "nombre" => $data->nombre,
                    "apellido" => $data->apellido,
                    "email" => $data->email,
                    "password" => password_hash($data->password, PASSWORD_DEFAULT),
                    "cedula" => $data->cedula,
                    "rol" => $data->rol,
                    "estado" => "activo",
                    "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
                ];

                if($data->rol === 'Ponente') {
                    $usuario['especialidad'] = $data->especialidad;
                    $usuario['institucion'] = $data->institucion;
                }

                if($data->rol === 'Participante') {
                    $usuario['profesion'] = $data->profesion;
                    $usuario['institucion'] = $data->institucion;
                }

                $bulk->insert($usuario);
                $result = $db->executeBulkWrite($namespace, $bulk);

                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Usuario creado exitosamente.",
                    "id" => (string)$usuario['_id']
                ]);
            } catch(MongoDB\Driver\Exception\BulkWriteException $e) {
                http_response_code(409);
                echo json_encode(["status" => "error", "message" => "Ya existe un usuario con ese email o cedula."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Datos incompletos. Se requiere nombre, apellido, rol, email, password y cedula."]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;

                $updateData = [];
                if(isset($data->nombre)) $updateData['nombre'] = $data->nombre;
                if(isset($data->apellido)) $updateData['apellido'] = $data->apellido;
                if(isset($data->email)) $updateData['email'] = $data->email;
                if(isset($data->cedula)) $updateData['cedula'] = $data->cedula;
                if(isset($data->rol)) $updateData['rol'] = $data->rol;
                if(isset($data->estado)) $updateData['estado'] = $data->estado;
                if(isset($data->password)) $updateData['password'] = password_hash($data->password, PASSWORD_DEFAULT);
                if(isset($data->especialidad)) $updateData['especialidad'] = $data->especialidad;
                if(isset($data->institucion)) $updateData['institucion'] = $data->institucion;
                if(isset($data->profesion)) $updateData['profesion'] = $data->profesion;

                $bulk->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->id)],
                    ['$set' => $updateData]
                );

                $result = $db->executeBulkWrite($namespace, $bulk);

                echo json_encode(["status" => "success", "message" => "Usuario actualizado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del usuario."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $result = $db->executeBulkWrite($namespace, $bulk);

                if($result->getDeletedCount() > 0) {
                    echo json_encode(["status" => "success", "message" => "Usuario eliminado."]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Usuario no encontrado."]);
                }
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del usuario a eliminar."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
        break;
}
?>
