from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd  # Biblioteca para manipulação de dados em formato de tabela
from sklearn.tree import DecisionTreeClassifier  # Algoritmo de árvore de decisão

app = Flask(__name__)
CORS(app)

model = None  # Modelo de árvore de decisão
X_global = None  # Armazena as colunas (sintomas) usadas no treinamento
sintomas_treinados = []  # Lista para armazenar os sintomas que foram treinados


# Rota para receber e processar os dados de treinamento
@app.route("/upload", methods=["POST"])
def upload_file():
    global model, X_global, sintomas_treinados  

    # Recebe os dados enviados no corpo da requisição
    data = request.get_json() 

    if not data:
        return jsonify({"error": "Nenhum dado enviado"}), 400

    print("JSON recebido:", data)  # Exibe os dados recebidos para depuração

    # Converte os dados para o formato correto e mais fácil de trabalhar
    data_corrigido = []
    for item in data:
        if "Sintoma" in item:
            sintoma = item["Sintoma"]  
            for doenca, intensidade in item.items():
                if doenca != "Sintoma":  # Ignora a chave "Sintoma"
                    data_corrigido.append(
                        {
                            "sintoma": sintoma,
                            "doenca": doenca,
                            "intensidade": intensidade,
                        }
                    )   

    if not data_corrigido:
        return (
            jsonify({"error": "Formato inválido. Nenhuma entrada válida encontrada."}),
            400,
        )

    # Mapeia as intensidades para números (0: Irrelevante, 1: Médio, 2: Forte)
    intensidade_map = {"Irrelevante": 0, "Médio": 1, "Forte": 2}

    sintomas_treinados = []  # Reinicia a lista de sintomas treinados
    intensidades_dict = {}  # Dicionário com intensidades dos sintomas

    # Processa os dados e mapeia as intensidades
    for item in data_corrigido:
        sintoma = item["sintoma"]
        intensidade = item["intensidade"]

        # Inicializa a lista de intensidades para cada sintoma
        if sintoma not in intensidades_dict:
            intensidades_dict[sintoma] = []

        # Adiciona a intensidade mapeada ao sintoma correspondente
        intensidades_dict[sintoma].append(intensidade_map.get(intensidade, 0))

        # Adiciona o sintoma à lista de sintomas treinados (se ainda não estiver)
        if sintoma not in sintomas_treinados:
            sintomas_treinados.append(sintoma)

    # Cria uma lista de listas com as intensidades dos sintomas
    intensidades = [intensidades_dict[sintoma] for sintoma in sintomas_treinados]
    intensidades = list(
        zip(*intensidades)
    )  # Transpõe a lista para alinhar as intensidades

    # Criar um DataFrame (tabela) com as intensidades e os sintomas como colunas
    df = pd.DataFrame(intensidades, columns=sintomas_treinados)
    X_global = df  # Armazena o DataFrame globalmente

    # Criar o vetor de rótulos (doenças) com base nas doenças associadas aos sintomas
    y = [item["doenca"] for item in data_corrigido[: len(X_global)]]

    # Treinar o modelo de árvore de decisão com os dados
    model = DecisionTreeClassifier(criterion="entropy")
    model.fit(X_global, y)

    return jsonify({"message": "Modelo treinado com sucesso!"}), 200


# Rota para receber os sintomas e retornar um diagnóstico
@app.route("/diagnostico", methods=["POST"])
def receber_diagnostico():
    global sintomas_treinados, X_global, model  

    respostas = request.get_json().get(
        "respostas", []
    ) 
    if not respostas:
        return jsonify({"error": "Nenhuma resposta recebida"}), 400

    # Converte as respostas em um dicionário {sintoma: intensidade}
    resposta_dict = {
        resposta["sintoma"]: resposta["intensidade"] for resposta in respostas
    }

    # Verifica se todos os sintomas treinados foram enviados
    sintomas_faltando = [s for s in sintomas_treinados if s not in resposta_dict]
    if sintomas_faltando:
        return (
            jsonify(
                {"error": f"Sintomas ausentes no diagnóstico: {sintomas_faltando}"}
            ),
            400,
        )

    # Mapeia as intensidades das respostas para números
    intensidade_map = {"Irrelevante": 0, "Médio": 1, "Forte": 2}
    respostas_numericas = [
        intensidade_map[resposta_dict[sintoma]] for sintoma in sintomas_treinados
    ]

    # Verifica se o número de respostas corresponde ao número de sintomas treinados
    if len(respostas_numericas) != len(X_global.columns):
        return jsonify({"error": "Número incorreto de respostas."}), 400

    # Criar um DataFrame com os nomes das colunas corretos
    respostas_df = pd.DataFrame([respostas_numericas], columns=sintomas_treinados)

    # Fazer a previsão usando o modelo treinado
    prediction = model.predict(respostas_df)

    return jsonify({"diagnostico": prediction[0]}), 200 


if __name__ == "__main__":
    app.run(debug=True)  
