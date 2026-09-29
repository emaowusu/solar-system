require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const redis = require('./redis');

async function main() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/solar');
  await redis.connect();
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

main().catch((err) => { console.error(err); process.exit(1); });
