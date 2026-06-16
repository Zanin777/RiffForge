package com.riffforge.riffforge.engine;

import static org.assertj.core.api.Assertions.assertThat;

import com.riffforge.riffforge.web.GenerateRequest;
import com.riffforge.riffforge.web.GenerateResponse;

import java.util.Random;

import org.junit.jupiter.api.Test;

class RiffEngineTest {

    private final RiffEngine engine = new RiffEngine();

    private GenerateRequest req(String afinacao, Integer bpm, String subgenero, boolean blast) {
        return new GenerateRequest(afinacao, bpm, subgenero, blast, false);
    }

    @Test
    void gera_tablatura_com_uma_linha_por_corda() {
        GenerateResponse r = engine.gerar(req("Drop B", 180, "Death Metal", false), new Random(1));

        assertThat(r.afinacao().nome()).isEqualTo("Drop B");
        assertThat(r.afinacao().cordas()).hasSize(6);
        assertThat(r.tab().lines()).hasSize(6); // uma linha de tab por corda
        assertThat(r.estrutura()).containsExactly(
                "Intro", "Riff A", "Blast", "Riff B", "Breakdown", "Outro");
    }

    @Test
    void cada_linha_comeca_com_rotulo_de_2_chars_e_tem_as_barras_de_medida() {
        GenerateResponse r = engine.gerar(req("Standard E", 160, "Djent", false), new Random(7));

        r.tab().lines().forEach(linha -> {
            assertThat(linha.charAt(2)).isEqualTo('|'); // rótulo de 2 chars antes da 1ª barra
            assertThat(linha).endsWith("|");
            assertThat(linha.chars().filter(c -> c == '|').count()).isEqualTo(3); // 2 medidas
        });
    }

    @Test
    void blast_beats_preenche_a_corda_grave_inteira() {
        GenerateResponse r = engine.gerar(req("Drop A", 220, "Groove Metal", true), new Random(3));

        // a corda grave é a última linha renderizada (desenhada da aguda para a grave)
        String cordaGrave = r.tab().lines().reduce((primeira, ultima) -> ultima).orElseThrow();
        long zeros = cordaGrave.chars().filter(c -> c == '0').count();
        assertThat(zeros).isEqualTo(32); // 16 slots × 2 medidas, todos com ataque
        assertThat(r.blastBeats()).isTrue();
    }

    @Test
    void mesma_seed_gera_o_mesmo_riff() {
        GenerateRequest req = req("Drop C", 200, "Metalcore", false);
        String a = engine.gerar(req, new Random(42)).tab();
        String b = engine.gerar(req, new Random(42)).tab();
        assertThat(a).isEqualTo(b);
    }

    @Test
    void entradas_invalidas_caem_nos_padroes() {
        GenerateResponse r = engine.gerar(req("Afinação Inexistente", 9999, "Jazz", false), new Random(1));

        assertThat(r.afinacao().nome()).isEqualTo("Drop B");
        assertThat(r.subgenero()).isEqualTo("Death Metal");
        assertThat(r.bpm()).isEqualTo(280); // 9999 fica limitado ao máximo
    }

    @Test
    void aceita_subgenero_em_formato_enum() {
        GenerateResponse r = engine.gerar(req("Drop B", 180, "DEATH_METAL", false), new Random(1));
        assertThat(r.subgenero()).isEqualTo("Death Metal");
    }
}
