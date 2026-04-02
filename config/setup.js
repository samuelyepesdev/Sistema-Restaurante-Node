const fs = require('fs');
const path = require('path');

const createRequiredDirectories = () => {
    const directories = [
        path.join(__dirname, '..', 'public'),
        path.join(__dirname, '..', 'public', 'uploads'),
        path.join(__dirname, '..', 'public', 'css'),
        path.join(__dirname, '..', 'public', 'js')
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Directorio creado: ${dir}`);
        }
    });
};

module.exports = { createRequiredDirectories };
