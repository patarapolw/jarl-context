import fs from 'fs'

async function main() {
  const ids = ['KRB2LL5hhJE']

  for (const id of ids) {
    const filePath = `../../youtube/${id}.md`

    if (fs.existsSync(filePath)) {
      let txt = fs.readFileSync(filePath, 'utf-8')

      const lines = txt.split(/\r?\n/g).filter((r) => !/<c>/.test(r))
      const newLines: string[] = []

      lines.map((r, i) => {
        let j = 0

        if (r && (lines[i - 1] || '').endsWith('align:start position:0%')) {
          j = i - 2
          while (--j > 0) {
            if (
              r === lines[j + 1] &&
              lines[j]!.endsWith('align:start position:0%')
            ) {
              break
            }
          }
        }

        if (j) {
          Array.from({ length: i - j }, () => newLines.pop())

          newLines.push(
            `${lines[j]!.split(' ')[0]} --> ${
              lines[i - 1]!.split(' ')[2]
            }\n${r}`
          )
        } else {
          newLines.push(r)
        }
      })

      txt = newLines.join('\n')

      fs.writeFileSync(filePath, txt)
    }
  }
}

if (require.main === module) {
  main()
}
