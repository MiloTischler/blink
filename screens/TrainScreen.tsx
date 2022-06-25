import React, { useState, useEffect, useRef } from 'react';
import { Text, View, VStack, HStack, Box, Button } from 'native-base';
import { RootTabScreenProps } from '../types';
import { Camera, CameraType } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import _ from 'lodash';

type Character = {
  id: string,
  label: string
}

type Word = {
  id: string,
  label: string
}

type Frame = {
  index: number,
  timestamp: number | null,
  delta: number,
  alphabetIndex: number,
  train: {
    wordIndex: number,
    charIndex: number
  }
}

const initialSpeed = 300;

const alphabet: Character[] = [
  { id: 'space1', label: ' ' },
  { id: 'space2', label: ' ' },
  { id: 'a', label: 'a' },
  { id: 'b', label: 'b' },
  { id: 'c', label: 'c' },
  { id: 'd', label: 'd' },
  { id: 'e', label: 'e' },
  { id: 'f', label: 'f' },
  { id: 'g', label: 'g' },
  { id: 'h', label: 'h' },
  { id: 'i', label: 'i' },
  { id: 'j', label: 'j' },
  { id: 'k', label: 'k' },
  { id: 'l', label: 'l' },
  { id: 'm', label: 'm' },
  { id: 'n', label: 'n' },
  { id: 'o', label: 'o' },
  { id: 'p', label: 'p' },
  { id: 'q', label: 'q' },
  { id: 'r', label: 'r' },
  { id: 's', label: 's' },
  { id: 't', label: 't' },
  { id: 'u', label: 'u' },
  { id: 'v', label: 'v' },
  { id: 'w', label: 'w' },
  { id: 'x', label: 'x' },
  { id: 'y', label: 'y' },
  { id: 'z', label: 'z' }
];

const words: Word[] = [
  { id: 'hallo', label: 'hallo' },
  { id: 'geht', label: 'geht' },
  { id: 'es', label: 'es' },
  { id: 'dir', label: 'dir' },
];

const frame: Frame = {
  index: 0,
  timestamp: null,
  delta: initialSpeed,
  alphabetIndex: 0,
  train: {
    wordIndex: 0,
    charIndex: 0
  }
}

export default function TrainScreen ({ navigation }: RootTabScreenProps<'Train'>) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentFrame, setCurrentFrame] = useState<Frame>(_.cloneDeep(frame));
  const [speed, setSpeed] = useState<number>(initialSpeed);
  const [recording, setRecording] = useState<boolean>(false);
  const [trainUid, setTrainUid] = useState<string>(`training-${Date.now()}`);
  const camera = useRef<Camera>(null);

  var interval: ReturnType<typeof setTimeout> | null = null;

  function getCurrentTrainingWord (frame: Frame): Word | undefined {
    return words[frame.train.wordIndex];
  }

  function getCurrentTrainingChar (frame: Frame): Character | undefined {
    return alphabet.find((current) => current.label === words[frame.train.wordIndex].label[frame.train.charIndex]);
  }

  function getBackgroundColor (index: number, frame: Frame): string {
    let color = "white";

    if (index === frame.alphabetIndex) {
      color = "orange.400";

      const currentChar = alphabet[frame.alphabetIndex];

      if (currentChar.label === getCurrentTrainingChar(frame)?.label) {
        color = "green.500";
      }
    }

    return color;
  }

  function isCurrentTraningChar (index: number, frame: Frame): boolean {
    const currentChar = alphabet[index];

    if (currentChar.label === getCurrentTrainingChar(frame)?.label) {
      return true;
    }

    return false;
  }

  function getLogUri (trainUid: string) {
    return `${FileSystem.cacheDirectory}${trainUid}.txt`;
  }

  async function writeFrameLog (uri: string, frame: Frame) {
    let content = '';

    const alphabetChar = alphabet[frame.alphabetIndex];
    const trainWord = getCurrentTrainingWord(frame);
    const trainChar = getCurrentTrainingChar(frame);

    const entry = {
      index: frame.index,
      timestamp: frame.timestamp,
      delta: frame.delta,
      alphabet: {
        id: alphabetChar?.id,
        label: alphabetChar?.label,
        index: frame.alphabetIndex
      },
      train: {
        word: {
          id: trainWord?.id,
          label: trainWord?.label,
          index: frame.train.wordIndex
        },
        char: {
          id: trainChar?.id,
          label: trainChar?.label,
          index: frame.train.charIndex
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

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const audioPermission = await Audio.requestPermissionsAsync();
      setHasPermission(cameraPermission.status === 'granted' && audioPermission.status === 'granted');
    })();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  useEffect(() => {
    interval = setInterval(() => {
      setCurrentFrame((lastFrame) => {
        const newFrame = _.cloneDeep(lastFrame);

        newFrame.index += 1;
        newFrame.delta = speed;
        newFrame.timestamp = Date.now();

        if ((newFrame.alphabetIndex + 1) < alphabet.length) {
          newFrame.alphabetIndex += 1;
        } else {
          newFrame.alphabetIndex = 0;
        }

        const lastChar = alphabet[lastFrame.alphabetIndex];
        const currentTrainingChar = getCurrentTrainingChar(lastFrame);

        // jump to next char if we had a match 
        if (currentTrainingChar && lastChar && lastChar.label === currentTrainingChar.label) {
          newFrame.alphabetIndex = 0;
        }

        // increase train char and word
        if (newFrame.alphabetIndex === 0) {
          if ((newFrame.train.charIndex + 1) < words[newFrame.train.wordIndex].label.length) {
            newFrame.train.charIndex += 1;
          } else {
            newFrame.train.charIndex = 0;

            if ((newFrame.train.wordIndex + 1) < words.length) {
              newFrame.train.wordIndex += 1;
            } else {
              newFrame.train.wordIndex = 0;
            }
          }
        }

        return newFrame;
      });
    }, speed);

    return () => {
      if (interval) {
        clearInterval(interval);

        setCurrentFrame(_.cloneDeep({
          ...frame,
          timestamp: Date.now()
        }));
      }
    }
  }, [recording, speed]);

  useEffect(() => {
    if (recording) {
      writeFrameLog(getLogUri(trainUid), currentFrame);
    }
  }, [recording, currentFrame, trainUid]);

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View flex="1">
      <HStack space="1" justifyContent="center" py="5">
        <Text fontSize="xl">{getCurrentTrainingWord(currentFrame)?.label}</Text>
        <Text fontSize="xl">{`[${getCurrentTrainingChar(currentFrame)?.label}]`}</Text>
      </HStack>
      <Camera
        ref={camera}
        style={styles.camera}
        type={CameraType.front}>
        <Box display="flex" flexDirection="row" flexWrap="wrap" flexGrow="1">
          {alphabet.map((char, index) => {
            return (
              <Box
                key={`char-${char.id}`}
                w="25%"
                h={`${100 / 7}%`}
                display="flex"
                alignItems="center"
                borderWidth="1"
                borderColor="grey"
                backgroundColor={getBackgroundColor(index, currentFrame)}
                opacity="0.70">
                <HStack>
                  <Text fontSize="5xl" color={isCurrentTraningChar(index, currentFrame) ? 'red.400' : 'black'}>{char.label}</Text>
                </HStack>
              </Box>
            )
          })}
        </Box>
      </Camera>
      <VStack>
        <Button
          size="lg"
          rounded="none"
          onPress={() => record(recording)}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  }
});