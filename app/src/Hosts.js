import React from 'react';
import {Accordion, Button, Segment, Message} from 'semantic-ui-react';
import _ from 'lodash';

import HostEditor from './HostEditor';

const config = window.Electron.config;

const App = React.createClass({
  getInitialState() {
    return {
      activeHost: config.store.activeHost || 0,
      hosts: config.store.hosts,
    }
  },

  handleAddHost() {
    const {hosts = []} = this.state;

    const name = `new-host-${new Date().getTime()}`;
    hosts.push({
      name,
      appHost: '',
      apiHost: '',
      proxy: {
        url: '',
        bypass: '',
        user: '',
        pass: '',
      },
    });

    const activeHost = hosts.length - 1;

    config.set('activeHost', activeHost);
    config.set('hosts', hosts);
    this.setState({
      activeHost,
      hosts,
    });
  },

  handleRemoveHost(i) {
    const {hosts = []} = this.state;

    _.pullAt(hosts, i);

    config.set('activeHost', 0);
    config.set('hosts', hosts);
    this.setState({
      activeHost: 0,
      hosts,
    });
  },

  handleUpdateHost(i, t, p, v) {
    const {hosts = []} = this.state;
    const host = hosts[i] || {};

    _.set(host, p, v);
    hosts[i] = host;

    config.set('hosts', hosts);
    this.setState({hosts});
  },

  handleLaunch() {
    config.set('activeHost', this.state.activeHost);
    config.set('hosts', this.state.hosts);
    window.Electron.ipc.send('app.relaunch');
  },

  render() {
    const {activeHost = 0, hosts = []} = this.state;

    const error = config.get('hostError');

    return (
      <div className='Hosts'>
        <Segment>
          This hosts config tool makes it easy to modify how (or where) the Stoplight desktop app connects. These settings will
          help you connect through corporate proxies, and to on-premise Stoplight instances.
        </Segment>

        <div className='mb-2 mt-2' style={{textAlign: 'center'}}>
          <Button
            icon='plus'
            content='Add Host'
            primary
            inverted
            onClick={this.handleAddHost}
          />
        </div>

        {error ?
          <Message
            error
            header='Error Connecting to Stoplight'
            content={error}
          />
        : null}

        <Accordion
          panels={hosts.map((h, i) => ({
            key: String(i),
            title: h.name,
            content: (
              <HostEditor
                host={h}
                disabled={i === 0 && window.Electron.env.NODE_ENV !== 'development'}
                handleLaunch={this.handleLaunch}
                handleRemove={() => {
                  this.handleRemoveHost(i);
                }}
                handleUpdate={(t, p, v) => {
                  this.handleUpdateHost(i, t, p, v);
                }}
              />
            ),
          }))}
          activeIndex={activeHost}
          fluid
          styled
          onTitleClick={(e, index) => {
            this.setState({activeHost: index});
          }}
        />
      </div>
    );
  },
});

export default App;
