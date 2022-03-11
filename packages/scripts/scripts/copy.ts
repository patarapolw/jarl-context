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

  const reClean = /(^[\p{Z}]+|[\p{Z}]+$)/gu
  const reWordClean = /[\u{202a}\u{202c}]+/gu
  const reExclude = /^[\p{Z}\p{P}]*$/u

  glob
    .sync('**/data.json', {
      cwd: src
    })
    .map((p) => {
      const folder = p.replace(/\/data\.json$/, '')

      try {
        fs.mkdirSync(`${dst}/${folder}`, {
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
              translation_word_list = [],
              translation_word_base_list = [],
              image,
              ...d
            }) => {
              sentence = sentence.replace(reClean, '').replace(reWordClean, '')
              if (!/（.+）/.test(sentence)) return null

              let words: any[] | undefined
              if (word_list) {
                let position = 0
                words = word_list
                  .map((word, i) => {
                    word = word.replace(reWordClean, '')
                    if (reExclude.test(word)) return null

                    let base: string | undefined
                    let dictionary: string | undefined
                    let translation: string | undefined
                    let translation_base: string | undefined

                    if (word_base_list[i] !== word) {
                      base = word_base_list[i]
                    }
                    if (word_dictionary_list[i] !== word) {
                      dictionary = word_dictionary_list[i]
                    }
                    // if (translation_word_list[i]) {
                    //   translation = translation_word_list[i]
                    // }
                    // if (
                    //   translation_word_base_list[i] &&
                    //   (translation
                    //     ? translation_word_base_list[i] !== translation
                    //     : true)
                    // ) {
                    //   translation_base = translation_word_base_list[i]
                    // }

                    const pos = sentence.indexOf(word, position)
                    if (pos !== -1) {
                      position = pos + word.length
                      return {
                        word,
                        base,
                        dictionary,
                        translation,
                        translation_base,
                        position: pos
                      }
                    }
                    return {
                      word,
                      base,
                      dictionary,
                      translation,
                      translation_base,
                      position: null
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
          .filter((s) => s)

        const filename = `override.gen.yaml`

        if (out.length) {
          fs.writeFileSync(
            `${dst}/${folder}/${filename}`,
            yaml.dump(out, {
              skipInvalid: true
            })
          )
        } else {
          fs.rm(`${dst}/${folder}/${filename}`, () => {})
        }
      }
    })
}

if (require.main === module) {
  main().catch(console.error)
}
