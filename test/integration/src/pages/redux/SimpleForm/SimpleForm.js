import React from 'react';
import Page from 'soya/lib/page/Page';
import RenderResult from 'soya/lib/page/RenderResult';
import ReactRenderer from 'soya/lib/page/react/ReactRenderer';
import register from 'soya/lib/client/Register';
import ReduxStore from 'soya/lib/data/redux/ReduxStore';
import { DevTools, DebugPanel, LogMonitor } from 'redux-devtools/lib/react';
import smokesignals from 'soya/lib/event/smokesignals';

import FormSegment from 'soya/lib/data/redux/form/FormSegment';

// TODO: Figure out how to do promise polyfill.
import style from '../../../shared/sitewide.css';

class Component extends React.Component {
  componentWillMount() {
    this.setState({value: ''});
    this._formActions = this.props.reduxStore.register(FormSegment);
  }

  handleChange(event) {
    this.setState({value: event.target.value});
  }

  render() {
    return <div>
      <h1>Simple Form</h1>
      <input type="text" value={this.state.value} onChange={this.handleChange.bind(this)} />
      <DebugPanel top right bottom>
        <DevTools store={this.props.reduxStore._store} monitor={LogMonitor} />
      </DebugPanel>
    </div>
  }
}

class SimpleForm extends Page {
  static get pageName() {
    return 'SimpleForm';
  }

  createStore(initialState) {
    var reduxStore = new ReduxStore(Promise, initialState, this.config, this.cookieJar);
    return reduxStore;
  }

  render(httpRequest, routeArgs, store, callback) {
    var reactRenderer = new ReactRenderer();
    reactRenderer.head = '<title>Simple Form Test</title>';
    reactRenderer.body = React.createElement(Component, {
      reduxStore: store,
      config: this.config
    });
    var renderResult = new RenderResult(reactRenderer);
    callback(renderResult);
  }
}

register(SimpleForm);
export default SimpleForm;