/**
 * MIT License
 *
 * Copyright (c) 2017-present, Elasticsearch BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import ApmBase from '../../src/apm-base'
import { createServiceFactory } from '@elastic/apm-rum-core'
import bootstrap from '../../src/bootstrap'

var enabled = bootstrap()
const serviceName = 'apm-base-test'

describe('ApmBase', function() {
  var serviceFactory
  beforeEach(function() {
    serviceFactory = createServiceFactory()
  })

  it('should send page load metrics before or after load event', function(done) {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    var trService = serviceFactory.getService('TransactionService')
    var configService = serviceFactory.getService('ConfigService')
    configService.setConfig({
      sendPageLoadTransaction: true
    })

    apmBase._sendPageLoadMetrics()
    var tr = trService.getCurrentTransaction()
    expect(tr.name).toBe('Unknown')
    expect(tr.type).toBe('page-load')
    spyOn(tr, 'detectFinish').and.callThrough()
    window.addEventListener('load', function() {
      setTimeout(() => {
        expect(tr.detectFinish).toHaveBeenCalled()
        apmBase.setInitialPageLoadName('new page load')
        expect(document.readyState).toBe('complete')

        apmBase._sendPageLoadMetrics()
        tr = trService.getCurrentTransaction()
        expect(tr.name).toBe('new page load')
        expect(tr.type).toBe('page-load')
        spyOn(tr, 'detectFinish')
        setTimeout(() => {
          expect(tr.detectFinish).toHaveBeenCalled()
          done()
        })
      })
    })
  })

  it('should be noop when agent is not active', done => {
    const apmBase = new ApmBase(serviceFactory, !enabled)
    const loggingService = serviceFactory.getService('LoggingService')
    spyOn(loggingService, 'info')

    apmBase.init({
      active: false
    })
    /**
     * Start a XHR which shouldn't be captured as transaction
     */
    const req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    req.addEventListener('load', function() {
      setTimeout(() => {
        done()
      })
    })

    req.send()
    const tr = apmBase.getCurrentTransaction()
    expect(tr).toBeUndefined()
    expect(loggingService.info).toHaveBeenCalledWith('RUM agent is inactive')
  })

  it('should provide the public api', function() {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    apmBase.init({ serviceName })
    apmBase.setInitialPageLoadName('test')
    var trService = serviceFactory.getService('TransactionService')
    var configService = serviceFactory.getService('ConfigService')
    var performanceMonitoring = serviceFactory.getService(
      'PerformanceMonitoring'
    )

    expect(configService.get('pageLoadTransactionName')).toBe('test')

    var tr = apmBase.startTransaction('test-transaction', 'test-type')
    expect(tr).toBeDefined()
    expect(tr.name).toBe('test-transaction')
    expect(tr.type).toBe('page-load')

    spyOn(tr, 'startSpan').and.callThrough()
    apmBase.startSpan('test-span', 'test-type')
    expect(tr.startSpan).toHaveBeenCalledWith(
      'test-span',
      'test-type',
      undefined
    )

    expect(apmBase.getCurrentTransaction()).toBe(tr)
    expect(apmBase.getTransactionService()).toBe(trService)

    var filter = function() {}
    apmBase.addFilter(filter)
    expect(configService.filters.length).toBe(1)
    expect(configService.filters[0]).toBe(filter)

    apmBase.config({ testConfig: 'test' })
    expect(configService.config.testConfig).toBe('test')
    performanceMonitoring.cancelPatchSub()
  })

  it('should instrument xhr', function(done) {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    apmBase.init({ serviceName })
    var tr = apmBase.startTransaction('test-transaction', 'test-type')
    expect(tr).toBeDefined()
    var performanceMonitoring = serviceFactory.getService(
      'PerformanceMonitoring'
    )

    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    req.addEventListener('load', function() {
      setTimeout(() => {
        expect(tr.spans.length).toBe(1)
        expect(tr.spans[0].name).toBe('GET /')
        performanceMonitoring.cancelPatchSub()
        done()
      })
    })

    req.send()
  })

  it('should instrument xhr when no transaction was started', function(done) {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    apmBase.init({ capturePageLoad: false, serviceName })
    var performanceMonitoring = serviceFactory.getService(
      'PerformanceMonitoring'
    )
    var transactionService = serviceFactory.getService('TransactionService')
    transactionService.currentTransaction = undefined

    var tr
    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    req.addEventListener('load', function() {
      setTimeout(() => {
        expect(tr.spans.length).toBe(1)
        expect(tr.spans[0].name).toBe('GET /')
        performanceMonitoring.cancelPatchSub()
        done()
      })
    })
    req.send()
    tr = apmBase.getCurrentTransaction()
    expect(tr).toBeDefined()
    expect(tr.name).toBe('Unknown')
  })

  it('should patch xhr when not active', function(done) {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    apmBase.init({ active: false })
    const loggingService = serviceFactory.getService('LoggingService')
    spyOn(loggingService, 'info').and.callFake(msg => {
      expect(msg).toEqual('RUM agent is inactive')
    })

    var req = new window.XMLHttpRequest()
    req.open('GET', '/', true)
    req.addEventListener('load', function() {
      setTimeout(() => {
        /**
         * We patch and register symbols on the native XHR with
         * our own APM symbol keys
         */
        expect(Object.keys(req).length).toBeGreaterThanOrEqual(5)
        done()
      })
    })
    req.send()
    const tr = apmBase.getCurrentTransaction()
    expect(tr).toBeUndefined()
  })

  it('should log errors when config is invalid', () => {
    const apmBase = new ApmBase(serviceFactory, !enabled)
    const loggingService = serviceFactory.getService('LoggingService')
    const logErrorSpy = spyOn(loggingService, 'error')
    apmBase.init({
      serverUrl: undefined,
      serviceName: ''
    })
    expect(loggingService.error).toHaveBeenCalledWith(
      `RUM Agent isn't correctly configured: Missing config - serverUrl, serviceName`
    )
    const configService = serviceFactory.getService('ConfigService')
    expect(configService.get('active')).toEqual(false)

    logErrorSpy.calls.reset()
    apmBase.config({
      serverUrl: '',
      serviceName: 'abc.def'
    })
    expect(loggingService.error).toHaveBeenCalledWith(
      `RUM Agent isn't correctly configured: Missing config - serverUrl, serviceName "abc.def" contains invalid characters! (allowed: a-z, A-Z, 0-9, _, -, <space>)`
    )

    logErrorSpy.calls.reset()
    apmBase.config({
      serviceName: 'abc.def'
    })
    expect(loggingService.error).toHaveBeenCalledWith(
      `RUM Agent isn't correctly configured: serviceName "abc.def" contains invalid characters! (allowed: a-z, A-Z, 0-9, _, -, <space>)`
    )
  })

  it('should instrument sync xhr', function(done) {
    var apmBase = new ApmBase(serviceFactory, !enabled)
    apmBase.init({ serviceName })
    var tr = apmBase.startTransaction('test-transaction', 'test-type')
    var performanceMonitoring = serviceFactory.getService(
      'PerformanceMonitoring'
    )

    expect(tr).toBeDefined()

    var req = new window.XMLHttpRequest()
    req.open('GET', '/', false)
    req.addEventListener('load', function() {
      done()
    })

    req.send()

    expect(tr.spans.length).toBe(1)
    expect(tr.spans[0].name).toBe('GET /')
    performanceMonitoring.cancelPatchSub()
  })
})
