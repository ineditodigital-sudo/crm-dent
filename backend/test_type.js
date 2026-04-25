try {
    const fs = require('fs');
    console.log('File: CommonJS works');
} catch (e) {
    console.log('File: ESM only');
}
