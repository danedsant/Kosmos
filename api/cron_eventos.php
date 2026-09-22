<?php
// Kosmos: migracion automatica planificado -> activo -> finalizado segun fechas.
// Uso HTTP:  /api/cron_eventos.php
// Uso CLI:   php api/cron_eventos.php
// Sugerido: programarlo 1 vez al dia (cron / Task Scheduler). El GET de eventos
// y los POST de inscripciones/certificados ya migran de forma lazy; esto es refuerzo.
header("Content-Type: application/json; charset=UTF-8");
include_once __DIR__ . '/config/database.php';
include_once __DIR__ . '/middleware/ReglasNegocio.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

try {
    $query = new MongoDB\Driver\Query(['estado' => ['$in' => ['planificado', 'activo']]]);
    $cursor = $db->executeQuery("$db_name.eventos", $query);
    $migrados = 0;
    $detalle = [];
    foreach ($cursor as $doc) {
        $antes = $doc->estado ?? '?';
        $r = ReglasNegocio::migracionAutomatica($db, $db_name, $doc);
        if ($r['cambio']) {
            $migrados++;
            $detalle[] = ['id' => (string)$doc->_id, 'de' => $antes, 'a' => $doc->estado];
        }
    }
    echo json_encode(["status" => "success", "migrados" => $migrados, "detalle" => $detalle], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
