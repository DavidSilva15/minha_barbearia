const socket = io();
const agendamentosDiv = document.getElementById("agendamentos");

// Tentando obter o clienteId da sessão local
let clienteIdGlobal = localStorage.getItem('clienteId');

// Se não existir, gera um novo clienteId e armazena no localStorage
if (!clienteIdGlobal) {
  clienteIdGlobal = `${Math.random().toString(36).substr(2, 5)}`; // ID com 5 caracteres
  localStorage.setItem('clienteId', clienteIdGlobal);
}

// Exibe o ID gerado no console (para teste)
console.log(`Cliente ID: ${clienteIdGlobal}`);

socket.on("atualizarAgendamentos", (agendamentos) => {
  exibirAgendamentos(agendamentos);
});

function exibirAgendamentos(agendamentos) {
  console.log('Iniciando a exibição dos agendamentos');
  
  agendamentos.forEach((agendamento) => {
    // Monta a data completa (hoje + horário do agendamento)
    const dataAtual = new Date();
    const horarioParts = agendamento.horario.split(':'); // Divide a hora, minuto e segundo
    const horarioAgendamento = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), horarioParts[0], horarioParts[1], horarioParts[2]);

    console.log(`Verificando agendamento: ${agendamento.id}, Horário: ${agendamento.horario}`);

    // Verifica se a data do agendamento é válida
    if (isNaN(horarioAgendamento)) {
      console.error(`Horário inválido para o agendamento ${agendamento.id}: ${agendamento.horario}`);
      return;
    }

    // Verifica se o agendamento já passou
    if (horarioAgendamento < dataAtual && !agendamento.expirado) {
      console.log(`Agendamento ${agendamento.id} expirou. Atualizando...`);
      agendamento.expirado = true; // Marca o agendamento como expirado

      fetch('/atualizarExpiracao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idAgendamento: agendamento.id })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Resposta do servidor ao atualizar a expiração:', data.message);
      })
      .catch(error => {
        console.error('Erro ao atualizar a expiração:', error);
      });
    } else {
      console.log(`Agendamento ${agendamento.id} não expirou.`);
    }
  });

  // Filtra os agendamentos que não expiraram
  const agendamentosFuturos = agendamentos.filter((agendamento) => !agendamento.expirado);

  if (agendamentosFuturos.length === 0) {
    console.log('Não há agendamentos futuros ou atuais');
    agendamentosDiv.innerHTML = `<p class="text-center">Sem agendamentos no momento</p>`;
  } else {
    console.log(`Exibindo ${agendamentosFuturos.length} agendamentos futuros`);
    agendamentosDiv.innerHTML = agendamentosFuturos
      .map(
        (agendamento) => ` 
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">
                ${agendamento.cliente} 
                <span class="orb" id="orb-${agendamento.id}"></span>
              </h5>
              <p class="card-text">ID do Cliente: ${agendamento.clienteId}</p>
              <p class="card-text">Horário: ${agendamento.horario}</p>
              <p class="card-text">Serviço: ${agendamento.servico}</p>
              <button class="btn btn-danger" id="desmarcar-${agendamento.id}" ${agendamento.clienteId !== clienteIdGlobal ? 'disabled' : ''}>Desmarcar</button>
              <button class="btn btn-warning" id="remarcar-${agendamento.id}" ${agendamento.clienteId !== clienteIdGlobal ? 'disabled' : ''}>Remarcar</button>
            </div>
          </div>
        `
      )
      .join("");

    agendamentosFuturos.forEach((agendamento) => {
      const orbElement = document.getElementById(`orb-${agendamento.id}`);
      if (orbElement) {
        orbElement.classList.add("orb-green");

        const horarioAgendamento = new Date(agendamento.horario);
        const tempoRestante = horarioAgendamento - new Date() - 5 * 60 * 1000; // 5 minutos antes

        if (isNaN(tempoRestante)) {
          console.error(`Erro no cálculo do tempo restante para o agendamento ${agendamento.id}`);
        } else {
          console.log(`Tempo restante para agendamento ${agendamento.id}: ${tempoRestante} ms`);
          
          if (tempoRestante > 0) {
            setTimeout(() => {
              console.log(`Alterando cor do orb para amarelo no agendamento ${agendamento.id}`);
              orbElement.classList.remove("orb-green");
              orbElement.classList.add("orb-yellow");
            }, tempoRestante);
          }
        }
      }

      document
        .getElementById(`desmarcar-${agendamento.id}`)
        .addEventListener("click", () => {
          console.log(`Desmarcando agendamento ${agendamento.id}`);
          desmarcarHorario(agendamento.id, agendamento.clienteId);
        });

      document
        .getElementById(`remarcar-${agendamento.id}`)
        .addEventListener("click", () => {
          console.log(`Remarcando agendamento ${agendamento.id}`);
          mostrarModalRemarcar(agendamento.id, agendamento.horario, agendamento.clienteId);
        });
    });
  }
}


