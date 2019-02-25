import React from 'react'
import ReactDOM from 'react-dom'
import 'whatwg-fetch'
import { BrowserRouter as Router, Route, Link } from 'react-router-dom'
import { withRouter } from 'react-router'
import MainComponent from './main-component.jsx'

import { apm } from './rum'

var tr = apm.startTransaction('App Load', 'page-load')
tr.isHardNavigation = true


class App extends React.Component {
  render() {
    return (
      <div>

        <div>
          <ul>
            <li>
              <Link to='/'>Home</Link>
            </li>
            <li>
              <Link to='/about'>About</Link>
            </li>
            <li>
              <Link to='/topics'>Topics</Link>
            </li>
            <li>
              <Link to='/topic/10'>Topic 10</Link>
            </li>
          </ul>

          <hr />
          <Route exact path='/' component={MainComponent} />
          <Route path='/about' component={MainComponent} />
          <Route path='/topics' component={MainComponent} />
          <Route path='/topic/:id' component={MainComponent} />
        </div>
        <div id='test-element'>Passed</div>
      </div>
    )
  }
}

App = withRouter(App)

function render() {
  ReactDOM.render(
    (
      <Router basename='/test/e2e/react/'>
        <App />
      </Router>
    ),
    document.getElementById('app')
  )
}
var span = tr.startSpan('Render', 'app')
render()
span.end()

tr.detectFinish()
