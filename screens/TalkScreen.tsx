import { Heading, Text, View, VStack } from 'native-base';
import { RootTabScreenProps } from '../types';

export default function TalkScreen ({ navigation }: RootTabScreenProps<'Talk'>) {
  return (
    <View justifyContent="center" flex="1">
      <VStack space={1} alignItems="center">
        <Heading size="lg">Todo..</Heading>
        <Text>Screen to loop through letters and watch for blink to capture input.</Text>
      </VStack>
    </View>
  );
}
