<?php
header("Access-Control-Allow-Origin: *");
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

function resolverTipoNombre($db, $db_name, $tipoId) {
    if (empty($tipoId)) return 'Evento';
    try {
        $q = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($tipoId)]);
        $c = $db->executeQuery("$db_name.tipos_evento", $q);
        $t = current($c->toArray());
        return $t ? ($t->nombre ?? 'Evento') : 'Evento';
    } catch(Exception $e) {
        return 'Evento';
    }
}

function obtenerUsuario($db, $db_name, $usuarioId) {
    try {
        $q = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($usuarioId)]);
        $c = $db->executeQuery("$db_name.usuarios", $q);
        return current($c->toArray());
    } catch(Exception $e) {
        return null;
    }
}

function generarCertificadoXml($evento, $tipoNombre, $persona, $certId, $codigo, $emisionStr, $tipoCert, $horas, $qrUrl) {
    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->formatOutput = true;

    $kosmos = $dom->createElement('kosmos');
    $dom->appendChild($kosmos);

    $eventoNode = $dom->createElement('evento');
    $eventoNode->setAttribute('id', (string)($evento->_id ?? $evento->id ?? ''));
    $kosmos->appendChild($eventoNode);

    $eventoNode->appendChild($dom->createElement('nombre', htmlspecialchars($evento->nombre ?? 'Evento')));
    $eventoNode->appendChild($dom->createElement('tipo', htmlspecialchars($tipoNombre)));
    if (!empty($evento->fechaInicio)) {
        $eventoNode->appendChild($dom->createElement('fechaInicio', htmlspecialchars($evento->fechaInicio)));
    }
    if (!empty($evento->fechaFin)) {
        $eventoNode->appendChild($dom->createElement('fechaFin', htmlspecialchars($evento->fechaFin)));
    }

    $participantesNode = $dom->createElement('participantes');
    $pNode = $dom->createElement('participante');
    $pNode->setAttribute('id', (string)($persona->_id ?? $persona->id ?? ''));
    $pNode->appendChild($dom->createElement('nombre', htmlspecialchars($persona->nombre ?? '')));
    $pNode->appendChild($dom->createElement('apellido', htmlspecialchars($persona->apellido ?? '')));
    $pNode->appendChild($dom->createElement('cedula', htmlspecialchars($persona->cedula ?? '')));
    if (!empty($persona->institucion)) {
        $pNode->appendChild($dom->createElement('institucion', htmlspecialchars($persona->institucion)));
    }
    $participantesNode->appendChild($pNode);
    $eventoNode->appendChild($participantesNode);

    $certificadosNode = $dom->createElement('certificados');
    $cNode = $dom->createElement('certificado');
    $cNode->setAttribute('id', (string)$certId);
    $cNode->appendChild($dom->createElement('codigoCertificado', htmlspecialchars($codigo)));
    $cNode->appendChild($dom->createElement('fechaEmision', htmlspecialchars($emisionStr)));
    $cNode->appendChild($dom->createElement('tipo', htmlspecialchars($tipoCert)));
    $cNode->appendChild($dom->createElement('horasDuracion', htmlspecialchars((string)$horas)));
    $cNode->appendChild($dom->createElement('qrUrl', htmlspecialchars($qrUrl)));
    $certificadosNode->appendChild($cNode);
    $eventoNode->appendChild($certificadosNode);

    return $dom->saveXML();
}

