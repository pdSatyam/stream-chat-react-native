'use strict';

import React from 'react';
import {
  AppState,
  Keyboard,
  LayoutAnimation,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { KeyboardContext } from '../../context';

/**
 * View that moves out of the way when the keyboard appears by automatically
 * adjusting its height, position, or bottom padding.
 *
 * Following piece of code has been mostly copied from KeyboardAvoidingView component, with few additional tweaks.
 */
class KeyboardCompatibleView extends React.Component {
  static defaultProps = {
    behavior: Platform.OS === 'ios' ? 'padding' : 'position',
    enabled: true,
    keyboardVerticalOffset: 66.5, // default MessageInput height
  };

  _frame = null;
  _keyboardEvent = null;
  _subscriptions = [];
  viewRef;
  _initialFrameHeight = 0;
  dismissKeyboardResolver = null;
  constructor(props) {
    super(props);
    this.state = { appState: '', bottom: 0, isKeyboardOpen: false };
    this.viewRef = React.createRef();
  }

  _relativeKeyboardHeight(keyboardFrame) {
    const frame = this._frame;
    if (!frame || !keyboardFrame) {
      return 0;
    }

    const keyboardY = keyboardFrame.screenY - this.props.keyboardVerticalOffset;

    // Calculate the displacement needed for the view such that it
    // no longer overlaps with the keyboard
    return Math.max(frame.y + frame.height - keyboardY, 0);
  }

  _onKeyboardChange = (event) => {
    this._keyboardEvent = event;
    this._updateBottomIfNecesarry();
  };

  _onLayout = (event) => {
    this._frame = event.nativeEvent.layout;
    if (!this._initialFrameHeight) {
      // save the initial frame height, before the keyboard is visible
      this._initialFrameHeight = this._frame.height;
    }

    this._updateBottomIfNecesarry();
  };

  _updateBottomIfNecesarry = () => {
    if (this._keyboardEvent == null) {
      this.setState({ bottom: 0 });
      return;
    }

    const { duration, easing, endCoordinates } = this._keyboardEvent;
    const height = this._relativeKeyboardHeight(endCoordinates);

    if (this.state.bottom === height) {
      return;
    }

    if (duration && easing) {
      LayoutAnimation.configureNext({
        // We have to pass the duration equal to minimal accepted duration defined here: RCTLayoutAnimation.m
        duration: duration > 10 ? duration : 10,
        update: {
          duration: duration > 10 ? duration : 10,
          type: LayoutAnimation.Types[easing] || 'keyboard',
        },
      });
    }
    this.setState({ bottom: height });
  };

  _handleAppStateChange = (nextAppState) => {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      this.setKeyboardListeners();
    }

    if (nextAppState.match(/inactive|background/)) {
      this.unsetKeyboardListeners();
    }

    this.setState({ appState: nextAppState });
  };

  setKeyboardListeners = () => {
    if (Platform.OS === 'ios') {
      this._subscriptions = [
        Keyboard.addListener('keyboardWillChangeFrame', this._onKeyboardChange),
      ];
    } else {
      this._subscriptions = [
        Keyboard.addListener('keyboardDidHide', this._onKeyboardChange),
        Keyboard.addListener('keyboardDidShow', this._onKeyboardChange),
      ];
    }

    this._subscriptions.push(
      Keyboard.addListener('keyboardDidHide', () => {
        this.setState({ isKeyboardOpen: false });
      }),
      Keyboard.addListener('keyboardDidShow', () => {
        this.setState({ isKeyboardOpen: true });
      }),
    );
  };

  unsetKeyboardListeners = () => {
    this._subscriptions.forEach((subscription) => {
      subscription.remove();
    });
  };

  dismissKeyboard = () => {
    if (!this.state.isKeyboardOpen) {
      return;
    }

    return new Promise((resolve) => {
      const subscription = Keyboard.addListener('keyboardDidHide', () => {
        resolve();
        subscription.remove();
      });

      Keyboard.dismiss();
    });
  };

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange);
    this.setKeyboardListeners();
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange);
    this.unsetKeyboardListeners();
  }

  render() {
    const {
      behavior,
      children,
      contentContainerStyle,
      enabled,
      keyboardVerticalOffset,
      style,
      ...props
    } = this.props;
    const bottomHeight = enabled ? this.state.bottom : 0;
    switch (behavior) {
      case 'height':
        // eslint-disable-next-line no-case-declarations
        let heightStyle;
        if (this._frame != null && this.state.bottom > 0) {
          // Note that we only apply a height change when there is keyboard present,
          // i.e. this.state.bottom is greater than 0. If we remove that condition,
          // this.frame.height will never go back to its original value.
          // When height changes, we need to disable flex.
          heightStyle = {
            flex: 0,
            height: this._initialFrameHeight - bottomHeight,
          };
        }
        return (
          <KeyboardContext.Provider
            value={{
              dismissKeyboard: this.dismissKeyboard,
            }}
          >
            <View
              onLayout={this._onLayout}
              ref={this.viewRef}
              style={StyleSheet.compose(style, heightStyle)}
              {...props}
            >
              {children}
            </View>
          </KeyboardContext.Provider>
        );

      case 'position':
        return (
          <KeyboardContext.Provider
            value={{
              dismissKeyboard: this.dismissKeyboard,
            }}
          >
            <View
              onLayout={this._onLayout}
              ref={this.viewRef}
              style={style}
              {...props}
            >
              <View
                style={StyleSheet.compose(contentContainerStyle, {
                  bottom: bottomHeight,
                })}
              >
                {children}
              </View>
            </View>
          </KeyboardContext.Provider>
        );

      case 'padding':
        return (
          <KeyboardContext.Provider
            value={{
              dismissKeyboard: this.dismissKeyboard,
            }}
          >
            <View
              onLayout={this._onLayout}
              ref={this.viewRef}
              style={StyleSheet.compose(style, { paddingBottom: bottomHeight })}
              {...props}
            >
              {children}
            </View>
          </KeyboardContext.Provider>
        );

      default:
        return (
          <KeyboardContext.Provider
            value={{
              dismissKeyboard: this.dismissKeyboard,
            }}
          >
            <View
              onLayout={this._onLayout}
              ref={this.viewRef}
              style={style}
              {...props}
            >
              {children}
            </View>
          </KeyboardContext.Provider>
        );
    }
  }
}

export default KeyboardCompatibleView;
