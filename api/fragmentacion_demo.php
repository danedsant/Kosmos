<?php
// Kosmos Semana III: Simulacion de fragmentacion horizontal / distribucion (Grupo 4)
// Fragmento A (operativo): eventos_activos   -> estado planificado|activo
// Fragmento B (historico/remoto): eventos_historicos -> estado finalizado|cancelado
// GET api/fragmentacion_demo.php?accion=stats|rebuild|consultar&fragmento=activos|historicos|todos
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

$accion = $_GET['accion'] ?? 'stats';
$fragmento = $_GET['fragmento'] ?? 'todos';

function contar($db, $db_name, $col) {
    $cmd = new MongoDB\Driver\Command(['aggregate' => $col, 'pipeline' => [['$count' => 'total']], 'cursor' => new stdClass]);
    try {
        $c = $db->executeCommand($db_name, $cmd);
        $r = current($c->toArray());
        return $r ? $r->total : 0;
    } catch (Exception $e) { return 0; }
}

try {
    if ($accion === 'rebuild') {
        // Reconstruir fragmentos desde la coleccion principal (simula shard por estado)
        foreach (['eventos_activos', 'eventos_historicos'] as $frag) {
            try { $db->executeCommand($db_name, new MongoDB\Driver\Command(['delete' => $frag, 'deletes' => [['q' => (object)[], 'limit' => 0]]])); } catch (Exception $e) {}
        }
        $q = new MongoDB\Driver\Query([]);
        $cursor = $db->executeQuery("$db_name.eventos", $q);
        $nA = 0; $nH = 0;
        $bulkA = new MongoDB\Driver\BulkWrite; $bulkH = new MongoDB\Driver\BulkWrite;
        $hasA = false; $hasH = false;
        foreach ($cursor as $doc) {
            $arr = (array)$doc;
            if (in_array($doc->estado ?? '', ['finalizado', 'cancelado'])) { $bulkH->insert($arr); $hasH = true; $nH++; }
            else { $bulkA->insert($arr); $hasA = true; $nA++; }
        }
        if ($hasA) $db->executeBulkWrite("$db_name.eventos_activos", $bulkA);
        if ($hasH) $db->executeBulkWrite("$db_name.eventos_historicos", $bulkH);
        echo json_encode(["status" => "success", "message" => "Fragmentos reconstruidos.", "activos" => $nA, "historicos" => $nH,
            "criterio" => "estado IN (planificado,activo) vs (finalizado,cancelado)",
            "sharding_key_propuesto" => "estado + fechaInicio (shard key para MongoDB sharded cluster)"]);
        exit;
    }

    if ($accion === 'consultar') {
        $cols = $fragmento === 'activos' ? ['eventos_activos'] : ($fragmento === 'historicos' ? ['eventos_historicos'] : ['eventos_activos', 'eventos_historicos']);
        $data = [];
        foreach ($cols as $col) {
            try {
                $q = new MongoDB\Driver\Query([], ['limit' => 50, 'sort' => ['fechaInicio' => 1]]);
                $c = $db->executeQuery("$db_name.$col", $q);
                foreach ($c as $d) {
                    if (isset($d->_id) && $d->_id instanceof MongoDB\BSON\ObjectId) { $d->id = (string)$d->_id; unset($d->_id); }
                    $d->_fragmento = $col;
                    $data[] = $d;
                }
            } catch (Exception $e) { /* fragmento aun no creado: sugerir rebuild */ }
        }
        echo json_encode(["status" => "success", "fragmento" => $fragmento, "total" => count($data), "data" => $data,
            "nota" => "Si esta vacio, ejecute accion=rebuild primero."]);
        exit;
    }

    // stats por defecto: conteos + distribucion por estado via pipeline
    $cmd = new MongoDB\Driver\Command(['aggregate' => 'eventos', 'pipeline' => [
        ['$group' => ['_id' => '$estado', 'total' => ['$sum' => 1]]],
        ['$sort' => ['total' => -1]]
    ], 'cursor' => new stdClass]);
    $porEstado = [];
    try {
        foreach ($db->executeCommand($db_name, $cmd) as $d) $porEstado[] = $d;
    } catch (Exception $e) {}

    echo json_encode(["status" => "success",
        "fragmentos" => [
            ["nombre" => "eventos_activos", "criterio" => "planificado|activo (operativo)", "total" => contar($db, $db_name, 'eventos_activos')],
            ["nombre" => "eventos_historicos", "criterio" => "finalizado|cancelado (historico/remoto)", "total" => contar($db, $db_name, 'eventos_historicos')],
            ["nombre" => "eventos (principal)", "total" => contar($db, $db_name, 'eventos')]
        ],
        "distribucion_por_estado" => $porEstado,
        "diseno" => "Fragmentacion horizontal por estado; clave de shard propuesta: {estado:1, fechaInicio:1}. El fragmento historico podria moverse a almacenamiento remoto/frio."
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
