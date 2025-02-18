// Executa quando a página é carregada
document.addEventListener("DOMContentLoaded", function () {
  // Verifica se estamos na página inicial
  if (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/"
  ) {
    const dadosTreinamento = getDadosTreinamento(); // Busca dados salvos no localStorage
    if (dadosTreinamento.length > 0) {
      preencherTabelaComDadosSalvos(dadosTreinamento); // Preenche a tabela com dados salvos
    } else {
      lerArquivoExcel("TabelaTreinamento.xlsx"); // Carrega dados de um arquivo Excel
    }
  }

  // Verifica se estamos na página de atendimento
  if (
    window.location.pathname.endsWith("atenderPaciente.html") ||
    window.location.pathname === "/"
  ) {
    getDadosTreinamento(); // Busca dados de treinamento
    criarFormularioSintomas(); // Cria o formulário de sintomas para o paciente
  }
});

// Função para ler um arquivo Excel
function lerArquivoExcel(nomeArquivo) {
  fetch(nomeArquivo)
    .then((response) => response.arrayBuffer()) // Converte o arquivo para um array de bytes
    .then((data) => {
      const workbook = XLSX.read(data, { type: "array" }); // Lê o arquivo Excel
      const nomePlanilha = workbook.SheetNames[0]; // Pega o nome da primeira planilha
      const planilha = workbook.Sheets[nomePlanilha]; // Acessa a planilha
      const dadosJson = XLSX.utils.sheet_to_json(planilha, { header: 1 }); // Converte para JSON

      preencherTabela(dadosJson); // Preenche a tabela com os dados
    })
    .catch((erro) => console.error("Erro ao carregar o arquivo Excel:", erro));
}

// Função para preencher a tabela com os dados do Excel
function preencherTabela(dados) {
  if (dados.length === 0) {
    console.error("Arquivo Excel vazio ou formato inválido.");
    return;
  }

  const thead = document.querySelector("#tabela-sintomas thead tr"); // Cabeçalho da tabela
  const tbody = document.querySelector("#tabela-sintomas tbody"); // Corpo da tabela

  // Limpa a tabela antes de adicionar novos dados
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Preenche o cabeçalho com as doenças (primeira linha do Excel)
  thead.innerHTML =
    `<th>Sintoma</th>` +
    dados[0]
      .slice(1)
      .map((doenca) => `<th contenteditable="true">${doenca}</th>`)
      .join("");

  // Adiciona os sintomas e as intensidades (combobox)
  dados.slice(1).forEach((linha, index) => {
    const row = document.createElement("tr"); // Cria uma nova linha
    const cellSintoma = document.createElement("td"); // Cria célula para o sintoma
    cellSintoma.textContent = linha[0]; // Adiciona o nome do sintoma
    cellSintoma.contentEditable = "true"; // Permite editar o nome do sintoma
    row.appendChild(cellSintoma);

    // Adiciona as intensidades (combobox) para cada doença
    linha.slice(1).forEach((intensidade, colIndex) => {
      const cell = document.createElement("td");
      const select = document.createElement("select");

      // Adiciona as opções de intensidade
      ["Irrelevante", "Médio", "Forte"].forEach((optionText) => {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        select.appendChild(option);
      });

      // Define o valor do combobox com base no valor do Excel
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

// Função para preencher a tabela com dados salvos no localStorage
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
    cellSintoma.textContent = linha["Sintoma"]; // Adiciona o nome do sintoma
    cellSintoma.contentEditable = "true";
    row.appendChild(cellSintoma);

    // Adiciona as intensidades (combobox) para cada doença
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

    tbody.appendChild(row); // Adiciona a linha à tabela
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
      return "Irrelevante"; // Valor padrão
  }
}

// Função para salvar os dados da tabela no localStorage
function salvarDadosTreinamento() {
  const tabela = document.getElementById("tabela-sintomas");
  const dados = [];
  const headers = Array.from(tabela.querySelector("thead tr").children)
    .slice(1)
    .map((th) => th.textContent.trim()); // Doenças

  // Coleta os dados da tabela
  tabela.querySelectorAll("tbody tr").forEach((tr) => {
    const linha = {};
    const celulas = tr.children;
    linha["Sintoma"] = celulas[0].textContent.trim(); // Sintoma

    headers.forEach((doenca, index) => {
      const select = celulas[index + 1].querySelector("select");
      linha[doenca] = select.value; // Intensidade
    });

    dados.push(linha); // Adiciona a linha aos dados
  });

  localStorage.setItem("dadosTreinamento", JSON.stringify(dados)); // Salva no localStorage
  console.log("Dados de treinamento salvos:", dados);

  gerarDadosTreinamentoJson(JSON.stringify(dados)); // Gera um arquivo JSON com os dados
}

// Função para gerar e baixar um arquivo JSON com os dados
function gerarDadosTreinamentoJson(dadosTreinamentoSalvos) {
  const blob = new Blob([dadosTreinamentoSalvos], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dadosTreinamento.json"; // Nome do arquivo
  document.body.appendChild(a);
  a.click(); // Inicia o download
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Função para buscar dados de treinamento do localStorage
function getDadosTreinamento() {
  const dadosSalvos = localStorage.getItem("dadosTreinamento");
  if (dadosSalvos) {
    const dadosTreinamento = JSON.parse(dadosSalvos);
    console.log("Dados de treinamento carregados:", dadosTreinamento);
    return dadosTreinamento; // Retorna os dados
  }

  console.log("Nenhum dado de treinamento encontrado.");
  return {};
}

// Função para enviar dados de treinamento para o servidor Flask
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

    // Envia os dados para o servidor
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

  reader.readAsText(file); // Lê o arquivo como texto
}

// Função para criar o formulário de sintomas para o paciente
function criarFormularioSintomas() {
  const dadosTreinamento = getDadosTreinamento();
  const form = document.getElementById("form-sintomas");

  if (!dadosTreinamento || Object.keys(dadosTreinamento).length === 0) {
    console.warn("Nenhum dado de treinamento encontrado.");
    return;
  }

  // Adiciona os sintomas e as opções de intensidade
  dadosTreinamento.forEach((sintomaObj) => {
    const sintoma = sintomaObj["Sintoma"];
    const div = document.createElement("div");
    div.classList.add("card-sintoma");

    const label = document.createElement("label");
    label.textContent = sintoma;
    div.appendChild(label);

    // Adiciona radio buttons para intensidade
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

    form.appendChild(div); // Adiciona o sintoma ao formulário
  });

  // Adiciona o botão de enviar
  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Finalizar diagnóstico";
  form.appendChild(button);
}

// Função para enviar as respostas do paciente para o servidor
function enviarRespostasParaServidor() {
  const form = document.getElementById("form-sintomas");
  const respostas = [];

  // Coleta as respostas do formulário
  const inputs = form.querySelectorAll('input[type="radio"]:checked');
  inputs.forEach((input) => {
    const sintoma = input.name;
    const intensidade = input.value;
    respostas.push({ sintoma, intensidade });
  });

  if (respostas.length === 0) {
    alert("Por favor, responda a todos os sintomas antes de enviar.");
    return;
  }

  // Envia as respostas para o servidor
  fetch("http://127.0.0.1:5000/diagnostico", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ respostas }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Dados recebidos pelo servidor:", data);
    })
    .catch((error) => {
      console.error("Erro ao enviar as respostas:", error);
    });
}

// Adiciona o evento de envio ao formulário
document
  .getElementById("form-sintomas")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Evita o envio padrão do formulário
    enviarRespostasParaServidor(); // Envia as respostas
  });
