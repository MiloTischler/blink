import React, { useState, useEffect, forwardRef } from 'react';
import { View, Text } from 'native-base';
import { Camera as ExpoCamera, CameraType as ExpoCameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { StyleSheet } from 'react-native';
import { Audio } from 'expo-av';

type Frame = {
  rightEyeOpen: boolean,
  rightEyeState: string
}

export default forwardRef<ExpoCamera, {
  children: any,
  onBlinkRightStart?: () => void,
  onBlinkRightEnd?: () => void,
}>(({
  children,
  onBlinkRightStart = () => { },
  onBlinkRightEnd = () => { }
}, ref) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [frame, setFrame] = useState<Frame>({
    rightEyeOpen: true,
    rightEyeState: 'DEFAULT'
  });

  const handleFacesDetected = ({ faces }) => {
    if (faces.length) {
      const face = faces[0];

      if (faces.length > 1) {
        console.warn('More than one faces visible....')
      }

      if (face.leftEyeOpenProbability >= 0.75) {
        if (face.rightEyeOpenProbability < 0.75) {
          setFrame((oldFrame) => {
            return {
              rightEyeOpen: false,
              rightEyeState: ['DEFAULT'].includes(oldFrame.rightEyeState) ? 'BLINK_START' : 'BLINK_CONTINUE'
            }
          })
        } else {
          setFrame((oldFrame) => {
            return {
              rightEyeOpen: true,
              rightEyeState: ['BLINK_START', 'BLINK_CONTINUE'].includes(oldFrame.rightEyeState) ? 'BLINK_END' : 'DEFAULT'
            }
          })
        }
      }
    }
  };

  useEffect(() => {
    (async () => {
      const cameraPermission = await ExpoCamera.requestCameraPermissionsAsync();
      const audioPermission = await Audio.requestPermissionsAsync();
      setHasPermission(cameraPermission.status === 'granted' && audioPermission.status === 'granted');
    })();
  }, []);

  useEffect(() => {
    console.log(frame?.rightEyeState);

    if (frame && frame.rightEyeState === 'BLINK_START') {
      onBlinkRightStart();
    }

    if (frame && frame.rightEyeState === 'BLINK_END') {
      onBlinkRightEnd();
    }
  }, [frame]);

  if (hasPermission === null) {
    return <View />;
  }

  if (hasPermission === false) {
    return <View flex="1"><Text>No access to camera</Text></View>;
  }

  return (
    <View flex="1">
      <ExpoCamera
        ref={ref}
        style={styles.camera}
        type={ExpoCameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.fast,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}>
        {children}
      </ExpoCamera>
    </View>
  );
});

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  }
});
