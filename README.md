
# 🧩 OficinaCode

Ambiente de programação em blocos para alunos da plataforma **Oficina do Amanhã**.

Desenvolvido com **Tauri 2 + React + Rust**, roda como aplicação desktop nativa no Windows.

---

## O que é

O OficinaCode é a ferramenta do aluno. Nele, o aluno monta seu programa visualmente — arrastando e encaixando blocos lógicos — e o sistema traduz isso para código C++, que é compilado e enviado diretamente ao Arduino.

Não é necessário digitar nenhuma linha de código.

---

## Funcionalidades

- **Editor de blocos** — interface visual de arrastar e encaixar
- **Geração de C++ em tempo real** — o código é exibido à medida que os blocos são montados
- **Compilação e upload para Arduino** — toolchain local, sem dependência de internet
- **Trilhas de aprendizagem** — projetos guiados com material de apoio integrado
- **Monitor serial** — leitura de dados enviados pelo Arduino em tempo real
- **Modo offline** — funciona completamente sem conexão com a internet

---

## Requisitos

| Item | Mínimo |
|---|---|
| Sistema operacional | Windows 10 64-bit |
| RAM | 4 GB |
| Armazenamento | 200 MB livres |
| Dependências | Driver USB do Arduino (CH340 ou original) |

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Shell nativo | Tauri 2 |
| Interface | React |
| Lógica nativa | Rust |
| Compilação Arduino | avr-gcc + avrdude (embutidos) |
| Blocos | Blockly (Google) |

---

## Estrutura do projeto

```
oficina-code/
├── src/                  # Componentes React (interface)
│   ├── blocks/           # Definição e registro dos blocos
│   ├── editor/           # Editor principal
│   ├── monitor/          # Monitor serial
│   └── trilhas/          # Visualização de trilhas
├── src-tauri/            # Backend Rust + configuração Tauri
│   ├── src/
│   │   ├── compiler.rs   # Integração com avr-gcc
│   │   ├── serial.rs     # Comunicação serial com Arduino
│   │   └── main.rs
│   └── tauri.conf.json
├── public/
└── package.json
```

---

## Desenvolvimento local

**Pré-requisitos:**
- Node.js 20+
- Rust (stable) — via [rustup.rs](https://rustup.rs)
- Tauri CLI

```bash
# Instalar Tauri CLI
cargo install tauri-cli

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
cargo tauri dev

# Gerar build de produção (.exe)
cargo tauri build
```

---

## Projetos disponíveis nas trilhas

| Projeto | Nível | Conceitos |
|---|---|---|
| Semáforo | Iniciante | Sequência, temporizadores, LEDs |
| Régua Digital | Intermediário | Sensor ultrassônico, leitura de dados |
| Carrinho Controlado | Intermediário | Motores, controle direcional |

---

## Notas importantes

- A compilação e o upload ao Arduino ocorrem **localmente** — nenhum dado é enviado a servidores externos nesse processo
- O monitor serial funciona apenas enquanto o Arduino está conectado via USB
- O OficinaCode **não substitui** o OficinaAdmin — os dois coexistem e têm públicos distintos

---

## Parte da plataforma

```
Oficina do Amanhã
├── OficinaAdmin    ← gestão operacional (professores e admins)
└── OficinaCode     ← você está aqui
```

---

*Oficina do Amanhã — Plataforma SaaS Educacional*
*Sprint 1 — v1.0.0*
