package com.riffforge.riffforge.web;

/**
 * Parâmetros de composição enviados pelo front-end.
 *
 * <p>Espelha o corpo do {@code POST /api/generate}. Campos ausentes ou inválidos
 * são tratados com valores padrão pelo {@link com.riffforge.riffforge.engine.RiffEngine}.</p>
 *
 * <pre>{@code
 * { "afinacao": "Drop B", "bpm": 180, "subgenero": "Death Metal",
 *   "blastBeats": true, "usarIA": false }
 * }</pre>
 */
public record GenerateRequest(
        String afinacao,
        Integer bpm,
        String subgenero,
        boolean blastBeats,
        boolean usarIA
) {
}
