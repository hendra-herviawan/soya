import React from 'react';
import Page from 'soya/lib/page/Page';
import RenderResult from 'soya/lib/page/RenderResult';
import register from 'soya/lib/client/Register';
import ReactRenderer from 'soya/lib/page/react/ReactRenderer.js';

import style from '../../../shared/sitewide.css';

class Component extends React.Component {
  render() {
    return <div>
      <h1>Integration Tests</h1>
      <p>Significant effort should be made to make these integration tests automate-able.</p>
      <h2>Compilation</h2>
      <p>Web assets compilation and page generation. Enables user to code in terms of distinct components, without worrying about dependencies and performance optimizations.</p>
      <ul>
        <li><a href={this.props.router.reverseRoute('LOAD_COMPONENT')}>Load Component</a></li>
      </ul>
      <h2>Redux</h2>
      <p>Integration with Redux alongside data-fetching capabilities. Enables the <code>&lt;Context/&gt;</code> part of user interface components.</p>
      <ul>
        <li><a href={this.props.router.reverseRoute('HYDRATION')}>Hydration Test</a> (~3 seconds)</li>
        <li><a href={this.props.router.reverseRoute('RUNTIME_COMPONENT')}>Runtime Components</a></li>
        <li><a href={this.props.router.reverseRoute('SERVER_SEGMENT_DEPENDENCIES')}>Segment Dependencies (Server-Side)</a> (~5 seconds).</li>
        <li><a href={this.props.router.reverseRoute('CLIENT_SEGMENT_DEPENDENCIES')}>Segment Dependencies (Client-Side)</a>.</li>
        <li><a href={this.props.router.reverseRoute('CLIENT_INSTANT_SEGMENT_DEPENDENCIES')}>Segment Dependencies (Client-Side, Instant Load)</a></li>
      </ul>
    </div>;
  }
}

class TestList extends Page {
  static get pageName() {
    return 'TestList';
  }

  static getRouteRequirements() {
    return [
      'HYDRATION',
      'RUNTIME_COMPONENT',
      'SERVER_SEGMENT_DEPENDENCIES',
      'CLIENT_SEGMENT_DEPENDENCIES',
      'CLIENT_INSTANT_SEGMENT_DEPENDENCIES',
      'LOAD_COMPONENT'
    ];
  }

  render(httpRequest, routeArgs, store, callback) {
    var reactRenderer = new ReactRenderer();
    reactRenderer.head = '<title>Integration Tests</title>';
    reactRenderer.body = React.createElement(Component, {
      config: this.config,
      router: this.router
    });
    var renderResult = new RenderResult(reactRenderer);
    callback(renderResult);
  }
}

register(TestList);
export default TestList;