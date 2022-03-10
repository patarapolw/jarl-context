import fs from 'fs'

import yaml from 'js-yaml'
import S from 'jsonschema-definer'

const sImKit = S.shape({
  Japanese: S.string(),
  Reading: S.string().optional(),
  Sentence: S.string(),
  SentenceAudio: S.string(),
  SentenceMeaning: S.string().optional()
}).additionalProperties(true)

async function main() {
  const data = S.list(sImKit).ensure(
    yaml.load(fs.readFileSync('../../my-choice/imkit.yaml', 'utf-8')) as any
  )

  const toCopy: {
    [filePath: string]: any[]
  } = {}

  const reURL =
    /^https:\/\/immersion-kit\.sfo3\.digitaloceanspaces\.com\/media\/([^/]+)\/([^/]+)\/media\/(.+\.mp3)$/
  data.map((d) => {
    const [, f1, f2, id] = reURL.exec(d.SentenceAudio) || []
    if (!f1 || !f2 || !id) {
      console.log(d.SentenceAudio)
    } else {
      const p = `${decodeURIComponent(f1)}/${decodeURIComponent(f2)}`
      toCopy[p] = toCopy[p] || []
      toCopy[p]!.push({
        Japanese: d.Japanese,
        Reading: d.Reading,
        sound: decodeURIComponent(id).replace(/\\_/g, '_')
      })
    }
  })

  Object.entries(toCopy)
    .sort(([p1], [p2]) => p1.localeCompare(p2))
    .map(([p, vs]) => {
      console.log(p, vs)
    })
}

if (require.main === module) {
  main().catch(console.error)
}
