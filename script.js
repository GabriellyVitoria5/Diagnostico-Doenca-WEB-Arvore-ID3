document.addEventListener("DOMContentLoaded", function () {
  // Verifica se estamos na página inicial (index.html)
  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    
    const dadosTreinamento = getDadosTreinamento(); 
    if (dadosTreinamento.length > 0) {
      preencherTabelaComDadosSalvos(dadosTreinamento); 
    } 
    else {
      lerArquivoExcel("TabelaTreinamento.xlsx"); 
    }

    // Adiciona o evento para exibir o nome do arquivo selecionado (somente na página inicial)
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const fileName = this.files[0]? this.files[0].name: "Nenhum arquivo selecionado";
        document.getElementById("file-name").textContent = fileName;
      });
    }
  }

  if (window.location.pathname.endsWith("atenderPaciente.html") || window.location.pathname === "/atenderPaciente") {
    const dadosTreinamento = getDadosTreinamento(); 
    if (dadosTreinamento.length > 0) {
      iniciarAtendimento(dadosTreinamento); 
    } else {
      console.warn("Nenhum dado de treinamento encontrado.");
    }
  }

});

// Ler arquivo Exel com a base de dadaos de sintomas e doenças do treinamento padrão
function lerArquivoExcel(nomeArquivo) {
  fetch(nomeArquivo)
    .then((response) => response.arrayBuffer()) 
    .then((data) => {
      const workbook = XLSX.read(data, { type: "array" }); 
      const nomePlanilha = workbook.SheetNames[0]; 
      const planilha = workbook.Sheets[nomePlanilha]; 
      const dadosJson = XLSX.utils.sheet_to_json(planilha, { header: 1 }); 

      preencherTabela(dadosJson);
    })
    .catch((erro) => console.error("Erro ao carregar o arquivo Excel:", erro));
}

// Preencher a tabela de treinamento com os dados do arquivo Excel
function preencherTabela(dados) {
  if (dados.length === 0) {
    console.error("Arquivo Excel vazio ou formato inválido.");
    return;
  }

  const thead = document.querySelector("#tabela-sintomas thead tr"); 
  const tbody = document.querySelector("#tabela-sintomas tbody"); 

  // Limpa a tabela antes de adicionar novos dados
  thead.innerHTML = "";
  tbody.innerHTML = "";
  thead.innerHTML =`<th>Sintoma</th>` + dados[0].slice(1).map((doenca) => `<th contenteditable="true">${doenca}</th>`).join("");

  // Adiciona os sintomas e as intensidades (combobox)
  dados.slice(1).forEach((linha, index) => {
    const row = document.createElement("tr"); 
    const cellSintoma = document.createElement("td"); // Cria célula para o sintoma
    cellSintoma.textContent = linha[0]; // Adiciona o nome do sintoma
    cellSintoma.contentEditable = "true"; // Permite editar o nome do sintoma
    row.appendChild(cellSintoma);

    linha.slice(1).forEach((intensidade, colIndex) => {
      const cell = document.createElement("td");
      const select = document.createElement("select");

      ["Irrelevante", "Médio", "Forte"].forEach((optionText) => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        select.appendChild(option);
      });

      if (intensidade) {
        const intensidadeSintoma = getIntensidadePorValor(intensidade);
        select.value = intensidadeSintoma;
      }

      cell.appendChild(select);
      row.appendChild(cell);
    });

    tbody.appendChild(row); // Adiciona a linha à tabela
  });
}

