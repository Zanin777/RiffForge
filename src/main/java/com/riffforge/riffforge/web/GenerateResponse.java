package com.riffforge.riffforge.web;

import java.util.List;

/**
 * Riff forjado devolvido pelo {@code POST /api/generate}.
 *
 * <p>Inclui a tablatura ASCII pronta para o front renderizar ({@link #tab}) junto
 * dos metadados e da estrutura de seções — o suficiente para preencher os chips e
 * os segmentos da tela sem nenhum processamento extra no cliente.</p>
 */
public record GenerateResponse(
        Afinacao afinacao,
        int bpm,
        String subgenero,
        boolean blastBeats,
        List<String> estrutura,
        String tab
) {

    /** Afinação resolvida, com as cordas da mais grave para a mais aguda. */
    public record Afinacao(String nome, List<String> cordas) {
    }
}
