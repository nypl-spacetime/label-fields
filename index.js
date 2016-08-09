const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const H = require('highland')
const R = require('ramda')
const csvWriter = require('csv-write-stream')

const PORT = process.env.PORT || 3131
const TASKS_DIR = `${__dirname}/tasks`
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost/crf-classify'

const db = require('./lib/db')(DATABASE_URL)

app.use(bodyParser.json())
app.use(express.static('public'))

app.get('/tasks', (req, res) => {
  const tasks = fs.readdirSync(TASKS_DIR)
    .filter((file) => fs.statSync(path.join(TASKS_DIR, file)).isDirectory())
  res.send(tasks)
})

function linesInFile(task, callback) {
  var count = 0
  H(fs.createReadStream(`${__dirname}/tasks/${task}/lines.txt`))
    .split()
    .each((line) => {
      count += 1
    })
    .done(() => {
      callback(null, count)
    })
}

app.get('/tasks/:task', (req, res) => {
  let config

  try {
    config = require(`${__dirname}/tasks/${req.params.task}/config.json`)
  } catch (e) {
    res.status(404).send({
      error: 'not found'
    })
    return
  }

  linesInFile(req.params.task, (err, linesTotal) => {
    db.submissionsCountForTask(req.params.task, (err, linesNext) => {
      res.send({
        linesNext,
        linesTotal,
        fields: config.fields
      })
    })
  })
})

app.get('/tasks/:task/lines', (req, res) => {
  fs.createReadStream(`${__dirname}/tasks/${req.params.task}/lines.txt`)
    .pipe(res)
})

app.get('/tasks/:task/input.csv', (req, res) => {
  db.submissionsForTask(req.params.task, (err, results) => {
    var writer = csvWriter()
    writer.pipe(res)

    const rows = results
      .filter((row) => R.any(R.identity, R.values(row.fields)))
      .map((row, i) => Object.assign({
        index: i,
        input: row.input
      }, row.fields))
      .forEach((row) => {
        writer.write(row)
      })

    writer.end()
  })
})

app.get('/tasks/:task/lines/:line', (req, res) => {
  function readSingleLine (task, index, callback) {
    H(fs.createReadStream(`${__dirname}/tasks/${req.params.task}/lines.txt`))
      .split()
      .drop(index)
      .head()
      .toArray((arr) => {
        if (!arr.length) {
          callback()
        } else {
          callback(null, arr[0])
        }
      })
  }

  function sendLine(res, index) {
    return function(err, line) {
      if (err || !line) {
        res.status(404).send({
          error: 'not found'
        })
      } else {
        res.send({
          index: index,
          input: line
        })
      }
    }
  }

  if (req.params.line === 'next') {
    db.submissionsCountForTask(req.params.task, (err, index) => {
      readSingleLine(req.params.task, index, sendLine(res, index))
    })
  } else {
    const index = parseInt(req.params.line)
    readSingleLine(req.params.task, index, sendLine(res, index))
  }

})

app.post('/tasks/:task/lines/:line', (req, res) => {
  const index = parseInt(req.params.line)
  const input = req.body.input
  const fields = R.omit(['input', 'index'], req.body)

  db.writeSubmission(req.params.task, index, input, fields, (err) => {
    if (err) {
      res.send({
        error: err.message
      })
    } else {
      res.send({
        success: true
      })
    }
  })
})

app.listen(PORT, function () {
  console.log(`CRF Classify listening on port ${PORT}!`)
})
