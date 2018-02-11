import React from 'react';
import { Header, Menu, Segment } from 'semantic-ui-react';

import Hosts from './Hosts';
import Help from './Help';

import './App.css';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'hosts',
    };
  }

  handleTabClick = (e, tab) => {
    this.setState({ activeTab: tab.name });
  };

  render() {
    const { activeTab = 'hosts' } = this.state;

    let contentElem;
    switch (activeTab) {
      case 'hosts':
        contentElem = <Hosts />;
        break;
      default:
        contentElem = (
          <Segment>
            <Help />
          </Segment>
        );
    }

    return (
      <div className="App">
        <div className="AppSettings">
          <Header inverted textAlign="center" as="h2">
            Stoplight Desktop Config
          </Header>

          <br />

          <Menu>
            <Menu.Item name="hosts" active={activeTab === 'hosts'} onClick={this.handleTabClick}>
              Hosts
            </Menu.Item>

            <Menu.Item name="help" active={activeTab === 'help'} onClick={this.handleTabClick}>
              Help
            </Menu.Item>
          </Menu>

          {contentElem}
        </div>
      </div>
    );
  }
}

export default App;
