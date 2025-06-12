const config = require('./src/config/config');

module.exports = {
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: +config.get('DB_PORT'),
    username: config.get('DB_USERNAME'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_DATABASE'),
    entities: [__dirname + '/src/**/entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/src/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: true,
    ssl: false,
    extra: {
        trustServerCertificate: true,
    },
};
