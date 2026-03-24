import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

type CliArgs = {
  source: string
  output: string
}

function parseArgs(argv: string[]): CliArgs {
  const sourceFlag = '--source='
  const outputFlag = '--output='
  const source = argv.find((arg) => arg.startsWith(sourceFlag))?.slice(sourceFlag.length)
  const output = argv.find((arg) => arg.startsWith(outputFlag))?.slice(outputFlag.length)
  return {
    source: source ?? '2010 Chevrolet Camaro SS.usdz',
    output: output ?? 'public/models/camaro-ss.glb',
  }
}

function run(): void {
  const args = parseArgs(process.argv.slice(2))
  const sourcePath = resolve(process.cwd(), args.source)
  const outputPath = resolve(process.cwd(), args.output)
  if (!existsSync(sourcePath))
    throw new Error(`USDZ source not found: ${sourcePath}`)

  if (!existsSync(outputPath)) {
    throw new Error(
      [
        `GLB output not found: ${outputPath}`,
        'Use an offline converter (recommended: Blender) then re-run.',
        `Example: blender --background --python "convert_usdz_to_glb.py" -- "${sourcePath}" "${outputPath}"`,
      ].join('\n'),
    )
  }

  console.log(`[convert-model] Source present: ${sourcePath}`)
  console.log(`[convert-model] Output present: ${outputPath}`)
}

run()
