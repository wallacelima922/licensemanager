require('dotenv').config();  // Carrega o .env
const mongoose = require('mongoose');  // Ou 'mongodb' se usar o driver nativo

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

mongoose.connect(`${MONGO_URL}/${DB_NAME}`)
  .then(() => console.log('Conectado ao MongoDB!'))
  .catch(err => console.error('Erro na conexão:', err));

async function exportCollections() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Coleções encontradas:', collections.map(c => c.name));

  for (const coll of collections) {
    const data = await mongoose.connection.db.collection(coll.name).find({}).toArray();
    // Salva como JSON
    require('fs').writeFileSync(`${coll.name}.json`, JSON.stringify(data, null, 2));
    console.log(`Exportado ${data.length} docs de ${coll.name} para ${coll.name}.json`);

    // Opcional: pra CSV, use uma lib como csv-writer (npm install csv-writer)
    // Mas por enquanto, JSON é mais fácil; converta online depois.
  }

  mongoose.connection.close();
  console.log('Export finalizado! Arquivos na pasta raiz.');
}

exportCollections();