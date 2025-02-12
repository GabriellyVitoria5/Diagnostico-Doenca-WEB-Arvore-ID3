// Ler arquivo ao carregar a página
document.addEventListener("DOMContentLoaded", function () {
    lerArquivoExcel("TabelaTreinamento.xlsx");
});

// Ler arquivo excel
function lerArquivoExcel(nomeArquivo) {
    fetch(nomeArquivo)
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0]; 
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            preencherTabela(jsonData);
        })
        .catch(error => console.error("Erro ao carregar o arquivo Excel:", error));
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

            // Adicionar as opções ao combo box
            ["Irrelevante", "Médio", "Forte"].forEach(optionText => {
                const option = document.createElement("option");
                option.value = optionText;
                option.textContent = optionText;
                select.appendChild(option);
            });

            // Definir o valor do combo box baseado no valor do arquivo Excel
            if (intensidade) {
                const selectedValue = getIntensidadePorValor(intensidade);
                select.value = selectedValue;
            }

            cell.appendChild(select);
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });
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
            return "Irrelevante"; // Valor padrão
    }
}
