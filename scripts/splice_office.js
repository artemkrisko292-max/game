// Заменяет офисный набор мебели в render.ts на домашний кабинет.
// Ищет блок "  office: [" до закрывающего "\n  ],\n}" и подставляет
// содержимое scripts/office_furniture.txt.
const fs = require('fs')

const path = '/home/z/my-project/src/lib/game/render.ts'
const src = fs.readFileSync(path, 'utf8')
const repl = fs.readFileSync('/home/z/my-project/scripts/office_furniture.txt', 'utf8').replace(/\n$/, '')

const startMarker = '  office: ['
const start = src.indexOf(startMarker)
if (start === -1) throw new Error('office: [ не найден')
const endMarker = '\n  ],\n}'
const end = src.indexOf(endMarker, start)
if (end === -1) throw new Error('конец блока office не найден')

const out = src.slice(0, start) + repl + src.slice(end + endMarker.length)
fs.writeFileSync(path, out)
console.log('OK: заменено с', start, 'по', end, '| новый размер:', out.length)
