import fs from 'fs'

import glob from 'fast-glob'
import yaml from 'js-yaml'
import S from 'jsonschema-definer'

const sDataJSON = S.shape({
  id: S.string(),
  sentence: S.string(),
  translation: S.string().optional(),
  sentence_with_furigana: S.string().optional(),
  word_base_list: S.list(S.string()).optional(),
  word_dictionary_list: S.list(S.string()).optional(),
  word_list: S.list(S.string()).optional().optional(),
  translation_word_list: S.list(S.string()).optional(),
  translation_word_base_list: S.list(S.string()).optional(),
  image: S.string().optional(),
  sound: S.string().optional()
}).additionalProperties(true)

async function main() {
  const src = `../../submodules/immersion-kit-api/resources`

  const files = await glob('**/data.json', {
    cwd: src
  })

  const cache: {
    [vocab: string]: {
      id: string
      sentence: string
      translation?: string | undefined
    }[]
  } = {}

  files.map((p) => {
    // console.log(`[${i + 1}/${files.length}] ${p}`)

    const ds = S.list(sDataJSON).ensure(
      yaml.load(fs.readFileSync(`${src}/${p}`, 'utf-8')) as any
    )

    ds.map(({ id, sentence, translation }) => {
      for (const m of sentence.matchAll(/[Ａ-Ｚａ-ｚ]{2,}/g)) {
        const v = m[0]!
        const ls = cache[v] || []
        ls.push({
          id,
          sentence,
          translation
        })
        cache[v] = ls
      }
    })
  })

  console.log(
    Object.entries(cache)
      .sort(([, it1], [, it2]) => it2.length - it1.length)
      .flatMap(([v, items]) => [
        `- ${v}`,
        ...items.flatMap(({ id, sentence, translation }) => {
          return [
            `  - id: ${'`'}${id}${'`'}`,
            `    - ${'`'}${sentence}${'`'}`,
            ...(translation ? [`    - ${'`'}${translation}${'`'}`] : [])
          ]
        })
      ])
      .join('\n')
  )
}

if (require.main === module) {
  main().catch(console.error)
}
