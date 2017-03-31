import React from 'react';
import {Form, Button, Popup} from 'semantic-ui-react';
import _ from 'lodash';

import './HostEditor.css';

const HostEditor = React.createClass({
  render() {
    const {
      disabled,
      host,
      handleRemove,
      handleLaunch,
      handleUpdate,
    } = this.props;

    return (
      <div className='HostEditor'>
        <Form>
          <Form.Field
            label='*Name'
            name='name'
            placeholder='host-name'
            value={host.name || ''}
            control='input'
            readOnly={disabled}
            onChange={(e) => handleUpdate('set', 'name', e.target.value)}
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='*App Host'
                name='appHost'
                placeholder='https://scenarios.stoplight.io'
                value={host.appHost || ''}
                control='input'
                readOnly={disabled}
                onChange={(e) => handleUpdate('set', 'appHost', e.target.value)}
              />
            }
            content='The URL to the Stoplight server instance you would like to connect to.'
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='*API Host'
                name='apiHost'
                placeholder='https://api-next.stoplight.io'
                value={host.apiHost || ''}
                control='input'
                readOnly={disabled}
                onChange={(e) => handleUpdate('set', 'apiHost', e.target.value)}
              />
            }
            content='The URL to the Stoplight API instance you would like to connect to.'
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='Proxy Url'
                name='proxy.url'
                placeholder={window.Electron.env.HTTPS_PROXY || window.Electron.env.https_proxy || window.Electron.env.HTTP_PROXY || window.Electron.env.http_proxy || 'optional, i.e. `http://127.0.0.1:2819`'}
                value={_.get(host, ['proxy', 'url'], '')}
                control='input'
                onChange={(e) => handleUpdate('set', 'proxy.url', e.target.value)}
                size='tiny'
              />
            }
            content='If traffic from the Stoplight desktop app should be routed through a local proxy, specify the host here. Will default to HTTPS_PROXY or HTTP_PROXY environment variable.'
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='Proxy Bypass'
                name='proxy.bypass'
                placeholder={window.Electron.env.NO_PROXY || window.Electron.env.no_proxy || 'optional, i.e. `<local>,*.example.com`'}
                value={_.get(host, ['proxy', 'bypass'], '')}
                control='input'
                onChange={(e) => handleUpdate('set', 'proxy.bypass', e.target.value)}
                size='tiny'
              />
            }
            content='Only applicable when Proxy Url is used. If some traffic should not pass through the proxy, specify it here. Will default to NO_PROXY environment variable.'
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='Proxy Basic Auth User'
                name='proxy.user'
                placeholder={window.Electron.env.HTTPS_PROXY_USER || window.Electron.env.https_proxy_user || window.Electron.env.HTTP_PROXY_USER || window.Electron.env.http_proxy_user || ''}
                value={_.get(host, ['proxy', 'user'], '')}
                control='input'
                onChange={(e) => handleUpdate('set', 'proxy.user', e.target.value)}
                size='tiny'
              />
            }
            content='If your proxy requires basic authentication, specify the username here. Will default to HTTPS_PROXY_USER or HTTP_PROXY_USER environment variable.'
          />

          <Popup
            position='bottom right'
            size='tiny'
            wide
            trigger={
              <Form.Field
                label='Proxy Basic Auth Pass'
                name='proxy.pass'
                type='password'
                placeholder={window.Electron.env.HTTPS_PROXY_PASS || window.Electron.env.https_proxy_pass || window.Electron.env.HTTP_PROXY_PASS || window.Electron.env.http_proxy_password || ''}
                value={_.get(host, ['proxy', 'pass'], '')}
                control='input'
                onChange={(e) => handleUpdate('set', 'proxy.pass', e.target.value)}
                size='tiny'
              />
            }
            content='If your proxy requires basic authentication, specify the password here. Will default to HTTPS_PROXY_PASS or HTTP_PROXY_PASS environment variable.'
          />

          <div className='pt-1'>
            <Button
              primary
              content='Relaunch With This Host'
              onClick={handleLaunch}
            />

            <Button
              icon='remove'
              content='Remove'
              floated='right'
              basic
              negative
              disabled={disabled}
              onClick={handleRemove}
            />
          </div>
        </Form>
      </div>
    );
  },
});

export default HostEditor;
