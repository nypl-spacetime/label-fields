---
---
var API_URL = '{{ site.api-url }}'
var TASK_ID = 'label-fields'

var colors = d3.schemePastel1

var elements = {
  error: document.getElementById('error'),
  oauth: document.getElementById('oauth')
}

var brickByBrick = BrickByBrick(API_URL, TASK_ID, null, elements)

var item = {}
var characters = []

var charactersElement = document.getElementById('characters')

function getCharacterIndex(container) {
  return parseInt(container.parentNode.getAttribute('data-character-index'))
}

document.getElementById('form').addEventListener('submit', function (event) {
  event.preventDefault()
  submit(characters)
})

// document.addEventListener('selectionchange', function (event) {
// })

charactersElement.addEventListener('keydown', function (event) {
  if (event.metaKey) {
    return
  }

  if (event.keyCode === 13) {
    submit(characters)
    event.preventDefault()
  } else if (event.keyCode >= 37 && event.keyCode <= 40) {
  } else if (event.keyCode >= 48 && event.keyCode <= 57) {
    var field = event.keyCode - 48
    updateSelection(field)
    event.preventDefault()
  } else {
    event.preventDefault()
  }
})

function updateSelection(field) {
  var selection = window.getSelection()
  if (selection) {
    if (field <= item.collection.data.fields.length) {
      var range = selection.getRangeAt(0)

      if (range.collapsed) {
        return
      }

      var startIndex = getCharacterIndex(range.startContainer)
      var endIndex = getCharacterIndex(range.endContainer)

      // This is needed for Firefox;
      //   Firebox includes too many elements in selection
      var rangeString = range.toString()
      var selectionLength = endIndex - startIndex + 1
      var lengthDiff = selectionLength - rangeString.length

      if (lengthDiff === 2) {
        startIndex += 1
        endIndex -= 1
      } else if (lengthDiff === 1) {
        if (startIndex === 0) {
          endIndex -= 1
        } else {
          startIndex += 1
        }
      }

      characters.forEach(function (c, i) {
        if (i >= startIndex && i <= endIndex) {
          c.field = field
        } else if (c.field === field) {
          c.field = 0
        }
      })

      updateCharacters(characters)
    }
  }
}

function updateFields(fields) {
  var li = d3.select('#fields').selectAll('li')
      .data(fields, function(d, i) {
        return i + ':' + d
      })

  li.enter().append('li')
      .attr('class', function (d, i) {
         return 'field-' + (i + 1)
      })
      .style('background-color', function (d, i) {
        return colors[i]
      })
      .html(function (d) {
        return d
      })
      // .on('click', function(d, i) {
      //   console.log( window.getSelection())
      //   d3.event.preventDefault()
      //   updateSelection(i + 1)
      // })

  li.exit().remove()
}

function updateCharacters(characters) {
  var input = characters.map(function (c) {
    return c.character
  }).join('')

  var spans = d3.select('#characters').selectAll('span')
    .data(characters, function (d, i) {
      return input + '-' + i
    })

  spans.enter()
    .append('span')
    .merge(spans)
      .attr('data-character-index', function (d, i) {
        return i
      })
      .style('background-color', function (d) {
        if (d.field === 0) {
          return
        } else {

          return colors[d.field - 1]
        }
      })
      .html(function (d) {
        return d.character
      })

  spans.exit().remove()
}

function getItem() {
  brickByBrick.getItem()
    .then(function (nextItem) {
      item = nextItem

      d3.select('article')
        .classed('hidden', false)

      var text = item.data.text
      updateFields(item.collection.data.fields)

      characters = text.split('')
        .map(function (c) {
          return {
            character: c,
            field: 0
          }
        })

      updateCharacters(characters)
    })
    .catch(function (err) {
      console.error(err.message)
    })
}

function submit(characters) {
  if (!item || !item.id) {
    return
  }

  var fields = item.collection.data.fields
  var fieldsData = {}
  var skipped = true

  fields.forEach(function (field) {
    fieldsData[field] = null
  })

  characters.forEach(function (c, index) {
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

  var data

  if (!skipped) {
    data = fieldsData
  }

  brickByBrick.postSubmission(item.organization.id, item.id, data)
    .then(function () {
      getItem()
    })
    .catch(function (err) {
      console.error(err.message)
    })
}

getItem()
charactersElement.focus()
