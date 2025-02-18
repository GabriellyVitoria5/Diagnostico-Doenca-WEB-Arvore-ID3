
document.addEventListener("DOMContentLoaded", function () {
    // Montar a tabela de treinamento padrão com os dados da planilha, ou com oss dados armazenaos localmente se houver
    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
        const dadosTreinamento = getDadosTreinamento();
        if (dadosTreinamento.length > 0) {
            preencherTabelaComDadosSalvos(dadosTreinamento);
        } else {
            lerArquivoExcel("TabelaTreinamento.xlsx");
        }
    }

    // Pegar os dados da tabela de treiamento ao entrar na página do atendimento do paciente
    if (window.location.pathname.endsWith("atenderPaciente.html") || window.location.pathname === "/") {
        getDadosTreinamento();
        criarFormularioSintomas();
    }
});

// Ler arquivo excel
function lerArquivoExcel(nomeArquivo) {
    fetch(nomeArquivo)
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" });
            const nomePlanilha = workbook.SheetNames[0]; 
            const planilha = workbook.Sheets[nomePlanilha];
            const dadosJson = XLSX.utils.sheet_to_json(planilha, { header: 1 });

            preencherTabela(dadosJson);
        })
        .catch(erro => console.error("Erro ao carregar o arquivo Excel:", erro));
}

// Criar a tabela com as doenças, sintomas e suas intensidades a partir das informações do arquivo Excel
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

    // Preencher cabeçalho com doenças (primeira linha do arquivo)
    thead.innerHTML = `<th>Sintoma</th>` + dados[0].slice(1).map(doenca => `<th contenteditable="true">${doenca}</th>`).join('');

    // Adicionar sintomas e combobox de intensidade
    dados.slice(1).forEach((linha, index) => {
        const row = document.createElement("tr");
        const cellSintoma = document.createElement("td");
        cellSintoma.textContent = linha[0]; // Primeira coluna: Nome do sintoma
        cellSintoma.contentEditable = "true";
        row.appendChild(cellSintoma);

        linha.slice(1).forEach((intensidade, colIndex) => {
            const cell = document.createElement("td");
            const select = document.createElement("select");

            // Adicionar as escolha da intensidade dos sintomas no combo box
            ["Irrelevante", "Médio", "Forte"].forEach(optionText => {
                const option = document.createElement("option");
                option.value = optionText;
                option.textContent = optionText;
                select.appendChild(option);
            });

            // Definir o valor do combo box baseado no valor do arquivo Excel
            if (intensidade) {
                const intensidadeSintoma = getIntensidadePorValor(intensidade);
                select.value = intensidadeSintoma;
            }

            cell.appendChild(select);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
}

// Preencher a tabela com os dados armazenados no localStorage
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

    // Cabeçalhos (Sintoma + Doenças)
    const headers = Object.keys(dados[0]);
    thead.innerHTML = `<th>Sintoma</th>` + headers.slice(1).map(doenca => `<th contenteditable="true">${doenca}</th>`).join('');

    // Adicionar sintomas e valores das intensidades
    dados.forEach(linha => {
        const row = document.createElement("tr");
        const cellSintoma = document.createElement("td");
        cellSintoma.textContent = linha["Sintoma"];
        cellSintoma.contentEditable = "true";
        row.appendChild(cellSintoma);

        headers.slice(1).forEach(doenca => {
            const cell = document.createElement("td");
            const select = document.createElement("select");

            ["Irrelevante", "Médio", "Forte"].forEach(optionText => {
                const option = document.createElement("option");
                option.value = optionText;
                option.textContent = optionText;
                if (linha[doenca] === optionText) {
                    option.selected = true;
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

// Função para mapear o valor da intensidade do Excel para o valor do combo box
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

// Guardar os dados inseridos na tabela sobre  as doenças e sintomas localmente
function salvarDadosTreinamento() {
    const tabela = document.getElementById("tabela-sintomas");
    const dados = [];
    const headers = Array.from(tabela.querySelector("thead tr").children).slice(1).map(th => th.textContent.trim()); // Doenças

    tabela.querySelectorAll("tbody tr").forEach(tr => {
        const linha = {};
        const celulas = tr.children;
        linha["Sintoma"] = celulas[0].textContent.trim(); // Sintoma na primeira coluna

        headers.forEach((doenca, index) => {
            const select = celulas[index + 1].querySelector("select");
            linha[doenca] = select.value; // Intensidade do sintoma escolhida
        });

        dados.push(linha);
    });

    // Salva no localStorage para ser usado na tela de atendimento do paciente
    localStorage.setItem("dadosTreinamento", JSON.stringify(dados));

    console.log("Dados de treinamento salvos:", dados);

    gerarDadosTreinamentoJson(JSON.stringify(dados))
}

function gerarDadosTreinamentoJson(dadosTreinamentoSalvos){
    const blob = new Blob([dadosTreinamentoSalvos], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dadosTreinamento.json";  // Nome do arquivo
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Pegar dados do treinamento da tabela de sintomas e doenças que foram armazenados localmente
function getDadosTreinamento(){
    const dadosSalvos = localStorage.getItem("dadosTreinamento");
    if (dadosSalvos) {
        const dadosTreinamento = JSON.parse(dadosSalvos);
        console.log("Dados de treinamento carregados:");
        console.log(JSON.stringify(dadosTreinamento, null, 2));
        return dadosTreinamento // Retornar dados em um JSON
    } 

    console.log("Nenhum dado de treinamento encontrado.");
    return {};
}

// Pegar o arquivo JSON com os dados de treinamento e enviar para o servidor flask
function enviarDadosParaServidor() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecione um arquivo JSON.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const jsonData = JSON.parse(e.target.result);

        // Envia os dados para o servidor Python via POST
        fetch('http://127.0.0.1:5000/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonData)
        })
        .then(response => response.json())
        .then(data => {
            console.log("Dados recebidos pelo servidor:", data);
            window.location.href = "atenderPaciente.html"; // Redirecionar para a página de atendimento
        })
        .catch(error => {
            console.error('Erro ao enviar os dados:', error);
        });
    };

    reader.readAsText(file);
}


