import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import ts from 'typescript'

const root = process.cwd()
const sourceRoots = ['src', 'prisma', 'scripts', 'tests']
const supportedExtensions = new Set(['.ts', '.tsx', '.mts'])
const files = []

async function collectFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await collectFiles(path)
    else if (supportedExtensions.has(extname(entry.name))) files.push(path)
  }
}

for (const sourceRoot of sourceRoots) {
  await collectFiles(join(root, sourceRoot))
}

let errorCount = 0

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
    },
  })

  for (const diagnostic of result.diagnostics ?? []) {
    if (diagnostic.category !== ts.DiagnosticCategory.Error) continue

    errorCount += 1
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    const location = diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : null
    const suffix = location
      ? `:${location.line + 1}:${location.character + 1}`
      : ''

    console.error(`${relative(root, file)}${suffix} ${message}`)
  }
}

if (errorCount > 0) {
  console.error(`Syntax check failed with ${errorCount} error(s).`)
  process.exitCode = 1
} else {
  console.log(`Syntax check passed for ${files.length} TypeScript file(s).`)
}
