package com.riffforge.riffforge.web;

import com.riffforge.riffforge.engine.RiffEngine;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint de geração de riffs.
 *
 * <p>Recebe os parâmetros de composição e devolve a tablatura forjada pelo
 * {@link RiffEngine}. É o ponto que o front-end vai consumir no lugar do mock JS.</p>
 */
@RestController
@RequestMapping("/api")
public class GenerateController {

    private final RiffEngine engine;

    public GenerateController(RiffEngine engine) {
        this.engine = engine;
    }

    @PostMapping("/generate")
    public GenerateResponse generate(@RequestBody GenerateRequest request) {
        return engine.gerar(request);
    }
}
