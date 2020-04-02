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

// importScripts('/dist/bundles/elastic-apm-rum.umd.min.js')
console.log(
  'hamid',
  self.performance.getEntriesByType('resource'),
  self.elasticApm,
  self.XMLHttpRequest,
  PerformanceObserver
)
// debugger
// self.elasticApm.init({
//     serviceName: 'service-worker'
// })

const broadcast = new BroadcastChannel('apm-channel')
broadcast.postMessage({ payload: 'hamid' })

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) {
        // resp.headers.set('Server-Timing', 'serviceWorkerCache')
        // resp.headers.append('Server-Timing', 'serviceWorkerCache')
        // console.log(resp, resp.headers.get('Server-Timing'))
        return new Response(resp.body, {
          headers: { 'Server-Timing': 'serviceWorkerCache' }
        })
      }
      return fetch(event.request).then(response => {
        return caches.open('v2').then(cache => {
          if (event.request.method !== 'POST') {
            cache.put(event.request, response.clone())
          }
          return response
        })
      })
    })
  )
})
