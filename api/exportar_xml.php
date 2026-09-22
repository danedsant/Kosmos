<?php
header("Content-Type: application/xml; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

include_once 'config/database.php';

if (!isset($_GET['eventoId'])) {
    http_response_code(400);
    echo '<?xml version="1.0" encoding="UTF-8"?><error>Falta el parámetro eventoId</error>';
    exit;
}

$eventoId = $_GET['eventoId'];

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

try {
    // 1. Obtener el evento
    $queryEvento = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($eventoId)]);
    $cursorEvento = $db->executeQuery("$db_name.eventos", $queryEvento);
    $evento = current($cursorEvento->toArray());

    if (!$evento) {
        http_response_code(404);
        echo '<?xml version="1.0" encoding="UTF-8"?><error>Evento no encontrado</error>';
        exit;
    }

    // Instanciar DOMDocument para generar el XML
    $dom = new DOMDocument('1.0', 'UTF-8');
    $dom->formatOutput = true;
    
    // Opcional: Agregar el DTD (System ID)
    // $implementation = new DOMImplementation();
    // $dtd = $implementation->createDocumentType('kosmos', '', 'kosmos.dtd');
    // $dom = $implementation->createDocument('', 'kosmos', $dtd);
    // $dom->encoding = 'UTF-8';
    
    $kosmos = $dom->createElement('kosmos');
    $dom->appendChild($kosmos);

    $eventoNode = $dom->createElement('evento');
    $eventoNode->setAttribute('id', (string)$evento->_id);
    $kosmos->appendChild($eventoNode);

    // Campos básicos
    $eventoNode->appendChild($dom->createElement('nombre', htmlspecialchars($evento->nombre ?? '')));
    $eventoNode->appendChild($dom->createElement('descripcion', htmlspecialchars($evento->descripcion ?? '')));
    // Resolver tipoId -> nombre del tipo
    $tipoNombre = '';
    if(isset($evento->tipoId)) {
        try {
            $queryTipo = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($evento->tipoId)]);
            $cursorTipo = $db->executeQuery("$db_name.tipos_evento", $queryTipo);
            $tipoDoc = current($cursorTipo->toArray());
            $tipoNombre = $tipoDoc ? ($tipoDoc->nombre ?? '') : 'desconocido';
        } catch(Exception $e) {
            $tipoNombre = 'desconocido';
        }
    }
    $eventoNode->appendChild($dom->createElement('tipo', htmlspecialchars($tipoNombre)));
    $eventoNode->appendChild($dom->createElement('fechaInicio', htmlspecialchars($evento->fechaInicio ?? '')));
    $eventoNode->appendChild($dom->createElement('fechaFin', htmlspecialchars($evento->fechaFin ?? '')));
    $eventoNode->appendChild($dom->createElement('horaInicio', htmlspecialchars($evento->horaInicio ?? '')));
    $eventoNode->appendChild($dom->createElement('horaFin', htmlspecialchars($evento->horaFin ?? '')));
    
    // Lugar
    $lugar = $dom->createElement('lugar');
    $lugarData = $evento->lugar ?? (object)['nombre'=>'', 'direccion'=>'', 'aula'=>'', 'capacidad'=>0];
    $lugar->appendChild($dom->createElement('nombre', htmlspecialchars($lugarData->nombre ?? '')));
    $lugar->appendChild($dom->createElement('direccion', htmlspecialchars($lugarData->direccion ?? '')));
    $lugar->appendChild($dom->createElement('aula', htmlspecialchars($lugarData->aula ?? '')));
    $lugar->appendChild($dom->createElement('capacidad', htmlspecialchars($lugarData->capacidad ?? '0')));
    $eventoNode->appendChild($lugar);

    $eventoNode->appendChild($dom->createElement('estado', htmlspecialchars($evento->estado ?? '')));
    $eventoNode->appendChild($dom->createElement('organizador', htmlspecialchars($evento->organizadorId ?? 'N/A')));
    $eventoNode->appendChild($dom->createElement('cuposDisponibles', htmlspecialchars($evento->cuposDisponibles ?? '0')));

    // Temas
    $temasNode = $dom->createElement('temas');
    if (isset($evento->temas) && is_array($evento->temas)) {
        foreach ($evento->temas as $tema) {
            $temasNode->appendChild($dom->createElement('tema', htmlspecialchars($tema)));
        }
    }
    $eventoNode->appendChild($temasNode);

    // Ponentes
    $ponentesNode = $dom->createElement('ponentes');
    if (isset($evento->ponentes_ids) && count($evento->ponentes_ids) > 0) {
        $ponentes_objs = array_map(function($id) { return new MongoDB\BSON\ObjectId($id); }, $evento->ponentes_ids);
        $queryPonentes = new MongoDB\Driver\Query(['_id' => ['$in' => $ponentes_objs]]);
        $cursorPonentes = $db->executeQuery("$db_name.usuarios", $queryPonentes);
        
        foreach ($cursorPonentes as $ponente) {
            $pNode = $dom->createElement('ponente');
            $pNode->setAttribute('id', (string)$ponente->_id);
            $pNode->appendChild($dom->createElement('nombre', htmlspecialchars($ponente->nombre ?? '')));
            $pNode->appendChild($dom->createElement('apellido', htmlspecialchars($ponente->apellido ?? '')));
            $pNode->appendChild($dom->createElement('email', htmlspecialchars($ponente->email ?? '')));
            $pNode->appendChild($dom->createElement('institucion', htmlspecialchars($ponente->institucion ?? '')));
            $pNode->appendChild($dom->createElement('especialidad', htmlspecialchars($ponente->especialidad ?? '')));
            $ponentesNode->appendChild($pNode);
        }
    }
    $eventoNode->appendChild($ponentesNode);

    // Inscripciones y Participantes
    $participantesNode = $dom->createElement('participantes');
    $inscripcionesNode = $dom->createElement('inscripciones');
    
    $queryInscripciones = new MongoDB\Driver\Query(['eventoId' => $eventoId]);
    $cursorInscripciones = $db->executeQuery("$db_name.inscripciones", $queryInscripciones);
    $inscripciones = $cursorInscripciones->toArray();
    
    $participantes_ids = [];
    foreach ($inscripciones as $inscripcion) {
        // Armar nodo inscripción
        $iNode = $dom->createElement('inscripcion');
        $iNode->setAttribute('id', (string)$inscripcion->_id);
        $iNode->appendChild($dom->createElement('participanteRef', htmlspecialchars($inscripcion->participanteId)));
        
        // Formatear fecha
        $fechaInscripcion = '';
        if(isset($inscripcion->fechaInscripcion)) {
            $dt = $inscripcion->fechaInscripcion->toDateTime();
            $fechaInscripcion = $dt->format('Y-m-d');
        }
        
        $iNode->appendChild($dom->createElement('fechaInscripcion', $fechaInscripcion));
        $iNode->appendChild($dom->createElement('estado', htmlspecialchars($inscripcion->estado ?? '')));
        $asistioStr = (!empty($inscripcion->asistio)) ? 'true' : 'false';
        $iNode->appendChild($dom->createElement('asistio', $asistioStr));
        $inscripcionesNode->appendChild($iNode);
        
        $participantes_ids[] = new MongoDB\BSON\ObjectId($inscripcion->participanteId);
    }
    
    if (count($participantes_ids) > 0) {
        $queryParticipantes = new MongoDB\Driver\Query(['_id' => ['$in' => $participantes_ids]]);
        $cursorParticipantes = $db->executeQuery("$db_name.usuarios", $queryParticipantes);
        
        foreach ($cursorParticipantes as $participante) {
            $partNode = $dom->createElement('participante');
            $partNode->setAttribute('id', (string)$participante->_id);
            $partNode->appendChild($dom->createElement('nombre', htmlspecialchars($participante->nombre ?? '')));
            $partNode->appendChild($dom->createElement('apellido', htmlspecialchars($participante->apellido ?? '')));
            $partNode->appendChild($dom->createElement('email', htmlspecialchars($participante->email ?? '')));
            $partNode->appendChild($dom->createElement('institucion', htmlspecialchars($participante->institucion ?? '')));
            $partNode->appendChild($dom->createElement('profesion', htmlspecialchars($participante->profesion ?? '')));
            $partNode->appendChild($dom->createElement('cedula', htmlspecialchars($participante->cedula ?? '')));
            $participantesNode->appendChild($partNode);
        }
    }
    
    $eventoNode->appendChild($participantesNode);
    $eventoNode->appendChild($inscripcionesNode);

    // Certificados
    $certificadosNode = $dom->createElement('certificados');
    $queryCertificados = new MongoDB\Driver\Query(['eventoId' => $eventoId]);
    $cursorCertificados = $db->executeQuery("$db_name.certificados", $queryCertificados);
    
    foreach ($cursorCertificados as $certificado) {
        $cNode = $dom->createElement('certificado');
        $cNode->setAttribute('id', (string)$certificado->_id);
        $cNode->appendChild($dom->createElement('participanteRef', htmlspecialchars($certificado->participanteId ?? '')));
        $cNode->appendChild($dom->createElement('codigoCertificado', htmlspecialchars($certificado->codigoCertificado ?? '')));
        
        $fechaEmision = '';
        if(isset($certificado->fechaEmision)) {
            $dt = $certificado->fechaEmision->toDateTime();
            $fechaEmision = $dt->format('Y-m-d');
        }
        $cNode->appendChild($dom->createElement('fechaEmision', $fechaEmision));
        $cNode->appendChild($dom->createElement('tipo', htmlspecialchars($certificado->tipo ?? '')));
        $cNode->appendChild($dom->createElement('horasDuracion', htmlspecialchars($certificado->horasDuracion ?? '0')));
        
        $certificadosNode->appendChild($cNode);
    }
    $eventoNode->appendChild($certificadosNode);

    // Imprimir el XML
    echo $dom->saveXML();

} catch (Exception $e) {
    http_response_code(500);
    echo '<?xml version="1.0" encoding="UTF-8"?><error>' . htmlspecialchars($e->getMessage()) . '</error>';
}
?>
