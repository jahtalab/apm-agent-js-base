var initElasticApm = require('../../..').init
// import init as initElasticApm from '../../..'
var createApmBase = require('../e2e')
var elasticApm = createApmBase({
  debug: true,
  serverUrl: 'http://localhost:8200',
  serviceName: 'apm-agent-js-base-test-e2e-general-usecase'
})

elasticApm.setInitialPageLoadName('general-usecase-initial-page-load')

setTimeout(function () {
  throw new Error('timeout test error')
}, 100)

var appEl = document.getElementById('app')
var testEl = document.createElement('h2')
testEl.setAttribute('id', 'test-element')
testEl.innerHTML = 'Passed'
appEl.appendChild(testEl)
