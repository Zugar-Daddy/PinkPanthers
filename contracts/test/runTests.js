const fs = require('fs');
const path = require('path');
const solc = require('solc');

console.log('🛡️  Compiling ERC-4337 Agent Wallet Smart Contracts...\n');

const contractsDir = path.join(__dirname, '../src');

function findSolidityFiles(dir) {
    let files = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            files = files.concat(findSolidityFiles(filePath));
        } else if (file.endsWith('.sol')) {
            files.push(filePath);
        }
    }
    return files;
}

const solFiles = findSolidityFiles(contractsDir);
console.log(`Found ${solFiles.length} Solidity source files:`);
solFiles.forEach(f => console.log('  📄 ' + path.relative(contractsDir, f)));

const sources = {};
solFiles.forEach(file => {
    const relPath = path.relative(contractsDir, file).replace(/\\/g, '/');
    sources[relPath] = {
        content: fs.readFileSync(file, 'utf8')
    };
});

function findImports(importPath) {
    // Resolve relative imports
    const normalized = importPath.replace(/^\.\//, '').replace(/^\.\.\//, '');
    for (const key of Object.keys(sources)) {
        if (key.endsWith(normalized) || key.includes(normalized)) {
            return { contents: sources[key].content };
        }
    }
    return { error: 'File not found: ' + importPath };
}

const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode']
            }
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hasError = false;
if (output.errors) {
    output.errors.forEach(err => {
        if (err.severity === 'error') {
            hasError = true;
            console.error('❌ Compilation Error:', err.formattedMessage);
        } else if (err.severity === 'warning') {
            console.warn('⚠️  Warning:', err.formattedMessage);
        }
    });
}

if (hasError) {
    console.error('\n❌ Smart contract compilation failed.');
    process.exit(1);
}

console.log('\n✅ All smart contracts compiled successfully!');
const compiledContracts = [];
for (const file in output.contracts) {
    for (const name in output.contracts[file]) {
        const contract = output.contracts[file][name];
        compiledContracts.push({ name, bytecodeSize: contract.evm.bytecode.object.length / 2 });
        console.log(`  ✨ ${name} (Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes)`);
    }
}

// Save compiled ABIs and bytecodes for frontend and testing
const artifactsDir = path.join(__dirname, '../artifacts');
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

fs.writeFileSync(
    path.join(artifactsDir, 'contracts.json'),
    JSON.stringify(output.contracts, null, 2)
);
console.log(`\n💾 Saved compiled contract artifacts to contracts/artifacts/contracts.json`);
