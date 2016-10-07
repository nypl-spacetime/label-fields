var API_URL = 'http://brick-by-brick.herokuapp.com/'
var TASK = 'label-fields'

var colors = d3.schemePastel1

var item = {}
var characters = []

var charactersElement = document.getElementById('characters')

function getCharacterIndex(container) {
  return parseInt(container.parentNode.getAttribute('data-character-index'))
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    var error = new Error(response.statusText)
    error.response = response
    error.status = response.status
    throw error
  }
}

function parseJSON(response) {
  return response.json()
}

function postJSON(url, data, callback) {
  fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(checkStatus)
    .then(parseJSON)
    .then(function(data) {
      callback(null, data)
    }).catch(callback)
}

function getJSON(url, callback) {
  fetch(url, {
    credentials: 'include'
  })
    .then(checkStatus)
    .then(parseJSON)
    .then(function(data) {
      callback(null, data)
    }).catch(callback)
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

      if (field <= item.collection.data.fields.length) {
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
    }
    event.preventDefault()
  } else {
    event.preventDefault()
  }
})

function setError(err) {
  var message

  if (err) {
    if (err.status === 404) {
      message = 'Done! Finished! Nothing to do!'
    } else {
      message = err.message
    }
  } else {
    message = 'Error getting task from server'
  }

  d3.select('#error').append('span').html(message)
}

function updateProgress(linesNext, linesTotal) {
  d3.select('#progress').html(`Task: <a href="tasks/${TASK}/lines" target="_blank">${TASK}<a> (${linesNext}/${linesTotal})`)
  d3.select('#input-csv').html(`Download <a href="tasks/${TASK}/input.csv" target="_blank">input.csv</a>`)
}

function updateFields(fields) {
  var li = d3.select('#fields').selectAll('li')
      .data(fields, function(d, i) {
        return `${i}:${d}`
      })

  li.enter().append('li')
      .attr('class', (d, i) => `field-${i + 1}`)
      .style('background-color', (d, i) => colors[i])
      .html((d) => d)

  li.exit().remove()
}

function updateMetadata(item) {

}

function updateCharacters(characters) {
  var input = characters.map((c) => c.character).join('')
  var spans = d3.select('#characters').selectAll('span')
    .data(characters, (d, i) => `${input}-${i}`)

  spans.enter()
    .append('span')
    .merge(spans)
      .attr('data-character-index', (d, i) => i)
      .style('background-color', (d) => {
        if (d.field === 0) {
          return
        } else {

          return colors[d.field - 1]
        }
      })
      .html((d) => d.character)

  spans.exit().remove()
}

function loadItem() {
  // TODO: clear selection!

  const url = `${API_URL}tasks/${TASK}/items/random`
  getJSON(url, (err, nextItem) => {
    if (!nextItem || err) {
      setError(err)
      return
    }

    item = nextItem

    var text = item.data.text
    updateFields(item.collection.data.fields)
    updateMetadata(item)

    // updateProgress(line.index, linesTotal)

    characters = text.split('')
      .map((c) => ({
        character: c,
        field: 0
      }))

    updateCharacters(characters)
  })
}

function submit(characters) {
  var fields = item.collection.data.fields
  var fieldsData = {}
  var skipped = true

  fields.forEach((field) => {
    fieldsData[field] = null
  })

  characters.forEach((c, index) => {
    if (c.field) {
      skipped = false

      var field = fields[c.field - 1]

      if (!fieldsData[field]) {
        fieldsData[field] = {
          text: '',
          from: index,
          to: index
        }
      }

      fieldsData[field].text = fieldsData[field].text + c.character
      fieldsData[field].to = index
    }
  })

  var url = `${API_URL}items/${item.provider}/${item.id}`

  var body = {
    task: TASK
  }

  if (skipped) {
    body.skipped = true
  } else {
    body.data = fieldsData
  }

  postJSON(url, body, (err, results) => {
    if (err) {
      setError(err)
    } else {
      loadItem()
    }
  })
}

loadItem()
charactersElement.focus()