// Preencher a tabela com dados salvos no localStorage
function preencherTabelaComDadosSalvos(dados) {
  if (!dados || dados.length === 0) {
    console.warn("Nenhum dado salvo encontrado para preencher a tabela.");
    return;
  }

  const thead = document.querySelector("#tabela-sintomas thead tr");
  const tbody = document.querySelector("#tabela-sintomas tbody");

  // Limpa a tabela antes de adicionar novos dados
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Preenche o cabeçalho com as doenças
  const headers = Object.keys(dados[0]);
  thead.innerHTML =
    `<th>Sintoma</th>` +
    headers
      .slice(1)
      .map((doenca) => `<th contenteditable="true">${doenca}</th>`)
      .join("");

  // Adiciona os sintomas e as intensidades
  dados.forEach((linha) => {
    const row = document.createElement("tr");
    const cellSintoma = document.createElement("td");
    cellSintoma.textContent = linha["Sintoma"]; 
    cellSintoma.contentEditable = "true";
    row.appendChild(cellSintoma);

    headers.slice(1).forEach((doenca) => {
      const cell = document.createElement("td");
      const select = document.createElement("select");

      ["Irrelevante", "Médio", "Forte"].forEach((optionText) => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        if (linha[doenca] === optionText) {
          option.selected = true; // Seleciona a opção correta
        }
        select.appendChild(option);
      });

      cell.appendChild(select);
      row.appendChild(cell);
    });

    tbody.appendChild(row);
  });

  console.log("Tabela preenchida com os dados salvos.");
}

// Função para mapear valores de intensidade
function getIntensidadePorValor(valor) {
  switch (valor) {
    case "Irrelevante":
      return "Irrelevante";
    case "Médio":
      return "Médio";
    case "Forte":
      return "Forte";
    default:
      return "Irrelevante"; 
  }
}

// Salvar os dados da tabela no localStorage
function salvarDadosTreinamento() {
  const tabela = document.getElementById("tabela-sintomas");
  const dados = [];
  const headers = Array.from(tabela.querySelector("thead tr").children).slice(1).map((th) => th.textContent.trim()); // Doenças

  // Pegar os dados da tabela
  tabela.querySelectorAll("tbody tr").forEach((tr) => {
    const linha = {};
    const celulas = tr.children;
    linha["Sintoma"] = celulas[0].textContent.trim(); // Sintoma

    headers.forEach((doenca, index) => {
      const select = celulas[index + 1].querySelector("select");
      linha[doenca] = select.value; // Intensidade
    });

    dados.push(linha); 
  });

  localStorage.setItem("dadosTreinamento", JSON.stringify(dados)); 
  console.log("Dados de treinamento salvos:", dados);

  gerarDadosTreinamentoJson(JSON.stringify(dados)); 
}

// Gerar e baixar um arquivo JSON com os dados do treinamento
function gerarDadosTreinamentoJson(dadosTreinamentoSalvos) {
  const blob = new Blob([dadosTreinamentoSalvos], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dadosTreinamento.json"; 
  document.body.appendChild(a);
  a.click(); 
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Buscar dados de treinamento do localStorage
function getDadosTreinamento() {
  const dadosSalvos = localStorage.getItem("dadosTreinamento");
  if (dadosSalvos) {
    const dadosTreinamento = JSON.parse(dadosSalvos);
    console.log("Dados de treinamento carregados:", dadosTreinamento);
    return dadosTreinamento; 
  }

  console.log("Nenhum dado de treinamento encontrado.");
  return {};
}

// Enviar dados de treinamento para o servidor Flask para iniciar o atendimento do paciente
function enviarDadosParaServidor() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Por favor, selecione um arquivo JSON.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const jsonData = JSON.parse(e.target.result);

    fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Dados recebidos pelo servidor:", data);
        window.location.href = "atenderPaciente.html"; // Redireciona para a página de atendimento
      })
      .catch((error) => {
        console.error("Erro ao enviar os dados:", error);
      });
  };

  reader.readAsText(file); 
}

