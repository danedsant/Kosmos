<?php
include_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();
$db_name = $database->getDbName();

echo "=== SEED DATABASE KOSMOS ===\n\n";

// 1. Insertar tipos de evento
echo "1. Insertando tipos de evento...\n";
$tipos = [
    ["nombre" => "Conferencia", "descripcion" => "Evento academico con presentaciones de expertos"],
    ["nombre" => "Taller", "descripcion" => "Sesion practica interactiva con participantes"],
    ["nombre" => "Seminario", "descripcion" => "Sesion teorica especializada sobre un tema"],
    ["nombre" => "Congreso", "descripcion" => "Evento de gran escala de varios dias con multiples actividades"],
    ["nombre" => "Simposio", "descripcion" => "Encuentro academico con paneles y discusiones"]
];

foreach ($tipos as $tipo) {
    try {
        $bulk = new MongoDB\Driver\BulkWrite;
        $doc = [
            "nombre" => $tipo["nombre"],
            "descripcion" => $tipo["descripcion"],
            "activo" => true,
            "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
        ];
        $bulk->update(['nombre' => $tipo['nombre']], ['$setOnInsert' => ['_id' => new MongoDB\BSON\ObjectId()], '$set' => $doc], ['upsert' => true]);
        $db->executeBulkWrite("$db_name.tipos_evento", $bulk);
        echo "   - Tipo: {$tipo['nombre']} (OK)\n";
    } catch(Exception $e) {
        echo "   - Tipo: {$tipo['nombre']} (ya existía)\n";
    }
}

// 2. Insertar usuarios (uno de cada rol)
echo "\n2. Insertando usuarios...\n";

$usuarios = [
    [
        "nombre" => "Admin",
        "apellido" => "Kosmos",
        "email" => "admin@kosmos.com",
        "password" => "admin123",
        "cedula" => "V-00.000.000",
        "rol" => "Admin"
    ],
    [
        "nombre" => "Maria",
        "apellido" => "Gonzalez",
        "email" => "organizador@kosmos.com",
        "password" => "org123",
        "cedula" => "V-20.123.456",
        "rol" => "Organizador"
    ],
    [
        "nombre" => "Carlos",
        "apellido" => "Rodriguez",
        "email" => "ponente@kosmos.com",
        "password" => "pon123",
        "cedula" => "V-25.789.012",
        "rol" => "Ponente",
        "especialidad" => "Inteligencia Artificial",
        "institucion" => "UCV"
    ],
    [
        "nombre" => "Ana",
        "apellido" => "Perez",
        "email" => "participante@kosmos.com",
        "password" => "par123",
        "cedula" => "V-30.345.678",
        "rol" => "Participante",
        "profesion" => "Ingeniera en Sistemas",
        "institucion" => "UCV"
    ]
];

foreach ($usuarios as $u) {
    try {
        $bulk = new MongoDB\Driver\BulkWrite;
        $doc = [
            "nombre" => $u["nombre"],
            "apellido" => $u["apellido"],
            "email" => $u["email"],
            "password" => password_hash($u["password"], PASSWORD_DEFAULT),
            "cedula" => $u["cedula"],
            "rol" => $u["rol"],
            "estado" => "activo",
            "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
        ];

        if ($u["rol"] === "Ponente") {
            $doc["especialidad"] = $u["especialidad"];
            $doc["institucion"] = $u["institucion"];
        }

        if ($u["rol"] === "Participante") {
            $doc["profesion"] = $u["profesion"];
            $doc["institucion"] = $u["institucion"];
        }

        $bulk->update(['email' => $u['email']], ['$setOnInsert' => ['_id' => new MongoDB\BSON\ObjectId()], '$set' => $doc], ['upsert' => true]);
        $db->executeBulkWrite("$db_name.usuarios", $bulk);
        echo "   - [{$u['rol']}] {$u['nombre']} {$u['apellido']} ({$u['email']}) (OK)\n";
    } catch(Exception $e) {
        echo "   - [{$u['rol']}] {$u['nombre']} {$u['apellido']} (ya existía)\n";
    }
}

