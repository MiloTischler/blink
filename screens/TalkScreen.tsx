import React, { useState, useEffect, useRef } from 'react';
import { Text, View, VStack, HStack, Box, Button } from 'native-base';
import { RootTabScreenProps } from '../types';
import { Camera, CameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { StyleSheet } from 'react-native';
import { Frame } from '../types/Alphabet';

// @todo try to use https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection/src/mediapipe ???
// @todo or maybe use https://github.com/nonth/react-native-face-detection

const initialSpeed = 300;

// const frame: Frame = {
//   index: 0,
//   timestamp: null,
//   delta: initialSpeed,
//   alphabetIndex: 0,
//   train: {
//     wordIndex: 0,
//     charIndex: 0
//   }
// }

export default function TalkScreen ({ navigation }: RootTabScreenProps<'Talk'>) {
  const handleFacesDetected = ({ faces }) => {
    if (faces.length) {
      const face = faces[0];

      if (face.rightEyeOpenProbability < 0.4) {
        console.log('-------------> right eye blinked!!!!', face.rightEyeOpenProbability);
      } else {
        console.log(face.rightEyeOpenProbability);
      }
    }
  };

  return (
    <View flex="1">
      {/* <Camera
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}>
      </Camera> */}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  }
});
