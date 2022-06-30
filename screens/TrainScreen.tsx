import React, { useState, useEffect, useRef } from 'react';
import { Text, View, VStack, HStack, Box, Button } from 'native-base';
import { RootTabScreenProps } from '../types';
import Camera from '../components/Camera';
import { Camera as ExpoCamera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import _ from 'lodash';
import Loop from '../components/Loop';
import { default as AlphabetRepository } from '../repositories/Alphabet';
import { Alphabet, Word, Character, Frame } from '../types/Alphabet';

type TrainFrame = {
  wordIndex: number,
  charIndex: number,
  loop: Frame
}

export default function TrainScreen ({ navigation }: RootTabScreenProps<'Train'>) {
  const [currentFrame, setCurrentFrame] = useState<TrainFrame>({
    wordIndex: 0,
    charIndex: 0,
    loop: {
      index: 0,
      timestamp: null,
      delta: 300,
      alphabetIndex: 0
    }
  });
  const [alphabet, setAlphabet] = useState<Alphabet>();
  const [recording, setRecording] = useState<boolean>(false);
  const [trainUid, setTrainUid] = useState<string>(`training-${Date.now()}`);
  const camera = useRef<ExpoCamera>(null);
  const loop = useRef<React.ElementRef<typeof Loop>>(null);

  function getCurrentTrainingWord (frame: TrainFrame): Word | undefined {
    return alphabet.training.words[frame.wordIndex];
  }

  function getCurrentTrainingChar (frame: TrainFrame): Character | undefined {
    return alphabet.chars.find((current) => current.label === alphabet.training.words[frame.wordIndex].label[frame.charIndex]?.toLowerCase());
  }

  function isCurrentTraningChar (index: number, frame: TrainFrame): boolean {
    const currentChar = alphabet.chars[index];

    if (currentChar.label === getCurrentTrainingChar(frame)?.label) {
      return true;
    }

    return false;
  }

  function getLogUri (trainUid: string) {
    return `${FileSystem.cacheDirectory}${trainUid}.txt`;
  }

  async function writeFrameLog (uri: string, frame: TrainFrame) {
    let content = '';

    const alphabetChar = alphabet[frame.loop.alphabetIndex];
    const trainWord = getCurrentTrainingWord(frame);
    const trainChar = getCurrentTrainingChar(frame);

    const entry = {
      index: frame.loop.index,
      timestamp: frame.loop.timestamp,
      delta: frame.loop.delta,
      alphabet: {
        id: alphabetChar?.id,
        label: alphabetChar?.label,
        index: frame.loop.alphabetIndex
      },
      train: {
        word: {
          id: trainWord?.id,
          label: trainWord?.label,
          index: frame.wordIndex
        },
        char: {
          id: trainChar?.id,
          label: trainChar?.label,
          index: frame.charIndex
        }
      }
    };

    let file = await FileSystem.getInfoAsync(uri);

    if (file.exists) {
      content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    }

    console.log('write log entry...', entry);

    await FileSystem.writeAsStringAsync(uri, content + "\n" + JSON.stringify(entry), { encoding: FileSystem.EncodingType.UTF8 });
  }

  async function saveToMedia (uri: string) {
    const mediaLibraryPermissions = await MediaLibrary.requestPermissionsAsync();

    if (!mediaLibraryPermissions.granted) {
      return;
    }

    const asset = await MediaLibrary.createAssetAsync(uri);
    const album = await MediaLibrary.createAlbumAsync("Training", asset);
  }

  async function record (recording: boolean) {
    if (recording) {
      setRecording(false);

      camera.current?.stopRecording();
    } else {
      console.log('Start recording....');

      const tmpTrainUid = `training-${Date.now()}`;

      setTrainUid(tmpTrainUid);
      setRecording(true);
      camera.current?.recordAsync({ mute: true }).then(data => {
        console.log('Stopped video....', data);
        saveToMedia(data.uri);

        Sharing.shareAsync(getLogUri(tmpTrainUid), { UTI: 'public.plain-text' }).then(() => {
          console.log('Saved logfile');
        }).catch(error => {
          console.log(error);
        });
      }).catch(e => {
        console.log(e);
      });
    }
  }

  function beforeBackgroundColorChange (index: number, frame: TrainFrame, color: string): string {
    if (index === frame.loop.alphabetIndex) {
      const currentChar = alphabet.chars[frame.loop.alphabetIndex];

      if (currentChar.label === getCurrentTrainingChar(frame)?.label) {
        color = "green.500";
      }
    }

    return color;
  }

  function beforeTextColorChange (index: number, frame: TrainFrame, color: string): string {
    return isCurrentTraningChar(index, frame) ? 'red.400' : color;
  }

  function onFrame (frame: Frame) {
    if (frame.queuePause && frame.queuePause === true) {
      return;
    }

    setCurrentFrame((oldTrainFrame) => {
      const newTrainFrame = {
        ..._.cloneDeep(oldTrainFrame),
        loop: frame
      };

      // increase train char and word
      if (newTrainFrame.loop.alphabetIndex === 0) {
        if ((newTrainFrame.charIndex + 1) < alphabet.training.words[newTrainFrame.wordIndex].label.length) {
          newTrainFrame.charIndex += 1;
        } else {
          newTrainFrame.charIndex = 0;

          if ((newTrainFrame.wordIndex + 1) < alphabet.training.words.length) {
            newTrainFrame.wordIndex += 1;
          } else {
            newTrainFrame.wordIndex = 0;
          }
        }
      }

      return newTrainFrame;
    })
  }

  useEffect(() => {
    setAlphabet(AlphabetRepository.load());
  }, []);

  useEffect(() => {
    if (alphabet) {
      const currentChar = alphabet.chars[currentFrame.loop.alphabetIndex];
      const currentTrainingChar = getCurrentTrainingChar(currentFrame);

      if (currentTrainingChar && currentChar && currentChar.label === currentTrainingChar.label) {
        loop.current.reset();
      }
    }
  }, [currentFrame, alphabet]);

  // useEffect(() => {
  //   if (recording) {
  //     writeFrameLog(getLogUri(trainUid), currentFrame);
  //   }
  // }, [recording, currentFrame, trainUid]);

  if (!alphabet) {
    return <View flex="1"><Text>Loading...</Text></View>
  }

  return (
    <View flex="1">
      {currentFrame && <HStack space="1" justifyContent="center" py="5">
        <Text fontSize="xl">{getCurrentTrainingWord(currentFrame)?.label}</Text>
        <Text fontSize="xl">{`[${getCurrentTrainingChar(currentFrame)?.label}]`}</Text>
      </HStack>}
      <Camera
        ref={camera}
        onBlinkRightStart={() => loop.current.pause()}
        onBlinkRightEnd={() => loop.current.reset()}
      >
        <Loop
          ref={loop}
          alphabet={alphabet}
          speed={300}
          onFrame={onFrame}
          beforeBackgroundColorChange={(index: number, frame: Frame, color: string) => beforeBackgroundColorChange(index, currentFrame, color)}
          beforeTextColorChange={(index: number, frame: Frame, color: string) => beforeTextColorChange(index, currentFrame, color)} />
      </Camera>
      <VStack>
        {/* <Button
          size="lg"
          rounded="none"
          onPress={() => record(recording)}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button> */}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  }
});