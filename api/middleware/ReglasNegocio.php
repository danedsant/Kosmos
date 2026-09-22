<?php
// Kosmos Semana III: Middleware centralizado de reglas de negocio (Grupo 4 MongoDB)
// Uso: require_once __DIR__ . '/middleware/ReglasNegocio.php';
// Todas las reglas que antes estaban dispersas quedan aqui para reutilizar.
class ReglasNegocio {

    public static function eventoPorId($db, $db_name, $eventoId) {
        try {
            $q = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($eventoId)]);
            $c = $db->executeQuery("$db_name.eventos", $q);
            return current($c->toArray()) ?: null;
        } catch (Exception $e) { return null; }
    }

    public static function tipoExiste($db, $db_name, $tipoId) {
        try {
            $q = new MongoDB\Driver\Query(['_id' => new MongoDB\BSON\ObjectId($tipoId)]);
            $c = $db->executeQuery("$db_name.tipos_evento", $q);
            return count($c->toArray()) > 0;
        } catch (Exception $e) { return false; }
    }

    // Regla inscripcion: evento existe, no finalizado/cancelado, fecha vigente, cupo>0, no duplicado
    public static function validarInscripcion($db, $db_name, $eventoId, $participanteId) {
        $evento = self::eventoPorId($db, $db_name, $eventoId);
        if (!$evento) return ['ok' => false, 'message' => 'Evento no encontrado.'];
        // Estado efectivo segun fechas+horas (automatico en memoria)
        $evento->estado = self::resolverEstadoAutomatico(
            $evento->estado ?? 'planificado',
            $evento->fechaInicio ?? '', $evento->fechaFin ?? '',
            $evento->horaInicio ?? '', $evento->horaFin ?? ''
        );
        if (in_array($evento->estado ?? '', ['cancelado', 'finalizado']))
            return ['ok' => false, 'message' => 'Este evento no acepta inscripciones.'];
        // Verificar si ya inicio (fecha+hora)
        $ahora = self::hoy();
        $inicio = ($evento->fechaInicio ?? '') . ($evento->horaInicio ? ' ' . $evento->horaInicio : ' 00:00');
        if (!empty($evento->fechaInicio) && $ahora >= $inicio)
            return ['ok' => false, 'message' => 'Este evento ya inicio, no es posible inscribirse.'];
        if (($evento->cuposDisponibles ?? 0) <= 0)
            return ['ok' => false, 'message' => 'No hay cupos disponibles.'];
        $q = new MongoDB\Driver\Query(['eventoId' => $eventoId, 'participanteId' => $participanteId]);
        $c = $db->executeQuery("$db_name.inscripciones", $q);
        if (count($c->toArray()) > 0)
            return ['ok' => false, 'message' => 'Ya estas inscrito en este evento.'];
        return ['ok' => true, 'evento' => $evento];
    }

    // Regla certificado: evento finalizado + inscripcion existente + asistio=true + no duplicado
    public static function validarCertificado($db, $db_name, $eventoId, $personaId, $tipo) {
        $evento = self::eventoPorId($db, $db_name, $eventoId);
        if (!$evento) return ['ok' => false, 'message' => 'Evento no encontrado.'];

        $evento->estado = self::resolverEstadoAutomatico(
            $evento->estado ?? 'planificado',
            $evento->fechaInicio ?? '', $evento->fechaFin ?? '',
            $evento->horaInicio ?? '', $evento->horaFin ?? ''
        );
        if (($evento->estado ?? '') !== 'finalizado')
            return ['ok' => false, 'message' => 'Solo se generan certificados de eventos finalizados.'];

        if ($tipo === 'ponente') {
            $ponentesIds = $evento->ponentes_ids ?? [];
            if (!in_array($personaId, $ponentesIds))
                return ['ok' => false, 'message' => 'El usuario no es ponente en este evento.'];

            $q2 = new MongoDB\Driver\Query(['eventoId' => $eventoId, 'ponenteId' => $personaId, 'tipo' => $tipo]);
            $c2 = $db->executeQuery("$db_name.certificados", $q2);
            if (count($c2->toArray()) > 0)
                return ['ok' => false, 'message' => 'Ya existe un certificado de ponente para este evento.'];
        } else {
            $q = new MongoDB\Driver\Query(['eventoId' => $eventoId, 'participanteId' => $personaId]);
            $c = $db->executeQuery("$db_name.inscripciones", $q);
            $insc = current($c->toArray());
            if (!$insc) return ['ok' => false, 'message' => 'El participante no tiene inscripcion en este evento.'];
            if (empty($insc->asistio))
                return ['ok' => false, 'message' => 'Solo se certifica asistencia real (asistio=true). Registre asistencia primero.'];

            $q2 = new MongoDB\Driver\Query(['eventoId' => $eventoId, 'participanteId' => $personaId, 'tipo' => $tipo]);
            $c2 = $db->executeQuery("$db_name.certificados", $q2);
            if (count($c2->toArray()) > 0)
                return ['ok' => false, 'message' => 'Ya existe un certificado de este tipo para este participante y evento.'];
        }

        return ['ok' => true, 'evento' => $evento];
    }

    public static function validarEvento($data, $esCreacion = true) {
        if ($esCreacion && (empty($data->nombre) || empty($data->tipoId) || empty($data->organizadorId)))
            return ['ok' => false, 'message' => 'Datos incompletos. Se requiere nombre, tipoId y organizadorId.'];
        if (!empty($data->fechaInicio) && !empty($data->fechaFin) && $data->fechaInicio > $data->fechaFin)
            return ['ok' => false, 'message' => 'La fecha de inicio debe ser anterior a la fecha de fin.'];
        // Validar horas si ambas fechas son iguales
        if (!empty($data->fechaInicio) && !empty($data->fechaFin) && $data->fechaInicio === $data->fechaFin) {
            if (!empty($data->horaInicio) && !empty($data->horaFin) && $data->horaInicio >= $data->horaFin)
                return ['ok' => false, 'message' => 'Cuando inicio y fin son el mismo dia, la hora de inicio debe ser anterior a la de fin.'];
        }
        if (isset($data->cuposDisponibles) && $data->cuposDisponibles < 0)
            return ['ok' => false, 'message' => 'Los cupos no pueden ser negativos.'];
        return ['ok' => true];
    }

    // ---------- Transiciones de estado planificado -> activo -> finalizado ----------
    const TRANSICIONES_EVENTO = [
        'planificado' => ['activo', 'cancelado'],
        'activo' => ['finalizado', 'cancelado'],
        'finalizado' => [],
        'cancelado' => [],
    ];

    public static function hoy() {
        try { date_default_timezone_set('America/Caracas'); } catch (Exception $e) {}
        return date('Y-m-d H:i');
    }

    // Estado que le corresponde segun fechas+horas (fuente automatica).
    // cancelado/finalizado son terminales y nunca cambian solos.
    public static function resolverEstadoAutomatico($estadoActual, $fechaInicio, $fechaFin, $horaInicio = '', $horaFin = '', $ahora = null) {
        $estadoActual = $estadoActual ?? 'planificado';
        if (in_array($estadoActual, ['cancelado', 'finalizado'])) return $estadoActual;
        if (empty($fechaInicio) || empty($fechaFin)) return $estadoActual;

        if ($ahora === null) $ahora = self::hoy();

        // Construir datetime completos para comparar
        $inicio = $fechaInicio . ($horaInicio ? ' ' . $horaInicio : ' 00:00');
        $fin = $fechaFin . ($horaFin ? ' ' . $horaFin : ' 23:59');

        if ($ahora < $inicio) return 'planificado';
        if ($ahora >= $inicio && $ahora <= $fin) return 'activo';
        if ($ahora > $fin) return 'finalizado';

        return $estadoActual;
    }

    // Valida cambio manual: matriz lineal estricta + coherencia con fechas+horas.
    public static function validarTransicionEstado($actual, $nuevo, $fechaInicio, $fechaFin, $horaInicio = '', $horaFin = '', $ahora = null) {
        $actual = $actual ?? 'planificado';
        $nuevo = $nuevo ?? $actual;
        if ($actual === $nuevo) return ['ok' => true];
        if ($ahora === null) $ahora = self::hoy();

        $permitidos = self::TRANSICIONES_EVENTO[$actual] ?? null;
        if ($permitidos === null)
            return ['ok' => false, 'message' => "Estado actual desconocido: $actual."];
        if (!in_array($nuevo, $permitidos))
            return ['ok' => false, 'message' => "Transicion no permitida de '$actual' a '$nuevo'. Flujo permitido: planificado -> activo -> finalizado, cualquiera -> cancelado."];

        // Construir datetime completos
        $inicio = $fechaInicio . ($horaInicio ? ' ' . $horaInicio : ' 00:00');
        $fin = $fechaFin . ($horaFin ? ' ' . $horaFin : ' 23:59');

        if ($nuevo === 'activo') {
            if (empty($fechaInicio) || empty($fechaFin))
                return ['ok' => false, 'message' => 'Para activar se requieren fechaInicio y fechaFin.'];
            if (!($ahora >= $inicio && $ahora <= $fin))
                return ['ok' => false, 'message' => "Solo se puede activar si la fecha/hora actual ($ahora) esta dentro del rango $inicio - $fin."];
        }
        if ($nuevo === 'finalizado') {
            if (empty($fechaFin))
                return ['ok' => false, 'message' => 'Para finalizar se requiere fecha de fin.'];
            if (!($ahora > $fin))
                return ['ok' => false, 'message' => "Solo se puede finalizar si ya paso la fecha/hora de fin (ahora: $ahora, fin: $fin)."];
        }
        return ['ok' => true];
    }

    // Si el evento ya entro en fecha/hora o paso su fin, lo migra y lo persiste. Retorna evento actualizado.
    public static function migracionAutomatica($db, $db_name, $evento) {
        try {
            if (!$evento || !isset($evento->estado)) return ['evento' => $evento, 'cambio' => false];
            $esperado = self::resolverEstadoAutomatico(
                $evento->estado ?? 'planificado',
                $evento->fechaInicio ?? '',
                $evento->fechaFin ?? '',
                $evento->horaInicio ?? '',
                $evento->horaFin ?? ''
            );
            if ($esperado !== ($evento->estado ?? '')) {
                $bulk = new MongoDB\Driver\BulkWrite;
                $bulk->update(
                    ['_id' => $evento->_id],
                    ['$set' => ['estado' => $esperado]]
                );
                $db->executeBulkWrite("$db_name.eventos", $bulk);
                $evento->estado = $esperado;
                return ['evento' => $evento, 'cambio' => true];
            }
            return ['evento' => $evento, 'cambio' => false];
        } catch (Exception $e) { return ['evento' => $evento, 'cambio' => false]; }
    }

    public static function validarUsuarioPorRol($data) {
        $roles = ['Admin', 'Organizador', 'Ponente', 'Participante'];
        if (!in_array($data->rol ?? '', $roles)) return ['ok' => false, 'message' => 'Rol no valido.'];
        if (($data->rol === 'Ponente') && (empty($data->especialidad) || empty($data->institucion)))
            return ['ok' => false, 'message' => 'Para el rol Ponente se requiere especialidad e institucion.'];
        if (($data->rol === 'Participante') && (empty($data->profesion) || empty($data->institucion)))
            return ['ok' => false, 'message' => 'Para el rol Participante se requiere profesion e institucion.'];
        return ['ok' => true];
    }
}
