socket.on("verificarHorarioDisponivel", (horarioCliente, callback) => {
    console.log("Verificando horário:", horarioCliente); // Log do horário enviado
    const agora = new Date();
    const horarioFormatado = new Date(agora.toDateString() + " " + horarioCliente); // Combina a data de hoje com o horário do cliente
  
    console.log("Horário formatado para verificação:", horarioFormatado); // Verifique o horário completo
  
    const queryVerificarHorario = "SELECT * FROM agendamentos WHERE DATE(horario) = DATE(?) AND TIME(horario) = TIME(?)";
    
    db.query(queryVerificarHorario, [horarioFormatado, horarioFormatado], (err, results) => {
      if (err) {
        console.error("Erro ao verificar horário:", err);
        return callback("Erro ao verificar horário.");
      }
  
      console.log("Resultado da verificação:", results); // Log da consulta
      if (results.length > 0) {
        return callback("O horário já está ocupado.");
      }
  
      return callback("Horário disponível.");
    });
  });

  
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
        if (response === "Horário disponível.") {
          // Envia o agendamento se o horário estiver disponível
          socket.emit("agendarHorario", { cliente: nomeCliente, horario: horarioCliente, servico: servicoCliente, clienteId: clienteIdGlobal });
  
            // Horário entre 20h00 e 8h00
            /*if (hora >= 20 || hora < 8) {
                alert("Horários entre 20h00 e 8h00 não são permitidos para agendamento.");
                return;
            }*/

          // Resetando o formulário
          document.getElementById("formAgendamento").reset();
  
          // Fechar o modal após o agendamento
          const modalElement = document.getElementById('agendarModal');
          const modal = bootstrap.Modal.getInstance(modalElement);
          modal.hide();
        } else {
          alert(response); // Exibe uma mensagem de erro se o horário já estiver ocupado
        }
      });
    }
  });
  