from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.tree import DecisionTreeClassifier

app = Flask(__name__)
CORS(app)

# Inicializar o modelo de árvore de decisão (ID3)
model = None
X_global = None  # Armazena as colunas usadas no treinamento
sintomas_treinados = []  # Lista para armazenar os sintomas treinados


@app.route("/upload", methods=["POST"])
def upload_file():
    global model, X_global, sintomas_treinados

    data = request.get_json()

    # Verifica se os dados foram recebidos corretamente
    if not data:
        return jsonify({"error": "Nenhum dado enviado"}), 400

    # Imprime o JSON recebido para depuração
    print("JSON recebido:", data)

    # Converte os dados de forma correta
    data_corrigido = []
    for item in data:
        if "Sintoma" in item:
            sintoma = item["Sintoma"]  # Corrige o nome
            for doenca, intensidade in item.items():
                if doenca != "Sintoma":  # Ignora a chave "Sintoma"
                    data_corrigido.append(
                        {
                            "sintoma": sintoma,
                            "doenca": doenca,
                            "intensidade": intensidade,
                        }
                    )

    # Verifica se os dados foram convertidos corretamente
    if not data_corrigido:
        return (
            jsonify({"error": "Formato inválido. Nenhuma entrada válida encontrada."}),
            400,
        )

    # Mapeamento das intensidades para números
    intensidade_map = {"Irrelevante": 0, "Médio": 1, "Forte": 2}

    sintomas_treinados = []
    intensidades_dict = {}

    # Processa os dados e mapeia as intensidades
    for item in data_corrigido:
        if "sintoma" not in item or "intensidade" not in item:
            return (
                jsonify(
                    {
                        "error": "Formato inválido. Cada item deve conter 'sintoma' e 'intensidade'."
                    }
                ),
                400,
            )

        sintoma = item["sintoma"]
        intensidade = item["intensidade"]

        # Inicializa a chave do sintoma se não existir
        if sintoma not in intensidades_dict:
            intensidades_dict[sintoma] = []

        # Adiciona a intensidade mapeada
        intensidades_dict[sintoma].append(intensidade_map.get(intensidade, 0))

        # Adiciona o sintoma à lista de sintomas treinados
        if sintoma not in sintomas_treinados:
            sintomas_treinados.append(sintoma)

    # Ajusta os dados para criar o DataFrame
    intensidades = [intensidades_dict[sintoma] for sintoma in sintomas_treinados]
    intensidades = list(
        zip(*intensidades)
    )  # Transposta para garantir que as intensidades se alinhem

    # Criar DataFrame corretamente
    df = pd.DataFrame(intensidades, columns=sintomas_treinados)

    X_global = df

    # Corrige o vetor y para ter um rótulo por amostra
    # Assumimos que você quer o rótulo de doença associado ao sintoma mais relevante
    y = [item["doenca"] for item in data_corrigido[: len(X_global)]]

    # Ajusta o modelo com múltiplas doenças
    model = DecisionTreeClassifier(criterion="entropy")
    model.fit(X_global, y)

    return jsonify({"message": "Modelo treinado com sucesso!"}), 200


# Rota para receber o diagnóstico do paciente
@app.route("/diagnostico", methods=["POST"])
def receber_diagnostico():
    global sintomas_treinados, X_global, model

    respostas = request.get_json().get("respostas", [])
    if not respostas:
        return jsonify({"error": "Nenhuma resposta recebida"}), 400

    resposta_dict = {
        resposta["sintoma"]: resposta["intensidade"] for resposta in respostas
    }

    # Verificar se todos os sintomas treinados foram enviados no diagnóstico
    sintomas_faltando = [s for s in sintomas_treinados if s not in resposta_dict]
    if sintomas_faltando:
        return (
            jsonify(
                {"error": f"Sintomas ausentes no diagnóstico: {sintomas_faltando}"}
            ),
            400,
        )

    # Mapear as respostas para os valores numéricos e garantir a ordem correta
    intensidade_map = {"Irrelevante": 0, "Médio": 1, "Forte": 2}
    respostas_numericas = [
        intensidade_map[resposta_dict[sintoma]] for sintoma in sintomas_treinados
    ]

    # Verificar se o número de respostas bate com o número de colunas do modelo
    if len(respostas_numericas) != len(X_global.columns):
        return (
            jsonify(
                {
                    "error": "Número incorreto de respostas.",
                    "esperado": len(X_global.columns),
                    "recebido": len(respostas_numericas),
                    "sintomas_treinados": sintomas_treinados,
                    "sintomas_recebidos": list(resposta_dict.keys()),
                }
            ),
            400,
        )

    # Fazer a previsão com o modelo
    prediction = model.predict([respostas_numericas])

    return jsonify({"diagnostico": prediction[0]}), 200


if __name__ == "__main__":
    app.run(debug=True)
