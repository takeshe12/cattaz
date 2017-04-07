import React from 'react';
import NavLink from 'react-router-dom/NavLink';

import AppEnabledWikiEditorAce from './AppEnabledWikiEditorAce';
import docs from './docs';
import logo from '../docs/assets/cattz-10-character.png';

export default class Page extends React.Component {
  constructor() {
    super();
    this.state = {};
  }
  componentDidMount() {
    if (this.props.doc) {
      this.loadDoc(this.props.match.params.page);
    }
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.doc && nextProps.match.params.page !== this.props.match.params.page) {
      this.loadDoc(nextProps.match.params.page);
    }
  }
  loadDoc(pageName) {
    const mdFileName = docs[pageName];
    if (!mdFileName) {
      this.setState({ docText: `There is no document named '${pageName}'` });
      return;
    }
    this.setState({ docText: null });
    window.fetch(mdFileName)
    .then(res => res.text())
    .then((text) => {
      this.setState({ docText: text });
    });
  }
  render() {
    const pageName = this.props.match.params.page;
    const roomName = this.props.doc ? null : pageName;
    let defaultValue = this.props.doc ? `loading ${pageName}...` : `syncing with ${pageName}...`;
    const docText = this.state.docText;
    if (docText) {
      defaultValue = docText;
    }
    return (<div>
      <div style={{ height: 33 + 4 }}>
        <NavLink to="/"><img src={logo} alt="cattaz" width="100" height="33" /></NavLink>
        <span style={{ margin: '0 0.5em', verticalAlign: 'top', fontSize: '24px' }}>{pageName}</span>
      </div>
      <AppEnabledWikiEditorAce key={docText ? `doc/${pageName}` : pageName} roomName={roomName} defaultValue={defaultValue} heightMargin={33 + 4} />
    </div>);
  }
}

Page.propTypes = {
  match: React.PropTypes.shape({
    params: React.PropTypes.shape({
      page: React.PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  doc: React.PropTypes.bool,
};
Page.defaultProps = {
  doc: false,
};