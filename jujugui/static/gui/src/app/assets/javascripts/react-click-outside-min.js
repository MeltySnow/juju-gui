"use strict";function enhanceWithClickOutside(a){var b=a.displayName||a.name;return React.createClass({displayName:"Wrapped"+b,wrappedComponent:a,componentDidMount:function(){this.__wrappedComponent=this.refs.wrappedComponent,document.addEventListener("click",this.handleClickOutside,!0),document.addEventListener("keydown",this.handleKeyDown)},componentWillUnmount:function(){document.removeEventListener("click",this.handleClickOutside,!0),document.removeEventListener("keydown",this.handleKeyDown)},handleKeyDown:function(b){if(b=b||window.event,27===b.keyCode){ReactDOM.findDOMNode(this)&&"function"==typeof this.refs.wrappedComponent.handleClickOutside&&this.refs.wrappedComponent.handleClickOutside(b)}},handleClickOutside:function(b){var c=ReactDOM.findDOMNode(this);c&&c.contains(b.target)||"function"!=typeof this.refs.wrappedComponent.handleClickOutside||this.refs.wrappedComponent.handleClickOutside(b)},render:function(){return React.createElement(a,_extends({},this.props,{ref:"wrappedComponent"}))}})}var _extends=Object.assign||function(a){for(var b=1;b<arguments.length;b++){var c=arguments[b];for(var d in c)Object.prototype.hasOwnProperty.call(c,d)&&(a[d]=c[d])}return a};