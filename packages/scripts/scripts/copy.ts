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
  const outputFilename = 'data.yaml'
  const isFull = true
  console.log(outputFilename, isFull)

  const reClean = /(^[\p{Z}]+|[\p{Z}]+$)/gu
  const reWordClean = /([\u{202a}\u{202c}])/gu
  const reExclude = /^[\p{Z}\p{P}]*$/u

  const files = await glob('**/data.json', {
    cwd: src
  })

  files.map((p, i) => {
    const folder = p.replace(/\/data\.json$/, '')
    console.log(`[${i + 1}/${files.length}] ${folder}`)

    try {
      fs.mkdirSync(`${dst}/${folder}`, {
        recursive: true
      })
    } catch (e) {}
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
          // image,
          ...d
        }) => {
          sentence = sentence.replace(reClean, '').replace(reWordClean, '')

          const bracketed = [
            ...matchAllWithPositionRegex(sentence, /（.+?）/g),
            ...matchAllWithPositionRegex(sentence, /\(.+?\)/g),
            ...matchAllWithPositionRegex(sentence, /&[^;]+;/g)
          ]
          const bracketedWithPosition = bracketed
            .filter((b) => b.position)
            .map((b) => ({
              item: b.item,
              position: b.position!
            }))

          if (!isFull) {
            if (!bracketed.length) return null
          }

          let words: any[] = []
          if (word_list) {
            let position = 0
            words = word_list
              .map((word, i) => {
                word = word.replace(reWordClean, '')
                if (reExclude.test(word)) return null

                let base: string | undefined
                let dictionary: string | undefined
                let tags: string[] | undefined

                if (word_base_list[i] !== word) {
                  base = word_base_list[i]
                }
                if (word_dictionary_list[i] !== word) {
                  dictionary = word_dictionary_list[i]
                }

                const from = sentence.indexOf(word, position)
                if (from !== -1) {
                  position = from + word.length
                  bracketedWithPosition.map((b) => {
                    if (
                      from > b.position.from &&
                      b.position.to > position &&
                      b.item.includes(word)
                    ) {
                      tags = ['silent']
                    }
                  })
                } else {
                  bracketed.map((b) => {
                    if (b.item.includes(word)) {
                      tags = ['silent']
                    }
                  })
                }

                if (!tags) return null

                return {
                  word,
                  base,
                  dictionary,
                  position: from === -1 ? undefined : from,
                  tags
                }
              })
              .filter((s) => s)
          }

          return {
            ...d,
            sentence: sentence.replace(reClean, ''),
            words: words.length ? words : undefined
          }
        }
      )
      .filter((s) => s)

    if (out.length) {
      fs.writeFileSync(
        `${dst}/${folder}/${outputFilename}`,
        yaml.dump(out, {
          skipInvalid: true
        })
      )
    } else {
      fs.rm(`${dst}/${folder}/${outputFilename}`, () => {})
    }
  })
}

function matchAllWithPositionRegex(sentence: string, re: RegExp) {
  let pos1 = 0
  return Array.from(sentence.matchAll(re)).map(([s]) => {
    const item = s!
    const position = sentence.indexOf(item, pos1)
    if (position !== -1) {
      pos1 += position + item.length

      return {
        item,
        position: {
          from: position,
          to: position + item.length
        }
      }
    }
    return {
      item
    }
  })
}

if (require.main === module) {
  main().catch(console.error)
}