switch($method) {
    case 'GET':
        try {
            $filter = [];
            if(isset($_GET['id'])) {
                $filter['_id'] = new MongoDB\BSON\ObjectId($_GET['id']);
            }
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
            if(!empty($_GET['tipoEvento'])) {
                $tipoNombre = trim($_GET['tipoEvento']);
                if (preg_match('/^[a-f\d]{24}$/i', $tipoNombre)) {
                    $tipoNombre = resolverTipoNombre($db, $db_name, $tipoNombre);
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

                $orTipo = [
                    ['datosEmbebidos.evento.tipo' => new MongoDB\BSON\Regex('^' . preg_quote($tipoNombre) . '$', 'i')]
                ];
                if (!empty($evIds)) {
                    $orTipo[] = ['eventoId' => ['$in' => $evIds]];
                }

                $filter['$or'] = $orTipo;
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

            // Descarga o visualización de XML individual
            if (isset($_GET['formato']) && $_GET['formato'] === 'xml') {
                if (count($certificados) === 0) {
                    http_response_code(404);
                    header("Content-Type: application/xml; charset=UTF-8");
                    echo '<?xml version="1.0" encoding="UTF-8"?><error>Certificado no encontrado</error>';
                    exit;
                }
                $cert = $certificados[0];
                header("Content-Type: application/xml; charset=UTF-8");
                if (isset($_GET['download']) && $_GET['download'] === '1') {
                    $fn = "certificado_" . ($cert->codigoCertificado ?? 'doc') . ".xml";
                    header("Content-Disposition: attachment; filename=\"$fn\"");
                }
                echo !empty($cert->contenidoXml) ? $cert->contenidoXml : '<?xml version="1.0" encoding="UTF-8"?><error>Sin contenido XML</error>';
                exit;
            }

            // Consulta única (por ID o código)
            if (isset($_GET['id']) || isset($_GET['codigoCertificado'])) {
                header("Content-Type: application/json; charset=UTF-8");
                if (count($certificados) > 0) {
                    echo json_encode(["status" => "success", "data" => $certificados[0]]);
                } else {
                    http_response_code(404);
                    echo json_encode(["status" => "error", "message" => "Certificado no encontrado."]);
                }
                exit;
            }

            header("Content-Type: application/json; charset=UTF-8");
            echo json_encode(["status" => "success", "data" => $certificados]);
        } catch(Exception $e) {
            header("Content-Type: application/json; charset=UTF-8");
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $e->getMessage()]);
        }
        break;

    case 'POST':
        header("Content-Type: application/json; charset=UTF-8");
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
                $persona = obtenerUsuario($db, $db_name, $personaId);
                if (!$persona) {
                    http_response_code(400);
                    echo json_encode(["status" => "error", "message" => "Persona no encontrada en el sistema."]);
                    break;
                }

                $tipoNombre = resolverTipoNombre($db, $db_name, $evento->tipoId ?? null);
                $certObjectId = new MongoDB\BSON\ObjectId();
                $codigo = "KOSMOS-" . date("Y") . "-" . strtoupper(substr(md5(uniqid()), 0, 8));
                $fechaEmisionUtc = new MongoDB\BSON\UTCDateTime();
                $emisionFechaStr = date("Y-m-d");
                $horas = (int)($data->horasDuracion ?? ($evento->horasDuracion ?? 0));

                // Construcción de URL de verificación pública para el QR
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
                $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
                $qrUrl = "$protocol://$host/public/index.html?verificar=$codigo";

                // Generación automatizada del documento XML individual (Semana IV)
                $xmlString = generarCertificadoXml($evento, $tipoNombre, $persona, $certObjectId, $codigo, $emisionFechaStr, $data->tipo, $horas, $qrUrl);

                // Registro del QR en la colección multimedia (Semana IV)
                try {
                    $bulkMedia = new MongoDB\Driver\BulkWrite;
                    $qrDoc = [
                        "_id" => new MongoDB\BSON\ObjectId(),
                        "tipo" => "qr",
                        "nombre" => "qr_" . $codigo,
                        "mimeType" => "image/png",
                        "datos" => $data->qrBase64 ?? "", // Puede ser sincronizado por el cliente o URL
                        "referenciaId" => $codigo,
                        "metadatos" => [
                            "url" => $qrUrl,
                            "eventoId" => (string)$evento->_id,
                            "personaId" => (string)$persona->_id,
                            "codigoCertificado" => $codigo
                        ],
                        "creado_en" => new MongoDB\BSON\UTCDateTime()
                    ];
                    $bulkMedia->insert($qrDoc);
                    $db->executeBulkWrite("$db_name.multimedia", $bulkMedia);
                } catch(Exception $eMedia) {
                    // Continuar si falla multimedia para no bloquear el certificado
                }

                // Estructura del Certificado con datos embebidos e integración XML (Semana IV)
                $certificado = [
                    "_id" => $certObjectId,
                    "eventoId" => (string)$evento->_id,
                    "codigoCertificado" => $codigo,
                    "fechaEmision" => $fechaEmisionUtc,
                    "tipo" => $data->tipo,
                    "horasDuracion" => $horas,
                    "contenidoXml" => $xmlString,
                    "qrUrl" => $qrUrl,
                    "datosEmbebidos" => [
                        "participante" => [
                            "id" => (string)$persona->_id,
                            "nombre" => $persona->nombre ?? '',
                            "apellido" => $persona->apellido ?? '',
                            "cedula" => $persona->cedula ?? '',
                            "email" => $persona->email ?? '',
                            "institucion" => $persona->institucion ?? ($persona->profesion ?? '')
                        ],
                        "evento" => [
                            "id" => (string)$evento->_id,
                            "nombre" => $evento->nombre ?? '',
                            "tipo" => $tipoNombre,
                            "fechaInicio" => $evento->fechaInicio ?? '',
                            "fechaFin" => $evento->fechaFin ?? '',
                            "horasDuracion" => $horas
                        ]
                    ]
                ];

                if ($data->tipo === 'ponente') {
                    $certificado['ponenteId'] = $personaId;
                } else {
                    $certificado['participanteId'] = $personaId;
                }
                
                $bulk = new MongoDB\Driver\BulkWrite;
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
                    "message" => "Certificado generado exitosamente (BSON + XML vinculado).", 
                    "id" => (string)$certObjectId,
                    "codigoCertificado" => $codigo,
                    "qrUrl" => $qrUrl,
                    "contenidoXml" => $xmlString
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
        header("Content-Type: application/json; charset=UTF-8");
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
        header("Content-Type: application/json; charset=UTF-8");
        http_response_code(405);
        echo json_encode(["status" => "error", "message" => "Método no permitido"]);
        break;
}
?>
