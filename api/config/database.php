<?php
// Configuración de la base de datos (MongoDB) usando Vanilla PHP
class Database {
    private $host = "localhost";
    private $port = "27017";
    private $db_name = "kosmos_db";
    private $manager;

    public function getConnection() {
        $this->manager = null;

        try {
            // Se utiliza la clase nativa MongoDB\Driver\Manager para no depender de librerías externas
            $this->manager = new MongoDB\Driver\Manager("mongodb://" . $this->host . ":" . $this->port);
        } catch(MongoDB\Driver\Exception\Exception $e) {
            echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
            exit;
        }

        return $this->manager;
    }

    public function getDbName() {
        return $this->db_name;
    }
}
?>
