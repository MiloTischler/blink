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
import AlphabetLoop from '../components/AlphabetLoop';
import { default as AlphabetRepository } from '../repositories/Alphabet';
import { Alphabet, Word, Character, Frame } from '../types/Alphabet';
import * as FaceDetector from 'expo-face-detector';

export default function TrainScreen ({ navigation }: RootTabScreenProps<'Train'>) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentFrame, setCurrentFrame] = useState<Frame>();
  const [blinked, setBlinked] = useState<Number>(0);
  const [alphabet, setAlphabet] = useState<Alphabet>();
  const [recording, setRecording] = useState<boolean>(false);
  const [trainUid, setTrainUid] = useState<string>(`training-${Date.now()}`);
  const camera = useRef<Camera>(null);

  function getCurrentTrainingWord (frame: Frame): Word | undefined {
    return alphabet.training.words[frame.train.wordIndex];
  }

  function getCurrentTrainingChar (frame: Frame): Character | undefined {
    return alphabet.chars.find((current) => current.label === alphabet.training.words[frame.train.wordIndex].label[frame.train.charIndex]?.toLowerCase());
  }

  function isCurrentTraningChar (index: number, frame: Frame): boolean {
    const currentChar = alphabet.chars[index];

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

    setAlphabet(AlphabetRepository.load());
  }, []);

  // useEffect(() => {
  //   if (recording) {
  //     writeFrameLog(getLogUri(trainUid), currentFrame);
  //   }
  // }, [recording, currentFrame, trainUid]);

  function beforeBackgroundColorChange (index: number, frame: Frame, color: string): string {
    if (index === frame.alphabetIndex) {
      const currentChar = alphabet.chars[frame.alphabetIndex];

      if (currentChar.label === getCurrentTrainingChar(frame)?.label) {
        color = "green.500";
      }
    }

    return color;
  }

  function beforeTextColorChange (index: number, frame: Frame, color: string): string {
    return isCurrentTraningChar(index, frame) ? 'red.400' : color;
  }

  function beforeFrameChange (lastFrame: Frame, newFrame: Frame): Frame {
    const lastChar = alphabet.chars[lastFrame.alphabetIndex];
    const currentTrainingChar = getCurrentTrainingChar(lastFrame);

    // jump to next char if we had a match 
    if (currentTrainingChar && lastChar && lastChar.label === currentTrainingChar.label) {
      newFrame.alphabetIndex = 0;
    }

    // increase train char and word
    if (newFrame.alphabetIndex === 0) {
      if ((newFrame.train.charIndex + 1) < alphabet.training.words[newFrame.train.wordIndex].label.length) {
        newFrame.train.charIndex += 1;
      } else {
        newFrame.train.charIndex = 0;

        if ((newFrame.train.wordIndex + 1) < alphabet.training.words.length) {
          newFrame.train.wordIndex += 1;
        } else {
          newFrame.train.wordIndex = 0;
        }
      }
    }

    return newFrame;
  }

  function handleFacesDetected ({ faces }) {
    if (faces.length) {
      if (faces.length > 1) {
        console.warn('More than one faces visible....')
      }

      const face = faces[0];

      if (face.rightEyeOpenProbability < 0.4) {
        console.log('Right eye closed: We should select char', face.rightEyeOpenProbability);

        setCurrentFrame((lastFrame) => {
          const newFrame = _.cloneDeep(lastFrame);

          newFrame.blink.rightEyeClosed = true;

          return newFrame;
        });
      } else {
        console.log(face.rightEyeOpenProbability);

        setCurrentFrame((lastFrame) => {
          const newFrame = _.cloneDeep(lastFrame);

          if (lastFrame.blink.rightEyeClosed === true) {
            setBlinked(Date.now());
            console.log('Blinked: We should continue - "pause" until eye is opened again');
          }

          newFrame.blink.rightEyeClosed = false;

          return newFrame;
        });
      }
    }
  }

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return <View flex="1"><Text>No access to camera</Text></View>;
  }

  return (
    <View flex="1">
      {currentFrame && <HStack space="1" justifyContent="center" py="5">
        <Text fontSize="xl">{getCurrentTrainingWord(currentFrame)?.label}</Text>
        <Text fontSize="xl">{`[${getCurrentTrainingChar(currentFrame)?.label}]`}</Text>
      </HStack>}
      <Camera
        ref={camera}
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}
      >
        {alphabet && <AlphabetLoop
          alphabet={alphabet}
          speed={300}
          onFrame={(frame) => setCurrentFrame(frame)}
          beforeFrameChange={beforeFrameChange}
          beforeBackgroundColorChange={beforeBackgroundColorChange}
          beforeTextColorChange={beforeTextColorChange} />}
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