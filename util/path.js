const path = require('path'); // Importing the path module

// Exporting the directory name of the main module file
module.exports = path.dirname(require.main.filename);