// 3. Insertar activo multimedia (Logo Kosmos en BSON)
echo "\n3. Insertando activo multimedia inicial (Logo institucional)...\n";
$logoPath = __DIR__ . '/../img/logo.png';
if (file_exists($logoPath)) {
    $logoBytes = file_get_contents($logoPath);
    $logoBase64 = 'data:image/png;base64,' . base64_encode($logoBytes);
    
    $bulkLogo = new MongoDB\Driver\BulkWrite;
    $logoDoc = [
        "tipo" => "logo",
        "nombre" => "logo_kosmos_oficial",
        "mimeType" => "image/png",
        "datos" => $logoBase64,
        "referenciaId" => "global",
        "metadatos" => [
            "anchoOriginal" => 512,
            "altoOriginal" => 512,
            "descripcion" => "Logo oficial del sistema Kosmos para certificados y encabezados"
        ],
        "creado_en" => new MongoDB\BSON\UTCDateTime()
    ];
    $bulkLogo->update(['tipo' => 'logo'], ['$set' => $logoDoc], ['upsert' => true]);
    $db->executeBulkWrite("$db_name.multimedia", $bulkLogo);
    echo "   - Logo Kosmos guardado en coleccion 'multimedia' (BSON Base64) (OK)\n";
} else {
    echo "   - [AVISO] Archivo img/logo.png no encontrado.\n";
}

// 4. Insertar plantillas dinamicas de certificados (Semana IV)
echo "\n4. Insertando plantillas dinamicas de certificados BSON...\n";
$plantillas = [
    [
        "nombre" => "Plantilla Estandar de Participacion",
        "tipoCertificado" => "participacion",
        "encabezado" => "KOSMOS EVENTOS ACADÉMICOS",
        "titulo" => "DE PARTICIPACIÓN",
        "subtitulo" => "Se otorga el presente reconocimiento a:",
        "cuerpoTexto" => "Por haber asistido y aprobado satisfactoriamente el {{tipo}} titulado:",
        "activo" => true
    ],
    [
        "nombre" => "Plantilla Distinguida para Ponentes",
        "tipoCertificado" => "ponente",
        "encabezado" => "KOSMOS EVENTOS ACADÉMICOS",
        "titulo" => "DE PONENTE",
        "subtitulo" => "Se otorga el presente reconocimiento como Ponente a:",
        "cuerpoTexto" => "Por su valiosa disertacion y contribucion academica en el {{tipo}} titulado:",
        "activo" => true
    ],
    [
        "nombre" => "Plantilla de Comite Organizador",
        "tipoCertificado" => "organizacion",
        "encabezado" => "KOSMOS EVENTOS ACADÉMICOS",
        "titulo" => "DE ORGANIZACIÓN",
        "subtitulo" => "Se otorga el presente reconocimiento por coordinacion a:",
        "cuerpoTexto" => "Por su destacada labor en la organizacion y ejecucion del {{tipo}} titulado:",
        "activo" => true
    ]
];

foreach ($plantillas as $p) {
    $bulkP = new MongoDB\Driver\BulkWrite;
    $pDoc = array_merge($p, [
        "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
    ]);
    $bulkP->update(['tipoCertificado' => $p['tipoCertificado']], ['$set' => $pDoc], ['upsert' => true]);
    $db->executeBulkWrite("$db_name.plantillas_certificados", $bulkP);
    echo "   - Plantilla [{$p['tipoCertificado']}] guardada en 'plantillas_certificados' (BSON) (OK)\n";
}

echo "\n=== SEED COMPLETADO (Semana I a IV) ===\n";
echo "\nCredenciales de login:\n";
echo "  Admin:         admin@kosmos.com       / admin123\n";
echo "  Organizador:   organizador@kosmos.com / org123\n";
echo "  Ponente:       ponente@kosmos.com     / pon123\n";
echo "  Participante:  participante@kosmos.com / par123\n";
echo "\nRecuerda borrar este archivo despues de ejecutarlo en produccion.\n";
?>
