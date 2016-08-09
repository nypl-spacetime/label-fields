const TASK = 'josh-2016-08-08'

var line = {}
var characters = []
var fields = []
linesTotal = 0

var charactersElement = document.getElementById('characters')

function getCharacterIndex(container) {
  return parseInt(container.parentNode.getAttribute('data-character-index'))
}

charactersElement.addEventListener('keydown', (event) => {
  if (event.metaKey) {
    return
  }

  if (event.keyCode === 13) {
    submit(characters)
    event.preventDefault()
  } else if (event.keyCode >= 37 && event.keyCode <= 40) {
  } else if (event.keyCode >= 48 && event.keyCode <= 57) {
    var selection = window.getSelection()
    if (selection) {
      var field = event.keyCode - 48
      var range = selection.getRangeAt(0)

      var startIndex = getCharacterIndex(range.startContainer)
      var endIndex = getCharacterIndex(range.endContainer)

      characters.forEach((c, i) => {
        if (i >= startIndex && i <= endIndex) {
          c.field = field
        } else if (c.field === field) {
          c.field = 0
        }
      })

      updateCharacters(characters)
    }
    event.preventDefault()
  } else {
    event.preventDefault()
  }
})

function updateProgress(linesNext, linesTotal) {
  d3.select('#progress').html(`Task: <a href="tasks/${TASK}/lines" target="_blank">${TASK}<a> (${linesNext}/${linesTotal})`)
}

d3.json(`tasks/${TASK}`, (task) => {
  fields = task.fields

  linesTotal = task.linesTotal
  updateProgress(task.linesNext, task.linesTotal)
  d3.select('#fields').selectAll('li')
      .data(fields).enter()
    .append('li')
      .attr('class', (d, i) => `field-${i + 1}`)
      .html((d) => d)
})

function updateCharacters(characters) {
  var input = characters.map((c) => c.character).join('')
  var spans = d3.select('#characters').selectAll('span')
    .data(characters, (d, i) => `${input}-${i}`)

  spans.enter()
    .append('span')
    .merge(spans)
      .attr('data-character-index', (d, i) => i)
      .attr('class', (d) => {
        if (d.field === 0) {
          return
        } else {
          return `field-${d.field}`
        }
      })
      .html((d) => d.character)

  spans.exit().remove()
}

function loadLine() {
  // TODO: clear selection!

  d3.json(`tasks/${TASK}/lines/next`, (nextLine) => {
    if (!nextLine) {
      return
    }

    line = nextLine

    updateProgress(line.index, linesTotal)

    characters = line.input.split('')
      .map((c) => ({
        character: c,
        field: 0
      }))

    updateCharacters(characters)
  })
}

function submit(characters) {
  var data = {}
  fields.forEach((field) => {
    data[field] = null
  })

  characters.forEach((c) => {
    if (c.field) {
      var field = fields[c.field - 1]

      if (!data[field]) {
        data[field] = ''
      }

      data[field] = data[field] + c.character
    }
  })

  d3.request(`tasks/${TASK}/lines/${line.index}`)
    .header('Content-Type', 'application/json')
    .post(JSON.stringify(Object.assign({}, line, data)), (err, response) => {
      loadLine()
    })
}

loadLine()
charactersElement.focus()
