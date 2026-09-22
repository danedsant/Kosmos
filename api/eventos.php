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
$collection = "eventos";
$namespace = "$db_name.$collection";

$method = $_SERVER['REQUEST_METHOD'];

function resolverTipo($db, $db_name, $tipoId) {
    try {
        $query = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($tipoId)]);
        $cursor = $db->executeQuery("$db_name.tipos_evento", $query);
        $tipo = current($cursor->toArray());
        if ($tipo) {
            if(isset($tipo->_id)) {
                $tipo->id = (string)$tipo->_id;
                unset($tipo->_id);
            }
            return $tipo;
        }
        return null;
    } catch(Exception $e) {
        return null;
    }
}

function resolverOrganizador($db, $db_name, $orgId) {
    try {
        $query = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($orgId)]);
        $cursor = $db->executeQuery("$db_name.usuarios", $query);
        $org = current($cursor->toArray());
        if ($org) {
            if(isset($org->_id)) {
                $org->id = (string)$org->_id;
                unset($org->_id);
            }
            if(isset($org->password)) unset($org->password);
            return $org;
        }
        return null;
    } catch(Exception $e) {
        return null;
    }
}

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if(isset($_GET['estado'])) $filter['estado'] = $_GET['estado'];
            if(isset($_GET['organizadorId'])) $filter['organizadorId'] = $_GET['organizadorId'];
            if(isset($_GET['tipoId'])) $filter['tipoId'] = $_GET['tipoId'];

            $query = new MongoDB\Driver\Query($filter);
            $cursor = $db->executeQuery($namespace, $query);
            $eventos = [];
            foreach ($cursor as $document) {
                // Migracion automatica planificado->activo->finalizado segun fechas
                $mig = ReglasNegocio::migracionAutomatica($db, $db_name, $document);
                $document = $mig['evento'];
                if(isset($document->_id)) {
                    $document->id = (string)$document->_id;
                    unset($document->_id);
                }
                if(isset($document->tipoId)) {
                    $tipo = resolverTipo($db, $db_name, $document->tipoId);
                    $document->tipoNombre = $tipo ? $tipo->nombre : 'desconocido';
                }
                $eventos[] = $document;
            }
            echo json_encode(["status" => "success", "data" => $eventos]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->nombre) && !empty($data->tipoId) && !empty($data->organizadorId)) {
            try {
                $tipoExiste = resolverTipo($db, $db_name, $data->tipoId);
                if(!$tipoExiste) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "El tipo de evento especificado no existe."]);
                    exit;
                }

                // Validar fechas coherentes
                if (!empty($data->fechaInicio) && !empty($data->fechaFin) && $data->fechaInicio > $data->fechaFin) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "La fecha de inicio debe ser anterior a la fecha de fin."]);
                    exit;
                }

                // Validar cupos no negativos
                if (isset($data->cuposDisponibles) && $data->cuposDisponibles < 0) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Los cupos no pueden ser negativos."]);
                    exit;
                }

                // Validar estado inicial: lineal estricta + coherencia con fechas
                $estadosValidos = ['planificado', 'activo', 'finalizado', 'cancelado'];
                if (!empty($data->estado) && !in_array($data->estado, $estadosValidos)) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Estado no valido."]);
                    exit;
                }
                if (!empty($data->estado) && in_array($data->estado, ['cancelado', 'finalizado'])) {
                    $t = ReglasNegocio::validarTransicionEstado(
                        'planificado', $data->estado,
                        $data->fechaInicio ?? '', $data->fechaFin ?? '',
                        $data->horaInicio ?? '', $data->horaFin ?? ''
                    );
                    if (!$t['ok']) {
                        http_response_code(400);
                        echo json_encode(["status" => "error", "message" => $t['message']]);
                        exit;
                    }
                    $estadoInicial = $data->estado;
                } else {
                    $estadoInicial = ReglasNegocio::resolverEstadoAutomatico(
                        'planificado', $data->fechaInicio ?? '', $data->fechaFin ?? '',
                        $data->horaInicio ?? '', $data->horaFin ?? ''
                    );
                }

                $bulk = new MongoDB\Driver\BulkWrite;

                $evento = [
                    "_id" => new MongoDB\BSON\ObjectId(),
                    "nombre" => $data->nombre,
                    "descripcion" => $data->descripcion ?? "",
                    "tipoId" => $data->tipoId,
                    "fechaInicio" => $data->fechaInicio ?? "",
                    "fechaFin" => $data->fechaFin ?? "",
                    "horaInicio" => $data->horaInicio ?? "",
                    "horaFin" => $data->horaFin ?? "",
                    "horasDuracion" => $data->horasDuracion ?? 0,
                    "lugar" => $data->lugar ?? ["nombre" => "", "direccion" => "", "aula" => "", "capacidad" => 0],
                    "estado" => $estadoInicial,
                    "organizadorId" => $data->organizadorId,
                    "cuposDisponibles" => $data->cuposDisponibles ?? 0,
                    "temas" => $data->temas ?? [],
                    "ponentes_ids" => $data->ponentes_ids ?? [],
                    "inscripciones_ids" => [],
                    "creado_en" => new MongoDB\BSON\UTCDateTime()
                ];

                $bulk->insert($evento);
                $result = $db->executeBulkWrite($namespace, $bulk);

                http_response_code(201);
                echo json_encode([
                    "status" => "success",
                    "message" => "Evento creado exitosamente.",
                    "id" => (string)$evento['_id']
                ]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Datos incompletos. Se requiere nombre, tipoId y organizadorId."]);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                // Cargar estado actual para validar transicion lineal + fechas
                $actual = ReglasNegocio::eventoPorId($db, $db_name, $data->id);
                if (!$actual) {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Evento no encontrado."]);
                    exit;
                }
                // Auto-migrar primero (si ya entro en fecha, el estado base cambia solo)
                $mig = ReglasNegocio::migracionAutomatica($db, $db_name, $actual);
                $actual = $mig['evento'];
                $estadoActual = $actual->estado ?? 'planificado';

                $nuevaInicio = $data->fechaInicio ?? ($actual->fechaInicio ?? '');
                $nuevaFin = $data->fechaFin ?? ($actual->fechaFin ?? '');
                $nuevaHoraInicio = $data->horaInicio ?? ($actual->horaInicio ?? '');
                $nuevaHoraFin = $data->horaFin ?? ($actual->horaFin ?? '');
                if (!empty($nuevaInicio) && !empty($nuevaFin) && $nuevaInicio > $nuevaFin) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "La fecha de inicio debe ser anterior a la fecha de fin."]);
                    exit;
                }
                // Validar horas si mismo dia
                if (!empty($nuevaInicio) && !empty($nuevaFin) && $nuevaInicio === $nuevaFin) {
                    if (!empty($nuevaHoraInicio) && !empty($nuevaHoraFin) && $nuevaHoraInicio >= $nuevaHoraFin) {
                        http_response_code(400);
                        echo json_encode(["status" => "error", "message" => "Cuando inicio y fin son el mismo dia, la hora de inicio debe ser anterior a la de fin."]);
                        exit;
                    }
                }
                if (isset($data->cuposDisponibles) && $data->cuposDisponibles < 0) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Los cupos no pueden ser negativos."]);
                    exit;
                }

                $bulk = new MongoDB\Driver\BulkWrite;

                $updateData = [];
                if(isset($data->nombre)) $updateData['nombre'] = $data->nombre;
                if(isset($data->descripcion)) $updateData['descripcion'] = $data->descripcion;
                if(isset($data->tipoId)) {
                    $tipoExiste = resolverTipo($db, $db_name, $data->tipoId);
                    if(!$tipoExiste) {
                        http_response_code(400);
                        echo json_encode(["status" => "error", "message" => "El tipo de evento especificado no existe."]);
                        exit;
                    }
                    $updateData['tipoId'] = $data->tipoId;
                }
                if(isset($data->fechaInicio)) $updateData['fechaInicio'] = $data->fechaInicio;
                if(isset($data->fechaFin)) $updateData['fechaFin'] = $data->fechaFin;
                if(isset($data->horaInicio)) $updateData['horaInicio'] = $data->horaInicio;
                if(isset($data->horaFin)) $updateData['horaFin'] = $data->horaFin;
                if(isset($data->horasDuracion)) $updateData['horasDuracion'] = $data->horasDuracion;
                if(isset($data->lugar)) $updateData['lugar'] = $data->lugar;
                if(isset($data->estado)) {
                    if (in_array($data->estado, ['cancelado', 'finalizado'])) {
                        $t = ReglasNegocio::validarTransicionEstado(
                            $estadoActual, $data->estado, $nuevaInicio, $nuevaFin,
                            $nuevaHoraInicio, $nuevaHoraFin
                        );
                        if (!$t['ok']) {
                            http_response_code(400);
                            echo json_encode(["status" => "error", "message" => $t['message']]);
                            exit;
                        }
                        $updateData['estado'] = $data->estado;
                    } else {
                        $updateData['estado'] = ReglasNegocio::resolverEstadoAutomatico(
                            $estadoActual, $nuevaInicio, $nuevaFin,
                            $nuevaHoraInicio, $nuevaHoraFin
                        );
                    }
                } elseif (isset($data->fechaInicio) || isset($data->fechaFin) || isset($data->horaInicio) || isset($data->horaFin)) {
                    if (!in_array($estadoActual, ['cancelado', 'finalizado'])) {
                        $esperado = ReglasNegocio::resolverEstadoAutomatico(
                            $estadoActual, $nuevaInicio, $nuevaFin,
                            $nuevaHoraInicio, $nuevaHoraFin
                        );
                        if ($esperado !== $estadoActual) $updateData['estado'] = $esperado;
                    }
                }
                if(isset($data->organizadorId)) $updateData['organizadorId'] = $data->organizadorId;
                if(isset($data->cuposDisponibles)) $updateData['cuposDisponibles'] = $data->cuposDisponibles;
                if(isset($data->temas)) $updateData['temas'] = $data->temas;
                if(isset($data->ponentes_ids)) $updateData['ponentes_ids'] = $data->ponentes_ids;
                if(isset($data->inscripciones_ids)) $updateData['inscripciones_ids'] = $data->inscripciones_ids;

                if (empty($updateData)) {
                    echo json_encode(["status" => "success", "message" => "Sin cambios. Estado actual: $estadoActual."]);
                    exit;
                }
                $bulk->update(
                    ['_id' => new MongoDB\BSON\ObjectId($data->id)],
                    ['$set' => $updateData]
                );

                $result = $db->executeBulkWrite($namespace, $bulk);

                echo json_encode(["status" => "success", "message" => "Evento actualizado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del evento."]);
        }
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));

        if(!empty($data->id)) {
            try {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->delete(['_id' => new MongoDB\BSON\ObjectId($data->id)]);
                $result = $db->executeBulkWrite($namespace, $bulk);

                echo json_encode(["status" => "success", "message" => "Evento eliminado."]);
            } catch(Exception $e) {
                http_response_code(500);
                echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            }
        } else {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Falta el ID del evento."]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Metodo no permitido"]);
        break;
}
?>
