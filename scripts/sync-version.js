const fs = require('fs');
const path = require('path');

const packagePath = './package.json'; //path.join(__dirname, 'package.json');
const manifestsDir = './manifests';
const targetManifests = ['manifest.v2.json', 'manifest.v3.json', '../manifest.json'];

try {
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const version = packageData.version;

    targetManifests.forEach((fileName) => {
        const manifestPath = path.join(manifestsDir, fileName);
        const manifestObj = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifestObj.version = version;

        fs.writeFileSync(manifestPath, JSON.stringify(manifestObj, null, 4));
        console.log(`Updated ${fileName} to version ${version}`);
    });
} catch(err) {
    console.error(err);
    process.exit(1);
}