# 🛠️ OficinaAdmin

Painel operacional da plataforma **Oficina do Amanhã** para professores e administradores.

Desenvolvido com **Java 21 + JavaFX**, roda como aplicação desktop nativa no Windows.

---

## O que é

O OficinaAdmin é o ambiente de trabalho do professor e do administrador. Centraliza tudo que a operação educacional precisa: cronograma de aulas, registro de chamada, controle de horas, gestão de escolas e turmas, e acesso à Central de Conteúdo pedagógico.

---

## Perfis de acesso

### Administrador
Controle total do sistema.

- Cadastrar e gerenciar escolas, turmas, alunos e professores
- Criar o cronograma oficial de aulas (turma + professor + dias + período)
- Monitorar chamadas realizadas por turma e professor
- Visualizar horas trabalhadas por professor para apuração de pagamento
- Publicar e organizar conteúdo na Central de Conteúdo

### Professor
Acesso restrito ao próprio escopo de trabalho.

- Visualizar o cronograma atribuído pelo administrador
- Registrar chamada com detecção automática de aula em andamento
- Consultar histórico de horas trabalhadas
- Acessar trilhas, vídeos, códigos e guias na Central de Conteúdo
- Adicionar eventos pontuais (reuniões e aulas substitutas)

---

## Módulos

| Módulo | Admin | Professor |
|---|---|---|
| Gestão de Escolas | ✔ | — |
| Gestão de Turmas | ✔ | — |
| Gestão de Alunos | ✔ | — |
| Gestão de Professores | ✔ | — |
| Cronograma | ✔ criar / ✔ ver | ✔ ver / ✔ eventos pontuais |
| Chamada Inteligente | ✔ ver | ✔ registrar |
| Registro de Horas | ✔ consolidado | ✔ próprio |
| Central de Conteúdo | ✔ publicar | ✔ acessar |

---

## Fluxo operacional

```
Admin cria estrutura
    └─► Professor acessa cronograma
            └─► Professor registra chamada
                    └─► Sistema gera registro de hora automaticamente
                                └─► Admin visualiza e consolida
```

---

## Requisitos

| Item | Mínimo |
|---|---|
| Sistema operacional | Windows 10 64-bit |
| Java | JDK 21+ (incluído no instalador) |
| RAM | 2 GB |
| Armazenamento | 100 MB livres |
| Conexão | Necessária para sincronização com o banco de dados |

---

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Interface | JavaFX |
| Linguagem | Java 21 |
| Banco de dados | PostgreSQL via Supabase |
| Controle de acesso | RBAC (Role Based Access Control) |
| Build | Maven |

---

## Estrutura do projeto

```
oficina-admin/
├── src/main/java/
│   ├── app/                  # Telas (Views) JavaFX
│   │   ├── ChamadaView.java
│   │   ├── CronogramaAdminView.java
│   │   ├── RegistroHorasView.java
│   │   └── ...
│   ├── core/                 # Modelos de domínio
│   │   ├── Turma.java
│   │   ├── CronogramaAula.java
│   │   ├── GrupoCronograma.java
│   │   └── ...
│   ├── dao/                  # Acesso ao banco de dados
│   │   ├── ChamadaDAO.java
│   │   ├── CronogramaDAO.java
│   │   └── ...
│   └── MainFX.java           # Entry point da aplicação
├── src/main/resources/
│   └── fxml/                 # Layouts (se aplicável)
├── sql/
│   ├── 001_schema_inicial.sql
│   ├── 002_views.sql
│   └── 003_cronograma_v2.sql
└── pom.xml
```

---

## Configuração do banco de dados

A aplicação conecta ao PostgreSQL via Supabase. As credenciais são configuradas em:

```
src/main/java/dao/ConexaoBD.java
```

```java
// Exemplo de configuração
private static final String URL  = "jdbc:postgresql://<host>:5432/postgres";
private static final String USER = "<usuario>";
private static final String PASS = "<senha>";
```

> ⚠️ **Nunca commite credenciais reais no repositório.** Use variáveis de ambiente ou um arquivo de configuração ignorado pelo `.gitignore`.

---

## Migrations do banco

Os scripts SQL estão em `/sql/` e devem ser executados em ordem:

```bash
# 1. Schema inicial
psql -f sql/001_schema_inicial.sql

# 2. Views
psql -f sql/002_views.sql

# 3. Cronograma v2 (multi-dia)
psql -f sql/003_cronograma_v2.sql
```

---

## Desenvolvimento local

**Pré-requisitos:**
- JDK 21+
- Maven 3.9+

```bash
# Compilar
mvn clean compile

# Rodar
mvn javafx:run

# Gerar JAR executável
mvn package
```

---

## Chamada Inteligente — como funciona

Ao abrir a tela de Chamada, o sistema:

1. Verifica o horário atual contra o cronograma ativo do professor
2. Se houver aula em andamento e chamada ainda não registrada → exibe banner verde com botão de início imediato
3. Fora do horário → exibe cards de resumo por turma (total de chamadas, última data, % de presença)
4. O professor pode sempre iniciar uma chamada manual via `+ Nova Chamada`

Cada chamada salva gera automaticamente um registro de hora vinculado ao professor, turma e horário.

---

## Notas importantes

- O OficinaAdmin **requer conexão com internet** para funcionar (acesso ao banco em nuvem)
- O professor visualiza **apenas suas turmas** — o isolamento é garantido pelo RBAC
- Registros de chamada têm valor operacional e devem ser excluídos somente quando abertos por engano

---

## Parte da plataforma

```
Oficina do Amanhã
├── OficinaAdmin    ← você está aqui
└── OficinaCode     ← ambiente do aluno
```

---

*Oficina do Amanhã — Plataforma SaaS Educacional*
*Sprint 1 — v1.0.0*
