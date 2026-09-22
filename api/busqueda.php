<?php
// Kosmos Semana III: Busqueda avanzada (texto + filtros + paginacion) con Aggregation Pipeline
// GET api/busqueda.php?texto=ia&tipoId=...&estado=activo&tema=IA&desde=2026-01-01&hasta=2026-12-31&organizadorId=...&page=1&limit=10&sort=fechaInicio&order=asc
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

try {
    $texto = trim($_GET['texto'] ?? '');
    $tipoId = $_GET['tipoId'] ?? '';
    $estado = $_GET['estado'] ?? '';
    $organizadorId = $_GET['organizadorId'] ?? '';
    $tema = trim($_GET['tema'] ?? '');
    $desde = $_GET['desde'] ?? '';
    $hasta = $_GET['hasta'] ?? '';
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(50, max(1, intval($_GET['limit'] ?? 10)));
    $sortCampo = in_array(($_GET['sort'] ?? 'fechaInicio'), ['fechaInicio', 'nombre', 'estado']) ? $_GET['sort'] : 'fechaInicio';
    $order = (($_GET['order'] ?? 'asc') === 'desc') ? -1 : 1;
    $skip = ($page - 1) * $limit;

    // --- $match dinamico ---
    $and = [];
    if ($texto !== '') {
        $rx = ['$regex' => $texto, '$options' => 'i']; // busqueda insensible, usa indice text/regular
        $and[] = ['$or' => [
            ['nombre' => $rx],
            ['descripcion' => $rx],
            ['temas' => $rx],
        ]];
    }
    if ($tipoId !== '') $and[] = ['tipoId' => $tipoId];
    if ($estado !== '') $and[] = ['estado' => $estado];
    if ($organizadorId !== '') $and[] = ['organizadorId' => $organizadorId];
    if ($tema !== '') $and[] = ['temas' => $tema];
    if ($desde !== '') $and[] = ['fechaInicio' => ['$gte' => $desde]];
    if ($hasta !== '') $and[] = ['fechaFin' => ['$lte' => $hasta]];

    $matchStage = count($and) > 0 ? ['$match' => ['$and' => $and]] : ['$match' => (object)[]];

    $pipeline = [
        $matchStage,
        // Enriquecer con nombre del tipo (join por string<->ObjectId)
        ['$lookup' => [
            'from' => 'tipos_evento',
            'let' => ['tid' => '$tipoId'],
            'pipeline' => [
                ['$match' => ['$expr' => ['$eq' => [['$toString' => '$_id'], '$$tid']]]],
                ['$project' => ['_id' => 0, 'nombre' => 1]]
            ],
            'as' => 'tipo'
        ]],
        ['$unwind' => ['path' => '$tipo', 'preserveNullAndEmptyArrays' => true]],
        ['$addFields' => ['tipoNombre' => ['$ifNull' => ['$tipo.nombre', 'desconocido']]]],
        ['$sort' => [$sortCampo => $order]],
        ['$facet' => [
            'metadata' => [['$count' => 'total']],
            'data' => [
                ['$skip' => $skip],
                ['$limit' => $limit],
                ['$project' => ['ponentes_ids' => 0, 'inscripciones_ids' => 0, 'tipo' => 0]]
            ]
        ]]
    ];

    $cmd = new MongoDB\Driver\Command(['aggregate' => 'eventos', 'pipeline' => $pipeline, 'cursor' => new stdClass]);
    $cursor = $db->executeCommand($db_name, $cmd);
    $res = current($cursor->toArray());

    $total = isset($res->metadata[0]) ? $res->metadata[0]->total : 0;
    $data = isset($res->data) ? $res->data : [];
    foreach ($data as &$d) {
        if (isset($d->_id) && $d->_id instanceof MongoDB\BSON\ObjectId) {
            $d->id = (string)$d->_id;
            unset($d->_id);
        }
    }

    echo json_encode([
        "status" => "success",
        "motor" => "aggregation-pipeline",
        "filtros" => ["texto" => $texto, "tipoId" => $tipoId, "estado" => $estado, "tema" => $tema, "desde" => $desde, "hasta" => $hasta],
        "page" => $page, "limit" => $limit, "total" => $total,
        "totalPages" => $limit > 0 ? (int)ceil($total / $limit) : 0,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
