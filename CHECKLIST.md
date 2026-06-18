# ✅ Checklist de Desenvolvimento — RiffForge

> Plano de sessões curtas pra construir o projeto um pouco a cada dia, sem se afogar.
> Cada sessão dura ~45 min, tem um objetivo testável e termina com um commit.
> **Não precisa ser literalmente um por dia** — pulou um dia, sem culpa: só pega a próxima sessão na sequência. O que importa é não quebrar o ritmo por muito tempo.

---

## 🔁 Ritual de cada sessão

Faça sempre esses 4 passos, em ordem:

1. [x] Abrir o projeto na IDE e rodar (`▶ Run` ou `mvnw spring-boot:run`) pra confirmar que está tudo de pé.
2. [x] Fazer **só a tarefa da sessão** — sem desviar pra "só mais essa featurezinha".
3. [x] Testar (curl, navegador, ou um `main` de teste) e confirmar o "✅ feito quando".
4. [ ] Commitar: `git add .` → `git commit -m "..."` → `git push`.

> Dica de commit: mensagens curtas no presente, tipo `add conversão afinação para MIDI`. Commit pequeno e frequente é seu amigo — facilita voltar atrás quando algo quebra.

---

## 🎯 Arco 1 — MVP: do zero a uma tab na tela

> 📌 **Status (15/06/2026):** pegamos um atalho "enxuto" — portamos o gerador do front-end direto pra Java, então já temos `POST /api/generate` + tab ASCII funcionando. Por isso as Sessões **1, 3, 8 e 10 estão ✅**, mesmo com as Sessões 2 e 4–7/9 ainda pendentes (modelo rico de dados, MIDI, escalas, validação de tonalidade) — esse é o próximo passo: o "motor de verdade". O front (Sessões 11–12) ainda **não** foi integrado ao back.

### Semana 1 — Fundação e primeiro JSON

**Sessão 1 — Esqueleto Spring Boot**
- [x] Gerar o projeto no [Spring Initializr](https://start.spring.io/) (Maven, Java 17, dependência **Spring Web**).
- [x] Extrair por cima do repo e rodar.
- [x] ✅ *Feito quando:* aparece o banner do Spring e `Tomcat started on port 8080`.

**Sessão 2 — Modelo de dados**
- [ ] Criar os pacotes `model`, `dto`, `controller`.
- [ ] Criar os `records`: `Nota`, `Afinacao`, `Compasso`, `Secao`, `Musica` e os `enums` `Tecnica`, `TipoSecao`.
- [ ] ✅ *Feito quando:* o projeto compila sem erro.

**Sessão 3 — Endpoint que responde**
- [x] Criar o `GenerateRequest` (DTO) e o `GeracaoController` com `POST /api/generate` devolvendo uma `Musica` hardcoded. *(feito como `GenerateController`; a resposta já é **gerada**, não hardcoded)*
- [x] Testar com `curl`. *(testado via `Invoke-RestMethod`)*
- [x] ✅ *Feito quando:* o `curl` retorna o JSON com afinação e uma seção.

### Semana 2 — O núcleo musical (o cérebro)

**Sessão 4 — Afinação → MIDI**
- [ ] Criar o `GeradorService` com o array de Drop B `{35,42,47,52,56,61}` e o método `notaMidi(corda, casa)`.
- [ ] Imprimir algumas notas num `main` ou teste pra conferir.
- [ ] ✅ *Feito quando:* `notaMidi(0,0)` devolve 35 e os cálculos batem.

**Sessão 5 — Escalas**
- [ ] Definir as escalas como arrays de intervalos (frígio dominante `0,1,4,5,7,8,10`, menor harmônica `0,2,3,5,7,8,11`).
- [ ] Implementar `naEscala(midi, raiz, intervalos)`.
- [ ] ✅ *Feito quando:* o método acerta quais notas pertencem à tonalidade de B.

**Sessão 6 — Posições no braço**
- [ ] Método que lista as casas válidas (dentro da escala) pra cada corda.
- [ ] ✅ *Feito quando:* dada raiz B + escala, sai uma lista de posições tocáveis.

### Semana 3 — O gerador de riff

**Sessão 7 — Templates rítmicos**
- [ ] Criar as constantes de duração (semínima = 480 ticks): `GALLOP = {120,120,240}`, `CHUG_16`, etc.
- [ ] ✅ *Feito quando:* os templates existem e somam as durações certas de um compasso.

**Sessão 8 — Gerador v1 (chug burro)**
- [x] Gerar uma lista de `Nota` chugando a corda grave solta no ritmo escolhido. *(o `RiffEngine` faz o chug na corda grave conforme o padrão; ainda sem o record `Nota` — gera ASCII direto)*
- [x] Plugar no endpoint (substituir o hardcoded).
- [x] ✅ *Feito quando:* o `/api/generate` devolve notas geradas pela lógica.

**Sessão 9 — Gerador v2 (com altura)**
- [ ] Variar as alturas escolhendo posições da escala nas cordas graves.
- [ ] ✅ *Feito quando:* o riff tem mais de uma nota e continua na tonalidade.

### Semana 4 — Renderização e interface

**Sessão 10 — Renderizador ASCII** 🎸
- [x] Criar o método que transforma `Musica` em tablatura ASCII (6 linhas, casas + `-`). *(renderiza a partir do grid interno; falta alinhar casas de 2 dígitos como `10`)*
- [x] ✅ *Feito quando:* o `curl` cospe uma tab ASCII legível. **(Momento mágico!)**

**Sessão 11 — Página HTML**
- [ ] Criar `src/main/resources/static/index.html` com formulário (afinação, BPM, subgênero, blast beat) e uma tag `<pre>` pro resultado.
- [ ] ✅ *Feito quando:* a página abre em `localhost:8080` com o formulário visível.

**Sessão 12 — Conectar tudo (MVP! 🤘)**
- [ ] Escrever o JS com `fetch('/api/generate', ...)` e jogar a resposta no `<pre>`.
- [ ] ✅ *Feito quando:* escolhe Drop B + Death Metal, clica, e a tab aparece na tela. **MVP no ar!**

---

## 🚀 Arco 2 — Turbinar (depois do MVP)

> Só comece isso DEPOIS de ter uma tab aparecendo na tela. Não pule etapas.

- [ ] **Estrutura de música:** gerar seções encadeadas (intro → verso → breakdown).
- [ ] **Mais sabor:** novos subgêneros, técnicas (palm mute, tremolo, pinch harmonic), mais templates rítmicos.
- [ ] **Camada de IA:** caminho `usarIA = true` chamando a API com saída em JSON estruturado.
- [ ] **Validador:** rejeitar/consertar notas fora da afinação antes de aceitar a resposta da IA.
- [ ] **AlphaTab:** trocar o ASCII por renderização visual + playback no navegador.
- [ ] **Persistência:** adicionar MySQL/JPA pra salvar as músicas geradas.

---

## 🏆 Regras de ouro

- Termine **toda** sessão com o projeto compilando e um commit feito. Nunca deixe pela metade quebrado.
- Se travar numa sessão, anote a dúvida e siga — resolver depois é melhor que parar tudo.
- Comemore os checkpoints. Ver o primeiro chug na tela merece um headbang.
- Uma sessão por dia é ótimo. Três por semana já mantém o ritmo. Zero por duas semanas é onde projetos morrem.

<p align="center">🤘 Um riff de cada vez.</p>