function desmarcarHorario(id, clienteId) {
  // Verifica se o clienteId corresponde ao cliente atual
  if (clienteId !== clienteIdGlobal) {
    alert("Você não pode desmarcar o horário de outro cliente!");
    return;
  }

  socket.emit("desmarcarHorario", id);
}

let agendamentoIdParaRemarcar = null; // Variável para armazenar o ID do agendamento a ser remarcado

// Abre o modal de remarcação e define o ID do agendamento
function mostrarModalRemarcar(id, horarioAtual, clienteId) {
  // Verifica se o clienteId corresponde ao cliente atual
  if (clienteId !== clienteIdGlobal) {
    alert("Você não pode remarcar o horário de outro cliente!");
    return;
  }

  // Armazenando o ID do agendamento a ser remarcado
  agendamentoIdParaRemarcar = id;
  document.getElementById("novoHorario").value = horarioAtual; // Definindo o horário atual no campo do modal
  const modal = new bootstrap.Modal(document.getElementById('remarcarModal'));
  modal.show(); // Exibe o modal de remarcação
}

// Lida com o envio do formulário de remarcação
document.getElementById("formRemarcar").addEventListener("submit", (e) => {
  e.preventDefault();

  const novoHorario = document.getElementById("novoHorario").value;

  if (agendamentoIdParaRemarcar && novoHorario) {
    socket.emit("remarcarHorario", agendamentoIdParaRemarcar, novoHorario);
    const modal = bootstrap.Modal.getInstance(document.getElementById('remarcarModal'));
    modal.hide(); // Fecha o modal após o envio
  }
});

// Quando o cliente se conecta, ele envia seu identificador único para o servidor
socket.emit("identificarCliente", clienteIdGlobal);

document.getElementById("formAgendamento").addEventListener("submit", (e) => {
  e.preventDefault();

  const nomeCliente = document.getElementById("nomeCliente").value;
  const horarioCliente = document.getElementById("horarioCliente").value; // Espera-se que seja no formato 'HH:mm:ss'
  const servicoCliente = document.getElementById("servicoCliente").value;

  console.log("Verificando valores do formulário...");
  console.log(`Nome: ${nomeCliente}`);
  console.log(`Horário: ${horarioCliente}`);
  console.log(`Serviço: ${servicoCliente}`);

  if (nomeCliente && horarioCliente && servicoCliente) {
    // Verifica se o horário está disponível no backend antes de prosseguir com o agendamento
    socket.emit("verificarHorarioDisponivel", horarioCliente, (response) => {
      if (!response || typeof response === "string") {
        // Caso a resposta seja apenas uma string (erro ou mensagem)
        mostrarModal("Erro", response || "Erro ao verificar os horários.");
        return;
      }
    
      if (response.status === "ocupado") {
        // Exibe a mensagem de horário ocupado no modal
        mostrarModal("Horário Ocupado", response.mensagem);
        return;
      }
    
      if (response.status === "disponivel") {
        // Envia o agendamento se o horário estiver disponível
        socket.emit("agendarHorario", { 
          cliente: nomeCliente, 
          horario: horarioCliente, 
          servico: servicoCliente, 
          clienteId: clienteIdGlobal 
        });
    
        // Resetando o formulário
        document.getElementById("formAgendamento").reset();
    
        // Fechar o modal após o agendamento
        const modalElement = document.getElementById('agendarModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
    
        // Exibe a mensagem de sucesso no modal
        mostrarModal("Agendamento Confirmado", response.mensagem);
      }
    });
    
    // Função para exibir o modal com a mensagem
    function mostrarModal(titulo, mensagem) {
      const modalTitulo = document.getElementById('modalMensagemLabel');
      const modalCorpo = document.getElementById('modalMensagemCorpo');
    
      modalTitulo.textContent = titulo; // Define o título do modal
      modalCorpo.textContent = mensagem; // Define a mensagem no corpo do modal
    
      // Exibe o modal
      const modal = new bootstrap.Modal(document.getElementById('modalMensagem'));
      modal.show();
    }        
  }
});