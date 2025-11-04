require('dotenv').config({ path: './backend/.env' });  // Ajustado pro path certo
console.log('MONGO_URL from env:', process.env.MONGO_URL);
console.log('DB_NAME from env:', process.env.DB_NAME);

const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;

if (!MONGO_URL || !DB_NAME) {
  console.error('ERRO: MONGO_URL ou DB_NAME não definidos! Verifique .env');
  process.exit(1);
}

async function exportCollections() {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Coleções encontradas:', collections.map(c => c.name));

    for (const coll of collections) {
      const data = await mongoose.connection.db.collection(coll.name).find({}).toArray();
      fs.writeFileSync(`${coll.name}.json`, JSON.stringify(data, null, 2));
      console.log(`Exportado ${data.length} docs de ${coll.name} para ${coll.name}.json`);
    }
    console.log('Export finalizado! Arquivos na pasta raiz.');
  } catch (err) {
    console.error('Erro no export:', err);
  }
}

// Conecta e espera o evento 'connected'
mongoose.connect(`${MONGO_URL}/${DB_NAME}`)
  .then(() => {
    console.log('Conectado ao MongoDB!');
    return exportCollections();
  })
  .catch(err => {
    console.error('Erro na conexão:', err);
    process.exit(1);
  });

// Aguarda conexão pronta (event listener)
mongoose.connection.on('connected', () => {
  console.log('Evento: Conexão estabelecida!');
  // Chama export só se não chamou ainda (mas .then() já cuida)
});

mongoose.connection.on('error', (err) => {
  console.error('Evento: Erro na conexão:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Desconectado do MongoDB');
});