from flask import Flask, request, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# Receber dados de treinamento da tabela
@app.route('/upload', methods=['POST'])
def upload_file():

    # Dados da tabela de treinamento
    data = request.get_json()

    if not data:
        return jsonify({"error": "Nenhum dado enviado"}), 400

    # Processa os dados do arquivo JSON
    print("Dados recebidos:", data)

    # Iniciar treinamento.......

    return jsonify({"message": "Dados recebidos com sucesso!"}), 200

if __name__ == '__main__':
    app.run(debug=True)
