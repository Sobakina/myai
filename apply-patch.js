const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const diff = require('diff');

// 1. Распаковка архива в temp-папку
const zip = new AdmZip('./changes/changed_files.zip');
const tempDir = './__patch_temp__';
zip.extractAllTo(tempDir, true);

// 2. Функция сравнения и патча
function generateAndApplyPatch(originalPath, changedPath, relPath) {
    const orig = fs.readFileSync(originalPath, 'utf8');
    const changed = fs.readFileSync(changedPath, 'utf8');
    if (orig === changed) return;

    // Генерируем diff (в стиле unified diff)
    const patch = diff.createPatch(relPath, orig, changed);

    // Сохраняем patch во временный файл
    const patchPath = path.join(tempDir, relPath.replace(/\//g, '_') + '.patch');
    fs.writeFileSync(patchPath, patch, 'utf8');

    // Применяем patch через git apply (или patch)
    try {
        execSync(`git apply "${patchPath}"`, { stdio: 'inherit' });
        console.log(`Patched: ${relPath}`);
    } catch (e) {
        console.error(`Failed to apply patch to ${relPath}`, e);
    }
}

// 3. Перебор файлов из архива
function walkAndPatch(srcBase, tempBase, rel = '') {
    const absSrc = path.join(srcBase, rel);
    const absTemp = path.join(tempBase, rel);

    if (fs.statSync(absTemp).isDirectory()) {
        fs.readdirSync(absTemp).forEach(child =>
            walkAndPatch(srcBase, tempBase, path.join(rel, child))
        );
    } else {
        // Сравниваем только если файл существует и в src, и в temp
        if (fs.existsSync(absSrc)) {
            generateAndApplyPatch(absSrc, absTemp, rel);
        } else {
            // Если файла не было — можно просто скопировать (или вывести предупреждение)
            fs.copyFileSync(absTemp, absSrc);
            console.log(`Copied new file: ${rel}`);
        }
    }
}

// 4. Запуск сравнения и патчинга
walkAndPatch('./src', tempDir + '/src');

// 5. Очистка временной папки (по желанию)
fs.rmSync(tempDir, { recursive: true, force: true });

console.log('Done!');
