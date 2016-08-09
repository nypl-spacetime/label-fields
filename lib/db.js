var pg = require('pg')

module.exports = function (databaseUrl) {
  function executeQuery (query, params, callback) {
    pg.connect(databaseUrl, (err, client, done) => {
      var handleError = (err) => {
        if (!err) {
          return false
        }

        if (client) {
          done(client)
        }

        callback(err)
        return true
      }

      if (handleError(err)) {
        return
      }

      client.query(query, params, (err, results) => {
        if (handleError(err)) {
          return
        }
        done()
        callback(null, results.rows)
      })
    })
  }

  function submissionsForTask (task, callback) {
    const query = `
      SELECT *
      FROM submissions
      WHERE task = $1;`

    executeQuery(query, [task], callback)
  }

  function submissionsCountForTask (task, callback) {
    const query = `
      SELECT COUNT(*) AS count
      FROM submissions
      WHERE task = $1;`

    executeQuery(query, [task], (err, results) => {
      if (err) {
        callback(err)
        return
      }

      callback(null, parseInt(results[0].count))
    })
  }

  function writeSubmission (task, index, input, fields, callback) {
    const query = `
      INSERT INTO submissions (task, index, input, fields)
        VALUES ($1, $2, $3, $4)
      ON CONFLICT (task, index)
      DO UPDATE SET
        input = EXCLUDED.input,
        fields = EXCLUDED.fields;`

    executeQuery(query, [task, index, input, fields], callback)
  }

  return {
    executeQuery,
    submissionsForTask,
    submissionsCountForTask,
    writeSubmission
  }
}