// Formulário de sintomas para o paciente poder responder
function criarFormularioSintomas() {
  const dadosTreinamento = getDadosTreinamento();
  const form = document.getElementById("form-sintomas");

  // Validar se o formulário existe e se há dados de treinamento
  if (!form ||!dadosTreinamento ||Object.keys(dadosTreinamento).length === 0) {
    console.warn("Nenhum dado de treinamento encontrado ou formulário não existe.");
    return;
  }

  // Adicionar os sintomas e as opções de intensidade
  dadosTreinamento.forEach((sintomaObj) => {
    const sintoma = sintomaObj["Sintoma"];
    const div = document.createElement("div");
    div.classList.add("card-sintoma");

    const label = document.createElement("label");
    label.textContent = sintoma;
    div.appendChild(label);

    // Adicionar radio buttons para intensidade
    ["Irrelevante", "Médio", "Forte"].forEach((intensidade) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = sintoma;
      input.value = intensidade;

      const labelRadio = document.createElement("label");
      labelRadio.textContent = intensidade;
      labelRadio.appendChild(input);

      div.appendChild(labelRadio);
    });

    form.appendChild(div); 
  });

  // Botão para enviar as respostar e finalizar o diagnóstico
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Finalizar diagnóstico";
  form.appendChild(button);
}

// Iniciar o atendimento
function iniciarAtendimento(dadosTreinamento) {
  const perguntasContainer = document.getElementById("perguntas-container");
  const btnVoltar = document.getElementById("btn-voltar");
  const btnAvancar = document.getElementById("btn-avancar");

  let perguntaAtual = 0;
  const respostas = [];

  // Exibir a pergunta atual
  function exibirPergunta() {
    perguntasContainer.innerHTML = "";

    const sintoma = dadosTreinamento[perguntaAtual]["Sintoma"];
    const div = document.createElement("div");
    div.classList.add("card-sintoma");

    const label = document.createElement("label");
    label.textContent = sintoma;
    div.appendChild(label);

    // Adicionar radio buttons para intensidade
    ["Irrelevante", "Médio", "Forte"].forEach((intensidade) => {
      const input = document.createElement("input");
      input.type = "radio";
      input.name = sintoma;
      input.value = intensidade;

      input.addEventListener("change", () => {
        respostas[perguntaAtual] = { sintoma, intensidade };
        btnAvancar.disabled = false; // Habilita o botão "Avançar"
      });

      const labelRadio = document.createElement("label");
      labelRadio.textContent = intensidade;
      labelRadio.appendChild(input);

      div.appendChild(labelRadio);
    });

    perguntasContainer.appendChild(div);

    // Atualizar o estado dos botões de navegação
    btnVoltar.disabled = perguntaAtual === 0;
    btnAvancar.disabled = !respostas[perguntaAtual];
  }

  // Navegar para a próxima pergunta
  btnAvancar.addEventListener("click", () => {
    if (perguntaAtual < dadosTreinamento.length - 1) {
      perguntaAtual++;
      exibirPergunta();
    } else {
      enviarRespostasParaServidor(respostas); // Envia as respostas ao servidor
    }
  });

  // Navegar para a pergunta anterior
  btnVoltar.addEventListener("click", () => {
    if (perguntaAtual > 0) {
      perguntaAtual--;
      exibirPergunta();
    }
  });

  exibirPergunta();
}

// Enviar as respostas do paciente para o servidor
function enviarRespostasParaServidor(respostas) {
  fetch("http://127.0.0.1:5000/diagnostico", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ respostas }),
  })
    .then((response) => response.json())
    .then((data) => {
      exibirDiagnostico(data.diagnostico);
      console.log("Dados recebidos pelo servidor:", data);
    })
    .catch((error) => {
      console.error("Erro ao enviar as respostas:", error);
    });
}

// Adicionar o evento de envio ao formulário (somente se o formulário existir)
const formSintomas = document.getElementById("form-sintomas");
if (formSintomas) {
  formSintomas.addEventListener("submit", function (event) {
    event.preventDefault(); 
    enviarRespostasParaServidor(); 
  });
}

// Exibir o diagnóstico da doença no modal
function exibirDiagnostico(diagnostico) {
  const modal = document.getElementById("modal-diagnostico");
  const textoDiagnostico = document.getElementById("diagnostico-texto");

  textoDiagnostico.textContent = diagnostico;

  modal.style.display = "block";
}

// Fechar o modal com resultado do diagnóstico
document.getElementById("btn-fechar-modal").addEventListener("click", function () {
    const modal = document.getElementById("modal-diagnostico");
    modal.style.display = "none"; 
  });
