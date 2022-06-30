import { StyleSheet, TouchableOpacity } from 'react-native';

import { Text, View } from 'native-base';
import { RootStackScreenProps } from '../types';

export default function NotFoundScreen ({ navigation }: RootStackScreenProps<'NotFound'>) {
  return (
    <View style={styles.container}>
      <Text>This screen doesn't exist.</Text>
      <TouchableOpacity onPress={() => navigation.replace('Root')}>
        <Text>Go to home screen!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  }
});
