<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
    exit;
}

$accion = isset($_GET['accion']) ? $_GET['accion'] : 'login';
$data = json_decode(file_get_contents("php://input"));

if ($accion === 'login') {
    if (empty($data->email) || empty($data->password)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Se requiere email y password."]);
        exit;
    }

    try {
        $query = new MongoDB\Driver\Query(['email' => $data->email]);
        $cursor = $db->executeQuery("$db_name.usuarios", $query);
        $usuario = current($cursor->toArray());

        if (!$usuario) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Credenciales incorrectas."]);
            exit;
        }

        if (!password_verify($data->password, $usuario->password)) {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Credenciales incorrectas."]);
            exit;
        }

        if (isset($usuario->estado) && $usuario->estado === 'inactivo') {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Usuario deshabilitado."]);
            exit;
        }

        $_SESSION['user_id'] = (string)$usuario->_id;
        $_SESSION['user_rol'] = $usuario->rol;
        $_SESSION['user_nombre'] = $usuario->nombre;

        $userInfo = [
            "id" => (string)$usuario->_id,
            "nombre" => $usuario->nombre,
            "apellido" => $usuario->apellido ?? '',
            "email" => $usuario->email,
            "rol" => $usuario->rol,
            "cedula" => $usuario->cedula ?? ""
        ];

        if ($usuario->rol === 'Ponente') {
            $userInfo['especialidad'] = $usuario->especialidad ?? '';
            $userInfo['institucion'] = $usuario->institucion ?? '';
        }

        if ($usuario->rol === 'Participante') {
            $userInfo['profesion'] = $usuario->profesion ?? '';
            $userInfo['institucion'] = $usuario->institucion ?? '';
        }

        echo json_encode(["status" => "success", "message" => "Login exitoso.", "user" => $userInfo]);

    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

} else if ($accion === 'registro') {
    if (empty($data->nombre) || empty($data->apellido) || empty($data->email) || empty($data->password) || empty($data->cedula)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Se requiere nombre, apellido, email, password y cedula."]);
        exit;
    }

    try {
        // Verificar email duplicado
        $queryEmail = new MongoDB\Driver\Query(['email' => $data->email]);
        $cursorEmail = $db->executeQuery("$db_name.usuarios", $queryEmail);
        if (iterator_count($cursorEmail) > 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Este email ya esta registrado."]);
            exit;
        }

        // Verificar cedula duplicada
        $queryCedula = new MongoDB\Driver\Query(['cedula' => $data->cedula]);
        $cursorCedula = $db->executeQuery("$db_name.usuarios", $queryCedula);
        if (iterator_count($cursorCedula) > 0) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Esta cedula ya esta registrada."]);
            exit;
        }

        $bulk = new MongoDB\Driver\BulkWrite;

        $usuario = [
            "_id" => new MongoDB\BSON\ObjectId(),
            "nombre" => $data->nombre,
            "apellido" => $data->apellido,
            "email" => $data->email,
            "password" => password_hash($data->password, PASSWORD_DEFAULT),
            "cedula" => $data->cedula,
            "rol" => "Participante",
            "estado" => "activo",
            "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
        ];

        if (!empty($data->profesion)) $usuario['profesion'] = $data->profesion;
        if (!empty($data->institucion)) $usuario['institucion'] = $data->institucion;

        $bulk->insert($usuario);
        $result = $db->executeBulkWrite("$db_name.usuarios", $bulk);

        $_SESSION['user_id'] = (string)$usuario['_id'];
        $_SESSION['user_rol'] = 'Participante';
        $_SESSION['user_nombre'] = $usuario['nombre'];

        http_response_code(201);
        echo json_encode([
            "status" => "success",
            "message" => "Registro exitoso.",
            "user" => [
                "id" => (string)$usuario['_id'],
                "nombre" => $usuario['nombre'],
                "apellido" => $usuario['apellido'],
                "email" => $usuario['email'],
                "rol" => 'Participante',
                "cedula" => $usuario['cedula']
            ]
        ]);
    } catch(MongoDB\Driver\Exception\BulkWriteException $e) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Ya existe un usuario con ese email o cedula."]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }

} else if ($accion === 'logout') {
    session_destroy();
    echo json_encode(["status" => "success", "message" => "Sesion cerrada."]);

} else if ($accion === 'sesion') {
    if (isset($_SESSION['user_id'])) {
        $query = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($_SESSION['user_id'])]);
        $cursor = $db->executeQuery("$db_name.usuarios", $query);
        $usuario = current($cursor->toArray());

        if ($usuario) {
            $userInfo = [
                "id" => (string)$usuario->_id,
                "nombre" => $usuario->nombre,
                "apellido" => $usuario->apellido ?? '',
                "email" => $usuario->email,
                "rol" => $usuario->rol,
                "cedula" => $usuario->cedula ?? ""
            ];
            if ($usuario->rol === 'Ponente') {
                $userInfo['especialidad'] = $usuario->especialidad ?? '';
                $userInfo['institucion'] = $usuario->institucion ?? '';
            }
            if ($usuario->rol === 'Participante') {
                $userInfo['profesion'] = $usuario->profesion ?? '';
                $userInfo['institucion'] = $usuario->institucion ?? '';
            }
            echo json_encode(["status" => "success", "user" => $userInfo]);
        } else {
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Usuario no encontrado."]);
        }
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "No hay sesion activa."]);
    }

} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Accion no valida."]);
}
?>
