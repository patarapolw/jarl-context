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
              sentence,
              sentence_with_furigana,
              word_list,
              word_base_list = [],
              word_dictionary_list = [],
              translation_word_list,
              translation_word_base_list,
              image,
              ...d
            }) => {
              sentence = sentence.replace(reClean, '')

              let words: any[] | undefined
              if (word_list) {
                let postiion = 0
                words = word_list
                  .map((word, i) => {
                    if (reExclude.test(word)) return null

                    let base: string | undefined
                    let dictionary: string | undefined

                    if (word_base_list[i] !== word) {
                      base = word_base_list[i]
                    }
                    if (word_dictionary_list[i] !== word) {
                      dictionary = word_dictionary_list[i]
                    }

                    const pos = sentence.indexOf(word, postiion)
                    if (pos !== -1) {
                      postiion = pos
                      return {
                        word,
                        base,
                        dictionary,
                        postiion
                      }
                    }
                    return {
                      word,
                      base,
                      dictionary
                    }
                  })
                  .filter((s) => s)
              }

              return {
                ...d,
                sentence: sentence.replace(reClean, ''),
                words
              }
            }
          )

        if (out.length) {
          fs.writeFileSync(
            `${dst}/${p.replace(/\.json$/, '.yaml')}`,
            yaml.dump(out, {
              skipInvalid: true
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
