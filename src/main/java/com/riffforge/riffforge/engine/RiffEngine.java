package com.riffforge.riffforge.engine;

import com.riffforge.riffforge.web.GenerateRequest;
import com.riffforge.riffforge.web.GenerateResponse;

import java.util.Arrays;
import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

/**
 * Motor determinístico de geração de riffs (versão enxuta — Fase 1).
 *
 * <p>Porta o algoritmo do mock {@code gerar()} do front-end para Java: monta uma
 * grade de 16 slots × 2 medidas, marca a corda grave conforme o padrão rítmico do
 * subgênero e espalha acentos nas cordas agudas, renderizando tudo em tablatura
 * ASCII. A aleatoriedade da variação é controlada por um {@link Random} injetável,
 * o que mantém os testes determinísticos.</p>
 */
@Service
public class RiffEngine {

    private static final int SLOTS = 16;
    private static final int MEDIDAS = 2;
    private static final double CHANCE_FILL = 0.08;

    /** Geração normal (variação aleatória a cada chamada). */
    public GenerateResponse gerar(GenerateRequest req) {
        return gerar(req, new Random());
    }

    /** Geração com fonte de aleatoriedade explícita (usada nos testes). */
    public GenerateResponse gerar(GenerateRequest req, Random rng) {
        String afinacao = resolver(req.afinacao(), MusicData.AFINACOES.keySet(), MusicData.AFINACAO_PADRAO);
        String subgenero = resolver(req.subgenero(), MusicData.PADROES.keySet(), MusicData.SUBGENERO_PADRAO);
        int bpm = clampBpm(req.bpm());

        List<String> cordas = MusicData.AFINACOES.get(afinacao);
        int[] padrao = MusicData.PADROES.get(subgenero);
        if (req.blastBeats()) {
            padrao = blast();
        }

        String tab = gerarTab(cordas, padrao, rng);
        List<String> estrutura = MusicData.ESTRUTURAS.getOrDefault(subgenero, List.of());

        return new GenerateResponse(
                new GenerateResponse.Afinacao(afinacao, cordas),
                bpm,
                subgenero,
                req.blastBeats(),
                estrutura,
                tab
        );
    }

    private String gerarTab(List<String> cordas, int[] padrao, Random rng) {
        int total = SLOTS * MEDIDAS;
        int nCordas = cordas.size();

        String[][] grade = new String[nCordas][total];
        for (String[] linha : grade) {
            Arrays.fill(linha, "-");
        }

        for (int s = 0; s < total; s++) {
            int m = s % SLOTS;
            if (padrao[m] == 1) {
                grade[0][s] = "0"; // corda grave segue o padrão rítmico
            }
            if (m == 0 || m == 8) {
                int corda = 1 + rng.nextInt(2); // acento no início de cada medida
                grade[corda][s] = casaAleatoria(rng);
            }
            if (rng.nextDouble() < CHANCE_FILL) {
                grade[1][s] = casaAleatoria(rng); // preenchimento esparso
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int c = nCordas - 1; c >= 0; c--) { // desenha da aguda (topo) para a grave
            String rotulo = (cordas.get(c) + " ").substring(0, 2);
            sb.append(rotulo).append('|');
            for (int med = 0; med < MEDIDAS; med++) {
                for (int i = med * SLOTS; i < (med + 1) * SLOTS; i++) {
                    sb.append(grade[c][i]);
                }
                sb.append('|');
            }
            if (c > 0) {
                sb.append('\n');
            }
        }
        return sb.toString();
    }

    private String casaAleatoria(Random rng) {
        return MusicData.CASAS.get(rng.nextInt(MusicData.CASAS.size()));
    }

    private static int[] blast() {
        int[] p = new int[SLOTS];
        Arrays.fill(p, 1);
        return p;
    }

    private static int clampBpm(Integer bpm) {
        if (bpm == null) {
            return MusicData.BPM_PADRAO;
        }
        return Math.max(MusicData.BPM_MIN, Math.min(MusicData.BPM_MAX, bpm));
    }

    /** Casa a entrada (case-insensitive, tolerante a {@code _}) com uma chave válida. */
    private static String resolver(String entrada, Iterable<String> chaves, String padrao) {
        if (entrada == null || entrada.isBlank()) {
            return padrao;
        }
        String alvo = entrada.trim().replace('_', ' ');
        for (String chave : chaves) {
            if (chave.equalsIgnoreCase(alvo)) {
                return chave;
            }
        }
        return padrao;
    }
}
