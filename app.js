const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",      // substitua pelo seu usuário do MySQL
  password: "",      // substitua pela sua senha do MySQL
  database: "minha_barbearia"  // substitua pelo nome do seu banco de dados
});

// Servir arquivos estáticos da pasta 'public'
app.use(express.static("public"));
app.use(express.json());
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Rota principal redirecionando para /home
app.get("/", (req, res) => {
  res.redirect("/home");
});


app.get("/home", (req, res) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fila de Agendamentos</title>
      <script src="/socket.io/socket.io.js"></script>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link rel="stylesheet" href="/css/style.css">
    </head>
    <body>
      <div class="container">
        <!-- Imagem responsiva -->
        <img src="https://img.freepik.com/vetores-gratis/modelo-de-banner-horizontal-de-barbearia-realista_52683-94963.jpg" class="img-fluid mb-4" alt="Banner de Barbearia">
        <h1>Fila de Agendamentos</h1>
        <div id="agendamentos" class="mt-4"></div>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#agendarModal">Agendar Horário</button>
    </div>


      <!-- Modal para agendar horário -->
      <div class="modal fade" id="agendarModal" tabindex="-1" aria-labelledby="agendarModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="agendarModalLabel">Agendar Horário</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="formAgendamento">
                <div class="mb-3">
                  <label for="nomeCliente" class="form-label">Nome do Cliente</label>
                  <input type="text" class="form-control" id="nomeCliente" required>
                </div>
                <div class="mb-3">
                  <label for="horarioCliente" class="form-label">Horário (HH:mm)</label>
                  <input type="time" class="form-control" id="horarioCliente" required>
                </div>
                <div class="mb-3">
                  <label for="servicoCliente" class="form-label">Tipo de Corte</label>
                  <select class="form-select" id="servicoCliente" required>
                    <option value="Corte normal - R$ 25,00">Corte normal - R$ 25,00</option>
                    <option value="Barba - R$ 15,00">Barba - R$ 15,00</option>
                    <option value="Corte com barba - R$ 35,00">Corte com barba - R$ 35,00</option>
                    <option value="Escova - R$ 40,00">Escova - R$ 40,00</option>
                    <option value="Platinado - R$ 30,00">Platinado - R$ 30,00</option>
                    <option value="Reflexo - R$ 60,00">Reflexo - R$ 60,00</option>
                  </select>
                </div>
                <button type="submit" class="btn btn-primary">Agendar</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Remarcar Horário -->
      <div class="modal fade" id="remarcarModal" tabindex="-1" aria-labelledby="remarcarModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="remarcarModalLabel">Remarcar Horário</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <form id="formRemarcar">
                <div class="mb-3">
                  <label for="novoHorario" class="form-label">Novo Horário (HH:mm)</label>
                  <input type="time" class="form-control" id="novoHorario" required>
                </div>
                <button type="submit" class="btn btn-warning">Remarcar</button>
              </form>
            </div>
          </div>
        </div>
      </div>


      <!-- Modal -->
      <div class="modal fade" id="modalMensagem" tabindex="-1" aria-labelledby="modalMensagemLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modalMensagemLabel">Informação</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="modalMensagemCorpo">
              <div id="modalMensagemImagem">
                <!-- A imagem será inserida aqui dinamicamente -->
              </div>
              <p id="modalMensagemTexto"></p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
            </div>
          </div>
        </div>
      </div>




      <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      <script src="/js/script.js"></script>
    </body>
    </html>
  `;
  res.send(htmlContent);
});

// Função para carregar agendamentos do banco de dados
function carregarAgendamentos() {
  // Consulta para selecionar apenas os agendamentos não expirados
  db.query("SELECT * FROM agendamentos WHERE expirado = 0", (err, results) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return;
    }
    // Envia os agendamentos não expirados para o frontend
    io.emit("atualizarAgendamentos", results);
  });
}

// Função para verificar horários expirados
function verificarHorariosExpirados() {
  const agora = new Date();
  
  db.query("SELECT * FROM agendamentos", (err, results) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return;
    }

    // Filtra os agendamentos e realiza a atualização no banco de dados
    const promessasDeAtualizacao = results.map((agendamento) => {
      const horarioAgendamento = new Date(agendamento.horario);

      // Verificar se o horário é válido
      if (isNaN(horarioAgendamento)) {
        console.error(`Horário inválido: ${agendamento.horario}`);
        return Promise.resolve(); // Ignora o agendamento com horário inválido
      }

      // Verifica se o agendamento já passou
      if (horarioAgendamento <= agora && agendamento.expirado === 0) {
        // Retorna a promessa da atualização
        return new Promise((resolve, reject) => {
          db.query("UPDATE agendamentos SET expirado = 1 WHERE id = ?", [agendamento.id], (updateErr) => {
            if (updateErr) {
              console.error("Erro ao atualizar agendamento expirado:", updateErr);
              reject(updateErr);
            } else {
              console.log(`Agendamento ${agendamento.id} expirado e atualizado para expirado = 1`);
              resolve();
            }
          });
        });
      }

      return Promise.resolve(); // Se o agendamento não expirou, não faz nada
    });

    // Aguarda todas as atualizações antes de emitir os agendamentos
    Promise.all(promessasDeAtualizacao)
      .then(() => {
        // Filtra os agendamentos não expirados
        const agendamentosFiltrados = results.filter((agendamento) => {
          const horarioAgendamento = new Date(agendamento.horario);
          return horarioAgendamento > agora; // Filtra os agendamentos que não expiraram
        });

        // Emite os agendamentos não expirados para o frontend
        io.emit("atualizarAgendamentos", agendamentosFiltrados);
      })
      .catch((updateErr) => {
        console.error("Erro ao atualizar agendamentos expirados:", updateErr);
      });
  });
}

// Função para calcular o tempo até o próximo meio minuto
function calcularTempoParaProximoMeioMinuto() {
  const agora = new Date();
  const segundos = agora.getSeconds();
  // Se o segundo atual for antes do 30 segundos, retorna o tempo até o próximo meio minuto
  // Caso contrário, retorna o tempo até o próximo meio minuto depois
  return (segundos < 30 ? (30 - segundos) : (60 - segundos + 30)) * 1000;
}

// Função para calcular o tempo até o próximo minuto
function calcularTempoParaProximoMinuto() {
  const agora = new Date();
  const tempoRestante = 60000 - (agora % 60000); // Tempo até o próximo minuto (em milissegundos)
  return tempoRestante;
}

// Inicializa o agendamento da verificação para o início de cada minuto
setTimeout(function rodarVerificacao() {
  verificarHorariosExpirados(); // Executa a primeira verificação imediatamente
  
  // Define o intervalo de execução para o próximo minuto
  setInterval(verificarHorariosExpirados, 60000);
}, calcularTempoParaProximoMinuto());

// Inicializa o agendamento da função carregarAgendamentos para o início de cada minuto
setTimeout(function rodarCarregamento() {
  carregarAgendamentos(); // Executa a primeira chamada imediatamente
  
  // Define o intervalo de execução para a cada 30 segundos (baseado no relógio)
  setInterval(carregarAgendamentos, 30000);
}, calcularTempoParaProximoMinuto());

// Funções de interação com o banco de dados
io.on("connection", (socket) => {
  console.log("Um cliente conectado!");

  // Envia a lista de agendamentos para o cliente
  carregarAgendamentos();

  let clienteId = null;

  // Durante a conexão, o cliente envia seu identificador único (clienteId)
  socket.on("identificarCliente", (id) => {
    clienteId = id;
    console.log("Cliente ID recebido:", clienteId);
  });

  socket.on("verificarHorarioDisponivel", (horarioCliente, callback) => {
    console.log("Verificando horário:", horarioCliente); // Log do horário enviado
  
    const agora = new Date();
    const dataHoje = agora.toISOString().split("T")[0]; // Obtém a data no formato 'YYYY-MM-DD'
  
    // Formata o horário completo para o dia de hoje
    const horarioFormatado = new Date(`${dataHoje}T${horarioCliente}:00`); // Adiciona segundos para garantir o formato completo
  
    console.log("Horário formatado para verificação:", horarioFormatado);
  
    // Consulta para verificar se o horário específico está ocupado
    const queryVerificarHorario = `
      SELECT * 
      FROM agendamentos 
      WHERE DATE(horario) = DATE(?) 
        AND TIME(horario) = TIME(?)
    `;
  
    db.query(queryVerificarHorario, [horarioFormatado, horarioFormatado], (err, results) => {
      if (err) {
        console.error("Erro ao verificar horário:", err);
        return callback("Erro ao verificar horário.");
      }
  
      console.log("Resultado da verificação:", results); // Log da consulta
      if (results.length > 0) {
        return callback({
          status: "ocupado",
          horariosOcupados: [horarioCliente], // Retorna o horário específico que está ocupado
          mensagem: `O horário ${horarioCliente} já está ocupado.`
        });
      }
  
      return callback({
        status: "disponivel",
        mensagem: `O horário ${horarioCliente} está disponível para agendamento.`
      });
    });
  });  

  // Função para desmarcar horário (apenas o dono do agendamento pode desmarcar)
  socket.on("desmarcarHorario", (id) => {
    db.query("SELECT * FROM agendamentos WHERE id = ?", [id], (err, results) => {
      if (err) {
        console.error("Erro ao buscar agendamento:", err);
        return;
      }

      const agendamento = results[0];

      if (agendamento && agendamento.clienteId === clienteId) {
        db.query("DELETE FROM agendamentos WHERE id = ?", [id], (err) => {
          if (err) {
            console.error("Erro ao excluir agendamento:", err);
            return;
          }
          carregarAgendamentos();
        });
      } else {
        console.log("Cliente não autorizado a desmarcar este agendamento.");
        socket.emit("erroDesmarcar", "Você não tem permissão para desmarcar este agendamento.");
      }
    });
  });

  socket.on("agendarHorario", (data) => {
    console.log("Tentando agendar horário:");
    console.log("Cliente:", data.cliente);
    console.log("ClienteId:", data.clienteId);
    console.log("Horário:", data.horario);
    console.log("Serviço:", data.servico);

    // Verifica se algum dado está vazio
    if (!data.clienteId || !data.cliente || !data.horario || !data.servico) {
      console.error("Erro: Algum valor está vazio ou não foi passado.");
      socket.emit("erroAgendar", "Por favor, forneça todos os dados corretamente.");
      return;
    }

    // Adiciona a data atual ao horário fornecido para validar
    const horarioParts = data.horario.split(':');
    const hora = parseInt(horarioParts[0], 10);
    const minuto = parseInt(horarioParts[1], 10);

    // Cria uma nova data com a hora e minuto informados
    const horarioAgendamento = new Date();
    horarioAgendamento.setHours(hora);
    horarioAgendamento.setMinutes(minuto);

    // Verifica se o horário é válido
    if (isNaN(horarioAgendamento.getTime())) {
      console.error("Erro: O horário fornecido é inválido.");
      socket.emit("erroAgendar", "O horário fornecido é inválido.");
      return;
    }

    const query = "INSERT INTO agendamentos (cliente, clienteId, horario, servico) VALUES (?, ?, ?, ?)";
    db.query(query, [data.cliente, data.clienteId, data.horario, data.servico], (err, results) => {
      if (err) {
        console.error("Erro ao agendar horário:", err);
        socket.emit("erroAgendar", "Ocorreu um erro ao tentar agendar o horário.");
        return;
      }
      console.log("Agendamento realizado com sucesso.");
      carregarAgendamentos();
    });
  });
});

app.post('/atualizarExpiracao', (req, res) => {
  const { idAgendamento } = req.body;
  console.log("ID recebido para atualizar expiração:", idAgendamento); // Log do ID

  const query = 'UPDATE agendamentos SET expirado = 1 WHERE id = ?';
  db.query(query, [idAgendamento], (err, result) => {
    if (err) {
      console.error('Erro ao executar a query:', err);
      res.status(500).send({ message: 'Erro ao atualizar o agendamento.' });
    } else {
      console.log('Resultado da query:', result);
      if (result.affectedRows > 0) {
        res.status(200).send({ message: 'Agendamento atualizado com sucesso!' });
      } else {
        res.status(404).send({ message: 'Agendamento não encontrado.' });
      }
    }
  });
});


server.listen(3030, '0.0.0.0', () => {
  console.log("Servidor rodando na porta 3030");
});