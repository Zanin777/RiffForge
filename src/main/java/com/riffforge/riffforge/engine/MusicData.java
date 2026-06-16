package com.riffforge.riffforge.engine;

import java.util.List;
import java.util.Map;

/**
 * Dados musicais base do motor — portados do front-end (index2.html).
 *
 * <p>Por enquanto isto é a "versão enxuta": afinações, padrões rítmicos por
 * subgênero e estruturas de música são tabelas fixas, exatamente como o mock JS.
 * A evolução planejada (escalas via MIDI, validação de tocabilidade) entra em
 * cima desta base sem quebrar o contrato do controller.</p>
 */
public final class MusicData {

    private MusicData() {
    }

    public static final String AFINACAO_PADRAO = "Drop B";
    public static final String SUBGENERO_PADRAO = "Death Metal";

    public static final int BPM_PADRAO = 180;
    public static final int BPM_MIN = 80;
    public static final int BPM_MAX = 280;

    /** Cordas de cada afinação, da mais grave para a mais aguda. */
    public static final Map<String, List<String>> AFINACOES = Map.of(
            "Drop B", List.of("B", "F#", "B", "E", "G#", "C#"),
            "Drop A", List.of("A", "E", "A", "D", "F#", "B"),
            "Drop C", List.of("C", "G", "C", "F", "A", "D"),
            "Standard E", List.of("E", "A", "D", "G", "B", "E")
    );

    /** Padrão rítmico de 16 slots (1 = ataque na corda grave) por subgênero. */
    public static final Map<String, int[]> PADROES = Map.of(
            "Death Metal", new int[] {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1},
            "Groove Metal", new int[] {1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0},
            "Djent", new int[] {1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0},
            "Metalcore", new int[] {1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0},
            "Black Metal", new int[] {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1}
    );

    /** Seções sugeridas por subgênero. */
    public static final Map<String, List<String>> ESTRUTURAS = Map.of(
            "Death Metal", List.of("Intro", "Riff A", "Blast", "Riff B", "Breakdown", "Outro"),
            "Groove Metal", List.of("Intro", "Groove", "Refrão", "Ponte", "Groove", "Outro"),
            "Djent", List.of("Intro", "Verso", "Poliritmia", "Refrão", "Breakdown", "Outro"),
            "Metalcore", List.of("Intro", "Verso", "Refrão", "Verso", "Breakdown", "Final"),
            "Black Metal", List.of("Intro", "Tremolo A", "Atmosfera", "Tremolo B", "Clímax", "Outro")
    );

    /** Casas usadas para os acentos melódicos das cordas agudas. */
    public static final List<String> CASAS = List.of("3", "5", "7", "8", "10");
}
