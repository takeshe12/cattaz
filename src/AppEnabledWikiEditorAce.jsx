import React from 'react';
import PropTypes from 'prop-types';
import { diffChars } from 'diff';
import brace from 'brace';
import AceEditor from 'react-ace';
import 'brace/mode/markdown';
import 'brace/theme/tomorrow_night';
import SplitPane from 'react-split-pane';

import Y from 'yjs/dist/y.es6';
import yArray from 'y-array/dist/y-array.es6';
import yWebsocketsClient from 'y-websockets-client/dist/y-websockets-client.es6';
import yMemory from 'y-memory/dist/y-memory.es6';
import yText from 'y-text/dist/y-text.es6';

import verge from 'verge';

import WikiParser from './WikiParser';

Y.extend(yArray, yWebsocketsClient, yMemory, yText);

const aceRequire = brace.acequire;

const resizerMargin = 12;

export default class AppEnabledWikiEditorAce extends React.Component {
  constructor(props) {
    super();
    this.state = { text: props.defaultValue, hast: WikiParser.convertToCustomHast(WikiParser.parseToHast(props.defaultValue)), editorPercentage: 50 };
    this.handleResize = this.updateSize.bind(this);
    this.handleSplitResized = this.handleSplitResized.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleAppEdit = this.handleAppEdit.bind(this);
    this.AceRange = aceRequire('ace/range').Range;
  }
  componentWillMount() {
    this.updateHeight();
    this.updateWidth();
    window.addEventListener('resize', this.handleResize);
  }
  componentDidMount() {
    if (this.props.roomName) {
      Y({
        db: {
          name: 'memory',
        },
        connector: {
          name: 'websockets-client',
          url: `http://${window.location.hostname}:1234`,
          room: this.props.roomName,
        },
        share: {
          textarea: 'Text',
        },
      }).then((y) => {
        this.y = y;
        y.share.textarea.bindAce(this.editor.editor, { aceRequire });
      });
    }
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize, false);
    if (this.y) {
      this.y.share.textarea.unbindAce(this.editor.editor);
    }
  }
  updateHeight() {
    const newHeight = verge.viewportH() - this.props.heightMargin;
    if (newHeight !== this.state.height) {
      this.setState({ height: newHeight });
      if (this.editor) {
        this.editor.editor.resize();
      }
    }
  }
  updateWidth() {
    const vw = verge.viewportW();
    let newWidth = (vw * (this.state.editorPercentage / 100)) - resizerMargin;
    if (newWidth < 0) {
      newWidth = 0;
    }
    const previewWidth = vw - newWidth - (2 * resizerMargin) - 1;
    if (newWidth !== this.state.width) {
      this.setState({ width: newWidth, previewWidth });
      if (this.editor) {
        this.editor.editor.resize();
      }
    }
  }
  updateSize() {
    this.updateWidth();
    this.updateHeight();
  }
  handleSplitResized(newSize) {
    const viewportWidth = verge.viewportW();
    const newPercentage = (100.0 * newSize) / viewportWidth;
    if (newPercentage !== this.state.editorPercentage) {
      this.setState({ editorPercentage: newPercentage });
      this.updateWidth();
    }
  }
  handleEdit(text) {
    const hastOriginal = WikiParser.parseToHast(text);
    const hast = WikiParser.convertToCustomHast(hastOriginal);
    this.setState({ text, hast });
  }
  handleAppEdit(newText, appContext) {
    const session = this.editor.editor.getSession();
    const isOldTextEmpty = appContext.position.start.line === appContext.position.end.line - 1;
    if (!isOldTextEmpty) {
      const lastLine = session.getLine(appContext.position.end.line - 2);
      const range = new this.AceRange(appContext.position.start.line, 0, appContext.position.end.line - 2, lastLine.length);
      const oldText = session.getTextRange(range);
      const changes = diffChars(oldText, newText);
      let cursorY = range.start.row;
      let cursorX = range.start.column;
      const moveCursor = (lines) => {
        if (lines.length >= 2) {
          cursorY += lines.length - 1;
          cursorX = lines[lines.length - 1].length;
        } else {
          cursorX += lines[0].length;
        }
      };
      changes.forEach((c) => {
        const lines = c.value.split('\n');
        if (c.removed) {
          let endY;
          let endX;
          if (lines.length >= 2) {
            endY = cursorY + (lines.length - 1);
            endX = lines[lines.length - 1].length;
          } else {
            endY = cursorY;
            endX = cursorX + lines[0].length;
          }
          const r = new this.AceRange(cursorY, cursorX, endY, endX);
          session.remove(r);
        } else if (c.added) {
          session.insert({ row: cursorY, column: cursorX }, c.value);
          moveCursor(lines);
        } else {
          moveCursor(lines);
        }
      });
    } else {
      const position = { row: appContext.position.end.line - 1, column: 0 };
      session.insert(position, '\n');
      session.insert(position, newText);
    }
  }
  render() {
    return (
      <SplitPane ref={(c) => { this.spliter = c; }} split="vertical" size={this.state.width + resizerMargin} onChange={this.handleSplitResized}>
        <AceEditor ref={(c) => { this.editor = c; }} onChange={this.handleEdit} mode="markdown" theme="tomorrow_night" wrapEnabled value={this.state.text} height={`${this.state.height}px`} width={`${this.state.width}px`} />
        <div style={{ overflow: 'auto', width: this.state.previewWidth, height: this.state.height, paddingLeft: resizerMargin }} className="markdown-body">
          {WikiParser.renderCustomHast(this.state.hast, { onEdit: this.handleAppEdit })}
        </div>
      </SplitPane>
    );
  }
}
AppEnabledWikiEditorAce.propTypes = {
  defaultValue: PropTypes.string,
  roomName: PropTypes.string,
  heightMargin: PropTypes.number,
};
AppEnabledWikiEditorAce.defaultProps = {
  defaultValue: '',
  roomName: null,
  heightMargin: 0,
};
