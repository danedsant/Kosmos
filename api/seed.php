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
    $bulk = new MongoDB\Driver\BulkWrite;
    $doc = [
        "_id" => new MongoDB\BSON\ObjectId(),
        "nombre" => $tipo["nombre"],
        "descripcion" => $tipo["descripcion"],
        "activo" => true,
        "fecha_creacion" => new MongoDB\BSON\UTCDateTime()
    ];
    $bulk->insert($doc);
    $db->executeBulkWrite("$db_name.tipos_evento", $bulk);
    echo "   - Tipo: {$tipo['nombre']} (OK)\n";
}

// 2. Insertar usuarios (uno de cada rol)
echo "\n2. Insertando usuarios...\n";

$usuarios = [
    [
        "nombre" => "Admin",
        "apellido" => "Kosmos",
        "email" => "admin@kosmos.com",
        "password" => "admin123",
        "cedula" => "V-00.000.001",
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
    $bulk = new MongoDB\Driver\BulkWrite;
    $doc = [
        "_id" => new MongoDB\BSON\ObjectId(),
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

    $bulk->insert($doc);
    $db->executeBulkWrite("$db_name.usuarios", $bulk);
    echo "   - [{$u['rol']}] {$u['nombre']} {$u['apellido']} ({$u['email']}) (OK)\n";
}

echo "\n=== SEED COMPLETADO ===\n";
echo "\nCredenciales de login:\n";
echo "  Admin:         admin@kosmos.com       / admin123\n";
echo "  Organizador:   organizador@kosmos.com / org123\n";
echo "  Ponente:       ponente@kosmos.com     / pon123\n";
echo "  Participante:  participante@kosmos.com / par123\n";
echo "\nRecuerda borrar este archivo despues de ejecutarlo.\n";
?>
