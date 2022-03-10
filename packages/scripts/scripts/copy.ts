import fs from 'fs'

import glob from 'fast-glob'
import yaml from 'js-yaml'
import S from 'jsonschema-definer'

const sDataJSON = S.shape({
  sentence: S.string(),
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
  const dst = `../../my-edit`

  const reClean = /(^[\p{Z}]+|[\p{Z}]+$|[\u{202a}\u{202c}]+)/gu
  const reExclude = /^[\p{Z}\p{P}\u{202a}\u{202c}]*$/u

  glob
    .sync('**/data.json', {
      cwd: src
    })
    .map((p) => {
      fs.rmdir(`${dst}/${p}`, () => {})
      try {
        fs.mkdirSync(`${dst}/${p.replace(/\/data\.json$/, '')}`, {
          recursive: true
        })
      } catch (e) {}
      if (true) {
        const ds = S.list(sDataJSON).ensure(
          yaml.load(fs.readFileSync(`${src}/${p}`, 'utf-8')) as any
        )

        const out = ds
          .filter((d) => d.sound)
          .map(
            ({
              sentence_with_furigana,
              word_base_list,
              word_dictionary_list,
              translation_word_list,
              translation_word_base_list,
              image,
              ...d
            }) => {
              d.sentence = d.sentence.replace(reClean, '')
              d.word_list = (d.word_list || []).filter(
                (r) => !reExclude.test(r)
              )
              return d
            }
          )

        if (out.length) {
          fs.writeFileSync(
            `${dst}/${p.replace(/\.json$/, '.yaml')}`,
            yaml.dump(out, {
              flowLevel: 2
            })
          )
        } else {
          fs.rmdir(`${dst}/${p.replace(/\/data\.json$/, '')}`, () => {})
        }
      }
    })
}

if (require.main === module) {
  main().catch(console.error)
}
