import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Text, HStack, Box } from 'native-base';
import { Alphabet, Frame } from '../types/Alphabet';
import _ from 'lodash';

const frame: Frame = {
  index: 0,
  timestamp: null,
  delta: 300,
  alphabetIndex: 0
}

export default forwardRef<{
  pause: () => void,
  reset: () => void
}, {
  alphabet: Alphabet,
  speed: number,
  onFrame?: (frame: Frame) => void,
  beforeFrameChange?: (lastFrame: Frame | null, newFrame: Frame) => Frame,
  beforeBackgroundColorChange?: (index: number, frame: Frame, color: string) => string,
  beforeTextColorChange?: (index: number, frame: Frame, color: string) => string
}>(({
  alphabet,
  speed = 300,
  onFrame = (frame: Frame) => { },
  beforeFrameChange = (lastFrame: Frame, newFrame: Frame) => newFrame,
  beforeBackgroundColorChange = (index: number, frame: Frame, color: string) => color,
  beforeTextColorChange = (index: number, frame: Frame, color: string) => color
}, ref) => {
  const [shouldReset, setShouldReset] = useState<boolean>(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('white');
  const [currentFrame, setCurrentFrame] = useState<Frame>(_.cloneDeep({
    ...frame,
    speed
  }));

  var interval: ReturnType<typeof setTimeout> | null = null;

  useImperativeHandle(ref, () => ({
    pause: () => { pause() },
    reset: () => { reset() }
  }));

  function getBackgroundColor (index: number, frame: Frame): string {
    let color = "white";

    if (index === frame.alphabetIndex) {
      color = "orange.400";
    }

    return beforeBackgroundColorChange(index, frame, color);
  }

  function getTextColor (index: number, frame: Frame): string {
    return beforeTextColorChange(index, frame, 'black');
  }

  function pause () {
    console.log('pause...');
    setCurrentFrame((frame) => {
      frame.queuePause = true;
      return frame;
    });
  }

  function reset () {
    setCurrentFrame((frame) => {
      frame.queueReset = true;
      return frame;
    });
  }

  useEffect(() => {
    interval = setInterval(() => {
      setCurrentFrame((lastFrame) => {
        const newFrame = _.cloneDeep(lastFrame);

        newFrame.index += 1;
        newFrame.delta = speed;
        newFrame.timestamp = Date.now();

        if ((newFrame.alphabetIndex + 1) < alphabet.chars.length) {
          newFrame.alphabetIndex += 1;
        } else {
          newFrame.alphabetIndex = 0;
        }

        if (lastFrame.queuePause && lastFrame.queuePause === true) {
          newFrame.alphabetIndex = lastFrame.alphabetIndex;
        }

        if (lastFrame.queueReset && lastFrame.queueReset === true) {
          newFrame.queueReset = false;
          newFrame.queuePause = false;
          newFrame.alphabetIndex = 0;
        }

        return beforeFrameChange(lastFrame, newFrame);
      });
    }, speed);

    return () => {
      if (interval) {
        clearInterval(interval);

        setCurrentFrame(_.cloneDeep({
          ...frame,
          speed,
          timestamp: Date.now()
        }));
      }
    }
  }, [speed]);

  useEffect(() => {
    onFrame(_.cloneDeep(currentFrame));
  }, [currentFrame]);

  return (
    <Box display="flex" flexDirection="row" flexWrap="wrap" flexGrow="1">
      {alphabet.chars.map((char, index) => {
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
              <Text fontSize="5xl" color={getTextColor(index, currentFrame)}>{char.label}</Text>
            </HStack>
          </Box>
        )
      })}
    </Box>
  );
});