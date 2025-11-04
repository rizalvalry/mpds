import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function DocumentationsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: 'https://doc.clickup.com/9018025471/d/h/8cr89fz-2498/b3ff2cac7155b92' }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </View>
  );
}


