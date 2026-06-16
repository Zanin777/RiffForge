# 🎸 RiffForge — Gerador Estrutural de Tablaturas e Riffs

> Aplicação full-stack que combina **lógica musical determinística** com **integração de IA** para auxiliar na composição de música pesada. Você define os parâmetros (afinação, andamento, subgênero) e a aplicação devolve uma estrutura de música ou riffs técnicos em formato de tablatura.

![status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)
![java](https://img.shields.io/badge/Java-17%2B-007396?logo=openjdk&logoColor=white)
![spring](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?logo=springboot&logoColor=white)
![license](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)

> ⚠️ **Projeto em desenvolvimento ativo.** O roadmap abaixo reflete o estado atual de cada fase.

---

## 📖 Sobre

O **RiffForge** processa parâmetros de composição e gera material musical coerente. A ideia central é **não** terceirizar toda a criatividade para a IA: um motor determinístico cuida das regras duras (afinação, escala, alcance do braço, ritmo) garantindo que qualquer riff gerado seja **fisicamente tocável e dentro da tonalidade**, enquanto a camada de IA entra apenas para variação criativa — e mesmo assim com a saída validada pelo motor.

Resultado: o app funciona 100% sem IA (modo lógico) e fica mais interessante com IA (modo criativo), sem ficar refém de API ou custo de token para ter algo funcional.

---

## ✨ Funcionalidades

- 🎛️ **Parâmetros de composição:** afinação (ex.: Drop B), andamento em BPM, subgêneros (Death, Groove Metal), uso de blast beats.
- 🧠 **Motor determinístico:** geração de riffs a partir de escalas (frígio dominante, menor harmônica, menor natural) e templates rítmicos (chugs, gallop, tremolo, breakdown).
- 🤖 **Camada de IA opcional:** variação criativa via API, com saída em JSON estruturado validada contra a afinação e a tocabilidade.
- 🎼 **Renderização de tablatura:** ASCII no MVP, com suporte planejado a [AlphaTab](https://www.alphatab.net/) para renderização estilo Guitar Pro e playback no navegador.
- 🏗️ **Geração de estrutura:** sugestão de seções (intro, verso, refrão, breakdown, bridge, outro).

---

## 🧩 Arquitetura

O fluxo de geração segue um pipeline em camadas com validação:

```
Parâmetros (front-end)
        │  afinação, BPM, subgênero, blast beat
        ▼
Motor determinístico (Java)
        │  escala, braço, ritmo, estrutura
        ▼
Camada de IA (opcional)
        │  variação criativa em JSON
        ▼
Validador  ──── inválido ───┐
        │  afinação + tocabilidade
        ▼                   │
Tab JSON → Renderer         │
   (ASCII / AlphaTab)       │
                            └──► regenera (volta ao motor)
```

O par `corda + casa` é apenas a representação física da nota. A verdade musical é a **nota MIDI** (`midi = midiCordaSolta[corda] + casa`), o que permite ao motor gerar dentro de uma escala, validar casas existentes e detectar acordes tocáveis.

### Modelo de dados (núcleo)

```java
// nota = qual corda + qual casa + duração + técnica
record Nota(int corda, int casa, int duracaoTicks, Set<Tecnica> tecnicas) {}
enum Tecnica { PALM_MUTE, SLIDE, BEND, HAMMER, PULL_OFF, TREMOLO, PINCH_HARMONIC }

record Afinacao(String nome, String[] cordas) {}  // graves → agudas
record Compasso(String formula, int bpm, List<Nota> notas) {}
record Secao(TipoSecao tipo, List<Compasso> compassos, int repeticoes) {}
enum TipoSecao { INTRO, VERSE, CHORUS, BREAKDOWN, BRIDGE, OUTRO }

record Musica(Afinacao afinacao, String subgenero, List<Secao> secoes) {}
```

---

## 🛠️ Stack

| Camada      | Tecnologia                              |
|-------------|-----------------------------------------|
| Back-end    | Java 17+, Spring Boot 3.x               |
| Front-end   | HTML, CSS, JavaScript                    |
| IA          | API de geração com saída JSON estruturada |
| Renderização| Tablatura ASCII / AlphaTab (planejado)  |
| Build       | Maven (ou Gradle)                        |

---

## 🚀 Como rodar localmente

> Pré-requisitos: **Java 17+** e **Maven** instalados.

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/riffforge.git
cd riffforge

# 2. Rode o back-end (Spring Boot)
./mvnw spring-boot:run

# 3. Abra o front-end
# Acesse http://localhost:8080 no navegador
```

### Variáveis de ambiente

Se for usar a camada de IA, crie um arquivo `.env` (ou configure no `application.properties`):

```properties
# Chave da API de IA — NÃO comite este arquivo
IA_API_KEY=sua-chave-aqui
```

> 🔒 Lembre de adicionar `.env` e arquivos de chave ao `.gitignore`.

---

## 📡 Exemplo de uso (API)

```http
POST /api/generate
Content-Type: application/json

{
  "afinacao": "Drop B",
  "bpm": 180,
  "subgenero": "DEATH_METAL",
  "blastBeats": true,
  "usarIA": false
}
```

Resposta (resumida):

```json
{
  "afinacao": { "nome": "Drop B", "cordas": ["B","F#","B","E","G#","C#"] },
  "subgenero": "DEATH_METAL",
  "secoes": [
    { "tipo": "INTRO", "compassos": [ ... ], "repeticoes": 2 }
  ]
}
```

---

## 🗺️ Roadmap

- [ ] **Fase 1 — MVP sem IA:** endpoint `POST /api/generate` gerando tab ASCII a partir de escala + template rítmico fixo, com formulário HTML simples.
- [ ] **Fase 2 — Estrutura:** geração de seções (intro, verso, breakdown, etc.).
- [ ] **Fase 3 — IA:** camada de variação criativa com saída estruturada e validação no servidor.
- [ ] **Fase 4 — AlphaTab:** renderização visual e playback no navegador.

---

## 🤝 Contribuindo

Contribuições são bem-vindas. Faça um fork, crie uma branch (`git checkout -b minha-feature`), commite e abra um Pull Request.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">Feito com 🤘 e muito Drop B.</p>
